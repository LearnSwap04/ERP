import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { DocumentRequest } from '../../../core/models';

@Component({
  selector: 'app-admin-documents',
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatButtonModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './documents.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly requests = signal<DocumentRequest[]>([]);
  readonly loading = signal(true);
  actingId = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<DocumentRequest[]>('/documents/requests').subscribe({
      next: (d) => {
        this.requests.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load document requests.');
      },
    });
  }

  act(id: string, action: 'approve' | 'reject'): void {
    this.actingId.set(id);
    this.api.post(`/documents/requests/${id}/${action}`, {}).subscribe({
      next: () => {
        this.actingId.set(null);
        this.toast.success(action === 'approve' ? 'Request approved.' : 'Request rejected.');
        this.ngOnInit();
      },
      error: () => this.actingId.set(null),
    });
  }

  private filter(status: string): DocumentRequest[] {
    return this.requests().filter((r) => r.status === status);
  }

  pending(): DocumentRequest[] {
    return this.filter('PENDING');
  }

  decided(): DocumentRequest[] {
    return this.filter('APPROVED');
  }

  statusColor(status: string): string {
    switch (status) {
      case 'APPROVED': return '!text-emerald-600';
      case 'REJECTED': return '!text-red-600';
      default: return '!text-amber-600';
    }
  }
}