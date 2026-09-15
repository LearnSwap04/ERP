import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { AttendanceStatus as Status, Subject } from '../../../core/models';

export interface RollStudent {
  studentId: string;
  rollNo: string;
  name: string;
  email: string;
  status: Status | 'UNMARKED';
}

export interface RollCall {
  subject: Subject;
  date: string;
  students: RollStudent[];
}

const STATUSES: Array<Status | 'UNMARKED'> = ['PRESENT', 'ABSENT', 'LEAVE', 'UNMARKED'];

@Component({
  selector: 'app-roll-call',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './roll-call.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollCallComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly subjects = signal<Subject[]>([]);
  selectedSubjectId: string | null = null;
  date = new Date();
  readonly roster = signal<RollCall | null>(null);
  readonly loadingRoster = signal(false);
  readonly saving = signal(false);
  state = signal<'idle' | 'loaded'>('idle');

  readonly statuses = STATUSES;

  ngOnInit(): void {
    this.api.get<Subject[]>('/attendance/classes').subscribe({
      next: (d) => this.subjects.set(d),
      error: () => this.toast.error('Could not load your classes.'),
    });
    this.loadRoster();
  }

  toISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  loadRoster(): void {
    if (!this.selectedSubjectId) {
      this.roster.set(null);
      this.state.set('idle');
      return;
    }
    this.loadingRoster.set(true);
    this.state.set('loaded');
    const date = this.toISO(this.date);
    this.api.get<RollCall>(`/attendance/roll?subjectId=${this.selectedSubjectId}&date=${date}`).subscribe({
      next: (d) => {
        this.roster.set(d);
        this.loadingRoster.set(false);
      },
      error: () => {
        this.loadingRoster.set(false);
        this.toast.error('Could not load the roll-call.');
      },
    });
  }

  setAll(status: Status): void {
    if (!this.roster()) return;
    this.roster.update((r) => (r ? { ...r, students: r.students.map((s) => ({ ...s, status })) } : r));
  }

  save(): void {
    if (!this.roster() || !this.selectedSubjectId) return;
    this.saving.set(true);
    const records = this.roster()!.students
      .filter((s) => s.status !== 'UNMARKED')
      .map((s) => ({ studentId: s.studentId, status: s.status as Status }));
    this.api.post('/attendance/mark', { subjectId: this.selectedSubjectId, date: this.toISO(this.date), records }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(`Recorded attendance for ${records.length} students.`);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  markedCount(): number {
    return this.roster()?.students.filter((s) => s.status !== 'UNMARKED').length ?? 0;
  }
}