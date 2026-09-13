import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Tiny dispatcher mounted at /app/dashboard. Picks the real, role-specific
 * dashboard route so the shell always has a sensible landing target.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    void this.router.navigate([this.auth.homeForRole(this.auth.role())], { replaceUrl: true });
  }
}