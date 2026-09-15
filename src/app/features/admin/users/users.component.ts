import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { AuthUser } from '../../../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTooltipModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './users.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly users = signal<AuthUser[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  filterRole = signal<string>('');
  editingId = signal<string | null>(null);

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
    role: this.fb.nonNullable.control<'STUDENT' | 'FACULTY' | 'ADMIN'>('STUDENT', [Validators.required]),
    phone: this.fb.control<string>(''),
    // Student-specific
    rollNo: this.fb.control<string>(''),
    course: this.fb.control<string>(''),
    branch: this.fb.control<string>(''),
    semester: this.fb.control<number | null>(null),
    enrollmentYear: this.fb.control<number | null>(null),
    // Faculty-specific
    empId: this.fb.control<string>(''),
    department: this.fb.control<string>(''),
    designation: this.fb.control<string>(''),
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    const params: Record<string, string> = {};
    const r = this.filterRole();
    if (r) params['role'] = r;
    this.api.get<AuthUser[]>('/users', params).subscribe({
      next: (d) => {
        this.users.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load users.');
      },
    });
  }

  filter(role: string): void {
    this.filterRole.set(role);
    this.loading.set(true);
    this.loadUsers();
  }

  toggleActive(user: AuthUser): void {
    this.api.put(`/users/${user.id}`, { isActive: !user.isActive }).subscribe({
      next: () => {
        this.users.update((arr) =>
          arr.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)),
        );
        this.toast.success(`User ${user.isActive ? 'activated' : 'deactivated'}.`);
      },
      error: () => void 0,
    });
  }

  startEdit(user: AuthUser): void {
    this.editingId.set(user.id);
    this.form.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone ?? '',
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', email: '', password: '', role: 'STUDENT', phone: '' });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const id = this.editingId();

    if (id) {
      const payload: Record<string, unknown> = { name: v.name, phone: v.phone || undefined };
      if (v.password) payload['password'] = v.password;
      this.api.put(`/users/${id}`, payload).subscribe({
        next: () => {
          this.cancelEdit();
          this.toast.success('User updated.');
          this.loadUsers();
        },
        error: () => void 0,
      });
    } else {
      this.creating.set(true);
      this.api.post('/users', v).subscribe({
        next: () => {
          this.creating.set(false);
          this.form.reset({ name: '', email: '', password: '', role: 'STUDENT', phone: '' });
          this.toast.success('User created.');
          this.loadUsers();
        },
        error: () => {
          this.creating.set(false);
        },
      });
    }
  }

  roleLabel(role: string): string {
    return role === 'STUDENT' ? 'Student' : role === 'FACULTY' ? 'Faculty' : 'Admin';
  }

  roleTone(role: string): string {
    return role === 'ADMIN' ? 'warn' : role === 'FACULTY' ? 'accent' : 'primary';
  }
}
