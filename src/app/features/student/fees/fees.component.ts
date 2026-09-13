import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { FeeLedgerRow } from '../../../core/models';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './fees.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  ledger: FeeLedgerRow[] = [];
  loading = true;
  payingId: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.api.get<FeeLedgerRow[]>('/fees/my').subscribe({
      next: (d) => {
        this.ledger = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load your fee ledger.');
      },
    });
  }

  pay(row: FeeLedgerRow): void {
    this.payingId = row.item.id;
    this.api.post('/fees/pay', { itemId: row.item.id }).subscribe({
      next: () => {
        this.payingId = null;
        this.toast.success('Payment recorded.');
        this.load();
      },
      error: () => {
        this.payingId = null;
      },
    });
  }

  downloadReceipt(paymentId: string): void {
    this.api.getBlob(`/fees/payments/${paymentId}/receipt`).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${paymentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => void 0,
    });
  }

  totalDue(): number {
    return this.ledger.filter((r) => r.status !== 'PAID').reduce((s, r) => s + r.item.amount, 0);
  }
}