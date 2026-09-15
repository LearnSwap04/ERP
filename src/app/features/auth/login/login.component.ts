import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

type DemoRole = 'student' | 'faculty' | 'admin';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly form = this.fb.group({
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    password: this.fb.nonNullable.control('', [Validators.required]),
  });

  readonly loading = signal(false);
  hidePassword = true;

  readonly features = [
    { icon: 'calendar_month', label: 'Timetable & exam schedule at a glance' },
    { icon: 'campaign', label: 'Notices and announcements, categorized' },
    { icon: 'fact_check', label: 'Grades, attendance and syllabus tracking' },
  ];

  onSubmit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.auth
      .login(email, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Welcome back!');
          void this.router.navigate([this.auth.homeForRole(this.auth.role())]);
        },
        error: () => void 0, // the interceptor already toasted the error
      });
  }

  /** Quick-fill a seeded demo account for the given role (dev convenience). */
  fillDemo(role: DemoRole): void {
    const email = role === 'admin' ? 'admin@erp.test' : `${role}1@erp.test`;
    this.form.patchValue({ email, password: 'demo123' });
  }
}