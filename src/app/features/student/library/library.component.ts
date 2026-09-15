import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Book, BookIssue } from '../../../core/models';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './library.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly books = signal<Book[]>([]);
  readonly issues = signal<BookIssue[]>([]);
  readonly loading = signal(true);
  query = '';

  ngOnInit(): void {
    this.loadBooks();
    this.api.get<BookIssue[]>('/library/my').subscribe({
      next: (d) => this.issues.set(d),
      error: () => void 0,
    });
  }

  private loadBooks(q = ''): void {
    const path = q ? `/library/books?q=${encodeURIComponent(q)}` : '/library/books';
    this.api.get<Book[]>(path).subscribe({
      next: (d) => {
        this.books.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load the library catalog.');
      },
    });
  }

  search(): void {
    this.loading.set(true);
    this.loadBooks(this.query.trim());
  }

  isAvailable(book: Book): boolean {
    return book.available > 0;
  }
}