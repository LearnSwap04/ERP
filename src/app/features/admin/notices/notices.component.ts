import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Notice } from '../../../core/models';

@Component({
  selector: 'app-admin-notices',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './notices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly notices = signal<Notice[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  editingId = signal<string | null>(null);

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required]),
    body: this.fb.nonNullable.control('', [Validators.required]),
    category: this.fb.nonNullable.control<'GENERAL' | 'EXAM' | 'EVENT' | 'HOLIDAY'>('GENERAL', [Validators.required]),
  });

  ngOnInit(): void {
    this.loadNotices();
  }

  private loadNotices(): void {
    this.api.get<Notice[]>('/notices').subscribe({
      next: (d) => {
        this.notices.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load notices.');
      },
    });
  }

  startEdit(notice: Notice): void {
    this.editingId.set(notice.id);
    this.form.patchValue({ title: notice.title, body: notice.body, category: notice.category });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ title: '', body: '', category: 'GENERAL' });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const id = this.editingId();

    if (id) {
      this.api.put(`/notices/${id}`, v).subscribe({
        next: () => {
          this.cancelEdit();
          this.toast.success('Notice updated.');
          this.loadNotices();
        },
        error: () => void 0,
      });
    } else {
      this.creating.set(true);
      this.api.post('/notices', v).subscribe({
        next: () => {
          this.creating.set(false);
          this.form.reset({ title: '', body: '', category: 'GENERAL' });
          this.toast.success('Notice posted.');
          this.loadNotices();
        },
        error: () => {
          this.creating.set(false);
        },
      });
    }
  }

  deleteNotice(notice: Notice): void {
    if (!confirm(`Delete "${notice.title}"?`)) return;
    this.api.delete(`/notices/${notice.id}`).subscribe({
      next: () => {
        this.toast.success('Notice deleted.');
        this.loadNotices();
      },
      error: () => void 0,
    });
  }

  categoryColor(cat: string): string {
    switch (cat) {
      case 'EXAM': return 'text-red-600 bg-red-50';
      case 'EVENT': return 'text-blue-600 bg-blue-50';
      case 'HOLIDAY': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
}
