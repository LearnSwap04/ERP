import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Assignment, Subject, Submission } from '../../../core/models';

@Component({
  selector: 'app-post-assignment',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatChipsModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './post-assignment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostAssignmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  subjects: Subject[] = [];
  assignments: Assignment[] = [];
  loading = true;
  creating = false;

  selectedFile: File | null = null;

  readonly form = this.fb.group({
    subjectId: this.fb.nonNullable.control('', [Validators.required]),
    title: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.control<string>(''),
    dueDate: this.fb.nonNullable.control(new Date(), [Validators.required]),
  });

  gradingId = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<Subject[]>('/academics/subjects').subscribe({
      next: (d) => (this.subjects = d),
      error: () => void 0,
    });
    this.api.get<Assignment[]>('/assignments').subscribe({
      next: (d) => {
        this.assignments = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load assignments.');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  create(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const form = new FormData();
    form.append('subjectId', v.subjectId);
    form.append('title', v.title);
    if (v.description) form.append('description', v.description);
    form.append('dueDate', (v.dueDate instanceof Date ? v.dueDate.toISOString().slice(0, 10) : v.dueDate));
    if (this.selectedFile) form.append('file', this.selectedFile);

    this.creating = true;
    this.api.postForm('/assignments', form).subscribe({
      next: () => {
        this.creating = false;
        this.selectedFile = null;
        this.form.reset({ subjectId: '', title: '', description: '', dueDate: new Date() });
        this.toast.success('Assignment posted.');
        this.ngOnInit();
      },
      error: () => {
        this.creating = false;
      },
    });
  }

  grade(submission: Submission, gradeValue: string, feedbackValue: string): void {
    const grade = Number(gradeValue);
    if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
      this.toast.error('Grade must be a number between 0 and 100.');
      return;
    }
    this.gradingId.set(submission.id);
    this.api
      .post(`/assignments/submissions/${submission.id}/grade`, {
        grade,
        feedback: feedbackValue || undefined,
      })
      .subscribe({
        next: () => {
          this.gradingId.set(null);
          this.toast.success('Submission graded.');
          this.ngOnInit();
        },
        error: () => this.gradingId.set(null),
      });
  }

  pendingCount(a: Assignment): number {
    return a.submissions.filter((s) => s.grade == null).length;
  }
}