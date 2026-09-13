import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { DocumentRequest } from '../../../core/models';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './documents.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  requests: DocumentRequest[] = [];
  loading = true;
  submitting = false;

  readonly form = this.fb.group({
    type: this.fb.nonNullable.control<'BONAFIDE' | 'TRANSCRIPT'>('BONAFIDE', [Validators.required]),
    note: this.fb.control<string>(''),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.api.get<DocumentRequest[]>('/documents/my').subscribe({
      next: (d) => {
        this.requests = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load your document requests.');
      },
    });
  }

  submitRequest(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.api
      .post('/documents/requests', { type: this.form.getRawValue().type, note: this.form.getRawValue().note || undefined })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.toast.success('Request submitted. It will be processed by the administration.');
          this.form.reset({ type: 'BONAFIDE', note: '' });
          this.load();
        },
        error: () => {
          this.submitting = false;
        },
      });
  }

  downloadFile(url: string): void {
    window.open(url, '_blank');
  }

  role(): string {
    return this.auth.role() ?? '';
  }
}