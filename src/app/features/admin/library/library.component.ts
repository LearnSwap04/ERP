import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { Book, BookIssue } from '../../../core/models';

@Component({
  selector: 'app-admin-library',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './library.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  books: Book[] = [];
  issues: BookIssue[] = [];
  loading = true;
  creating = false;

  issueBookId = signal<string | null>(null);
  issueStudent = signal<string>('');

  readonly bookForm = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required]),
    author: this.fb.nonNullable.control('', [Validators.required]),
    isbn: this.fb.control<string>(''),
    totalCopies: this.fb.nonNullable.control<number>(1, [Validators.required, Validators.min(1)]),
  });

  ngOnInit(): void {
    this.loadBooks();
  }

  private loadBooks(): void {
    this.api.get<Book[]>('/library/books').subscribe({
      next: (d) => {
        this.books = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load the catalogue.');
      },
    });
    this.api.get<BookIssue[]>('/library/issues').subscribe({
      next: (d) => (this.issues = d),
      error: () => void 0,
    });
  }

  createBook(): void {
    if (this.bookForm.invalid) return;
    const v = this.bookForm.getRawValue();
    this.creating = true;
    this.api
      .post('/library/books', {
        title: v.title,
        author: v.author,
        isbn: v.isbn || undefined,
        totalCopies: v.totalCopies,
      })
      .subscribe({
        next: () => {
          this.creating = false;
          this.bookForm.reset({ title: '', author: '', isbn: '', totalCopies: 1 });
          this.toast.success('Book added to catalogue.');
          this.loadBooks();
        },
        error: () => {
          this.creating = false;
        },
      });
  }

  issueTo(bookId: string): void {
    const studentId = this.issueStudent().trim();
    if (!studentId) {
      this.toast.error('Enter a student ID to issue to.');
      return;
    }
    this.issueBookId.set(bookId);
    this.api.post(`/library/books/${bookId}/issue`, { studentId }).subscribe({
      next: () => {
        this.issueBookId.set(null);
        this.issueStudent.set('');
        this.toast.success('Book issued.');
        this.loadBooks();
      },
      error: () => this.issueBookId.set(null),
    });
  }

  returnBook(issue: BookIssue): void {
    this.api.post(`/library/issues/${issue.id}/return`, {}).subscribe({
      next: () => {
        this.toast.success('Book returned.');
        this.loadBooks();
      },
      error: () => void 0,
    });
  }

  copiesLeft(book: Book): number {
    return book.available;
  }
}