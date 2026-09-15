import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Assignment, Submission } from '../../../core/models';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    MatChipsModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './assignments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly assignments = signal<Assignment[]>([]);
  readonly loading = signal(true);
  readonly submittingId = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<Assignment[]>('/assignments').subscribe({
      next: (d) => {
        this.assignments.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load assignments.');
      },
    });
  }

  statusLabel(a: Assignment): 'Submitted' | 'Pending' {
    return this.mySubmission(a) ? 'Submitted' : 'Pending';
  }

  mySubmission(a: Assignment): Submission | undefined {
    const me = this.auth.user();
    return a.submissions.find((s) => s.studentId === me?.id);
  }

  onFileSelected(a: Assignment, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    this.submittingId.set(a.id);
    this.api.postForm(`/assignments/${a.id}/submit`, form).subscribe({
      next: () => {
        this.submittingId.set(null);
        this.toast.success('Assignment submitted.');
        this.ngOnInit();
      },
      error: () => {
        this.submittingId.set(null);
      },
    });
    input.value = '';
  }
}