import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { FeeItem, Payment } from '../../../core/models';

@Component({
  selector: 'app-admin-fees',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTabsModule,
    MatDatepickerModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './fees.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  items: FeeItem[] = [];
  payments: Payment[] = [];
  loading = true;
  creating = false;

  readonly itemForm = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required]),
    course: this.fb.nonNullable.control('B.Tech', [Validators.required]),
    branch: this.fb.control<string>(''),
    semester: this.fb.nonNullable.control<number>(1, [Validators.required, Validators.min(1)]),
    amount: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(1)]),
    dueDate: this.fb.nonNullable.control(new Date(), [Validators.required]),
  });

  ngOnInit(): void {
    this.api.get<FeeItem[]>('/fees/structure').subscribe({
      next: (d) => {
        this.items = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load fee structure.');
      },
    });
    this.api.get<Payment[]>('/fees/payments').subscribe({
      next: (d) => (this.payments = d),
      error: () => void 0,
    });
  }

  createItem(): void {
    if (this.itemForm.invalid) return;
    const v = this.itemForm.getRawValue();
    const dueDate = v.dueDate instanceof Date ? v.dueDate.toISOString().slice(0, 10) : v.dueDate;
    this.creating = true;
    this.api
      .post('/fees/structure', {
        title: v.title,
        course: v.course,
        branch: v.branch || undefined,
        semester: v.semester,
        amount: v.amount,
        dueDate,
      })
      .subscribe({
        next: () => {
          this.creating = false;
          this.itemForm.reset({
            title: '',
            course: 'B.Tech',
            branch: '',
            semester: 1,
            amount: 0,
            dueDate: new Date(),
          });
          this.toast.success('Fee item created.');
          this.ngOnInit();
        },
        error: () => {
          this.creating = false;
        },
      });
  }
}