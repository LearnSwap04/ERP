import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Exam, ExamRosterStudent, Subject } from '../../../core/models';

@Component({
  selector: 'app-marks',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTabsModule,
    MatListModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './marks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarksComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  exams: Exam[] = [];
  subjects: Subject[] = [];
  loading = true;

  selectedExam: Exam | null = null;
  roster: ExamRosterStudent[] = [];
  rosterLoading = false;
  saving = false;

  readonly examForm = this.fb.group({
    subjectId: this.fb.nonNullable.control('', [Validators.required]),
    name: this.fb.nonNullable.control('', [Validators.required]),
    type: this.fb.nonNullable.control<'INTERNAL' | 'ENDSEM'>('INTERNAL', [Validators.required]),
    date: this.fb.nonNullable.control(new Date(), [Validators.required]),
    maxMarks: this.fb.nonNullable.control(30, [Validators.required, Validators.min(1)]),
  });

  ngOnInit(): void {
    this.loadExams();
    this.api.get<Subject[]>('/academics/subjects').subscribe({
      next: (d) => (this.subjects = d),
      error: () => void 0,
    });
  }

  private loadExams(): void {
    this.api.get<Exam[]>('/grades/exams').subscribe({
      next: (d) => {
        this.exams = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load exams.');
      },
    });
  }

  selectExam(exam: Exam): void {
    this.selectedExam = exam;
    this.rosterLoading = true;
    this.fetchRoster(exam.id);
  }

  private fetchRoster(examId: string): void {
    this.api.get<{ exam: Exam; students: ExamRosterStudent[] }>(`/grades/exams/${examId}/students`).subscribe({
      next: (d) => {
        this.roster = d.students;
        this.rosterLoading = false;
      },
      error: () => {
        this.rosterLoading = false;
        this.toast.error('Could not load the class roster.');
      },
    });
  }

  saveMarks(): void {
    if (!this.selectedExam) return;
    const entries = this.roster
      .map((s) => {
        const n = Number(s.obtained);
        return { studentId: s.studentId, obtained: Number.isFinite(n) ? n : null };
      })
      .filter((e): e is { studentId: string; obtained: number } => e.obtained != null);
    if (entries.length === 0) {
      this.toast.info('Enter marks for at least one student first.');
      return;
    }
    this.saving = true;
    this.api.post(`/grades/exams/${this.selectedExam.id}/marks`, { entries }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(`Saved marks for ${entries.length} students.`);
        this.fetchRoster(this.selectedExam!.id);
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  createExam(): void {
    if (this.examForm.invalid) return;
    const v = this.examForm.getRawValue();
    const subject = this.subjects.find((s) => s.id === v.subjectId);
    if (!subject) return;
    const date = v.date instanceof Date ? v.date.toISOString().slice(0, 10) : v.date;
    this.api
      .post('/grades/exams', {
        name: v.name,
        type: v.type,
        course: subject.branch,
        branch: subject.branch,
        semester: subject.semester,
        subjectId: v.subjectId,
        date,
        maxMarks: v.maxMarks,
      })
      .subscribe({
        next: () => {
          this.toast.success('Exam created.');
          this.examForm.reset({ subjectId: '', name: '', type: 'INTERNAL', date: new Date(), maxMarks: 30 });
          this.loadExams();
        },
        error: () => void 0,
      });
  }

  examCount(): number {
    return this.exams.length;
  }
}