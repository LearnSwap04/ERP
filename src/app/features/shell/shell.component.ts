import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import type { Role } from '../../core/models';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  // Shared routes land on the role dispatcher; role-scoped lists follow.
  { label: 'Dashboard', icon: 'dashboard', link: '/app/dashboard', roles: ['STUDENT', 'FACULTY', 'ADMIN'] },
  { label: 'Attendance', icon: 'fact_check', link: '/app/student/attendance', roles: ['STUDENT'] },
  { label: 'Grades', icon: 'grade', link: '/app/student/grades', roles: ['STUDENT'] },
  { label: 'Assignments', icon: 'assignment', link: '/app/student/assignments', roles: ['STUDENT'] },
  { label: 'Fees', icon: 'payments', link: '/app/student/fees', roles: ['STUDENT'] },
  { label: 'Notices', icon: 'campaign', link: '/app/student/notices', roles: ['STUDENT'] },
  { label: 'Library', icon: 'menu_book', link: '/app/student/library', roles: ['STUDENT'] },
  { label: 'Documents', icon: 'description', link: '/app/student/documents', roles: ['STUDENT'] },
  { label: 'Academics', icon: 'calendar_month', link: '/app/student/academics', roles: ['STUDENT'] },
  { label: 'Queries', icon: 'support_agent', link: '/app/student/communication', roles: ['STUDENT'] },

  { label: 'Mark Attendance', icon: 'fact_check', link: '/app/faculty/attendance', roles: ['FACULTY'] },
  { label: 'Enter Marks', icon: 'edit_note', link: '/app/faculty/marks', roles: ['FACULTY'] },
  { label: 'Assignments', icon: 'assignment', link: '/app/faculty/assignments', roles: ['FACULTY'] },

  { label: 'Users', icon: 'group', link: '/app/admin/users', roles: ['ADMIN'] },
  { label: 'Notices', icon: 'campaign', link: '/app/admin/notices', roles: ['ADMIN'] },
  { label: 'Fee Structure', icon: 'payments', link: '/app/admin/fees', roles: ['ADMIN'] },
  { label: 'Library', icon: 'menu_book', link: '/app/admin/library', roles: ['ADMIN'] },
  { label: 'Documents', icon: 'description', link: '/app/admin/documents', roles: ['ADMIN'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly role = this.auth.role;
  readonly userName = computed(() => this.user()?.name ?? '');

  readonly navItems = computed(() => {
    const role = this.role();
    return role ? NAV.filter((item) => item.roles.includes(role)) : [];
  });

  readonly opened = signal(true);

  onLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  home(): void {
    void this.router.navigate([this.auth.homeForRole(this.role())]);
  }
}