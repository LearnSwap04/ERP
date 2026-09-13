import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Ticket } from '../../../core/models';

@Component({
  selector: 'app-communication',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule,
    MatDividerModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './communication.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunicationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  tickets: Ticket[] = [];
  loading = true;
  submittingTicket = false;
  replyTicketId: string | null = null;

  readonly ticketForm = this.fb.group({
    subject: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control('', [Validators.required]),
  });

  readonly replyForm = this.fb.group({
    body: this.fb.nonNullable.control('', [Validators.required]),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.api.get<Ticket[]>('/communication/tickets').subscribe({
      next: (d) => {
        this.tickets = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load your queries.');
      },
    });
  }

  createTicket(): void {
    if (this.ticketForm.invalid) return;
    this.submittingTicket = true;
    this.api.post('/communication/tickets', this.ticketForm.getRawValue()).subscribe({
      next: () => {
        this.submittingTicket = false;
        this.ticketForm.reset();
        this.toast.success('Query submitted.');
        this.load();
      },
      error: () => {
        this.submittingTicket = false;
      },
    });
  }

  reply(t: Ticket): void {
    if (this.replyForm.invalid) return;
    const body = this.replyForm.getRawValue().body;
    this.api.post(`/communication/tickets/${t.id}/messages`, { body }).subscribe({
      next: () => {
        this.replyForm.reset();
        this.toast.success('Reply posted.');
        this.load();
      },
      error: () => void 0,
    });
  }

  isMine(t: Ticket): boolean {
    return t.student?.user.id === this.auth.user()?.id;
  }
}