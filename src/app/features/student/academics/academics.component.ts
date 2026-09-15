import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Exam, Subject, SyllabusTopic, TimetableSlot } from '../../../core/models';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface SubjectDetail extends Subject {
  timetable?: TimetableSlot[];
  syllabus?: SyllabusTopic[];
}

@Component({
  selector: 'app-academics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatExpansionModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './academics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly slots = signal<TimetableSlot[]>([]);
  readonly subjects = signal<SubjectDetail[]>([]);
  readonly exams = signal<Exam[]>([]);
  readonly loading = signal(true);

  readonly dayNames = DAY_NAMES;
  readonly days = [0, 1, 2, 3, 4, 5, 6];

  ngOnInit(): void {
    this.loadExams();
    this.api.get<TimetableSlot[]>('/academics/timetable').subscribe({
      next: (d) => this.slots.set(d),
      error: () => this.toast.error('Could not load timetable.'),
    });
    this.api.get<SubjectDetail[]>('/academics/subjects').subscribe({
      next: async (d) => {
        const details = await Promise.all(
          d.map((s) => firstValueFrom(this.api.get<SubjectDetail>(`/academics/subjects/${s.id}`))),
        );
        this.subjects.set(details);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load subjects.');
      },
    });
  }

  slotsFor(day: number): TimetableSlot[] {
    return this.slots().filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  private loadExams(): void {
    this.api.get<Exam[]>('/grades/exams').subscribe({
      next: (d) => this.exams.set(d),
      error: () => this.toast.error('Could not load the exam schedule.'),
    });
  }

  isUpcoming(exam: Exam): boolean {
    return new Date(exam.date).getTime() >= Date.now();
  }
}