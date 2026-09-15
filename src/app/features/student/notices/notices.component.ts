import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Notice } from '../../../core/models';

@Component({
  selector: 'app-notices',
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    MatButtonModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './notices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly categories: Array<'ALL' | Notice['category']> = ['ALL', 'EXAM', 'EVENT', 'HOLIDAY', 'GENERAL'];
  activeCategory: 'ALL' | Notice['category'] = 'ALL';

  readonly notices = signal<Notice[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  filterBy(category: 'ALL' | Notice['category']): void {
    if (category === this.activeCategory) return;
    this.activeCategory = category;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const query = this.activeCategory === 'ALL' ? '' : `?category=${this.activeCategory}`;
    this.api.get<Notice[]>(`/notices${query}`).subscribe({
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

  iconFor(category: Notice['category']): string {
    switch (category) {
      case 'EXAM':
        return 'fact_check';
      case 'EVENT':
        return 'celebration';
      case 'HOLIDAY':
        return 'beach_access';
      default:
        return 'campaign';
    }
  }

  noticePostedBy(notice: Notice): string {
    return `by ${notice.postedBy?.name ?? 'Administration'}`;
  }
}