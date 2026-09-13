import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/role.guard';

/**
 * Route tree:
 *   /login, /forgot-password  -> public
 *   /app                       -> authed shell (toolbar + sidenav)
 *     student/*  FACULTY|ADMIN blocked, redirected home
 *     faculty/*  only FACULTY
 *     admin/*    only ADMIN
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'app',
    loadComponent: () => import('./features/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      // ── Student ────────────────────────────────────────────────
      {
        path: 'student',
        canActivate: [roleGuard(['STUDENT'])],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/student/dashboard/dashboard.component').then((m) => m.StudentDashboardComponent),
          },
          {
            path: 'attendance',
            loadComponent: () => import('./features/student/attendance/attendance.component').then((m) => m.AttendanceComponent),
          },
          {
            path: 'grades',
            loadComponent: () => import('./features/student/grades/grades.component').then((m) => m.GradesComponent),
          },
          {
            path: 'assignments',
            loadComponent: () => import('./features/student/assignments/assignments.component').then((m) => m.AssignmentsComponent),
          },
          {
            path: 'fees',
            loadComponent: () => import('./features/student/fees/fees.component').then((m) => m.FeesComponent),
          },
          {
            path: 'notices',
            loadComponent: () => import('./features/student/notices/notices.component').then((m) => m.NoticesComponent),
          },
          {
            path: 'library',
            loadComponent: () => import('./features/student/library/library.component').then((m) => m.LibraryComponent),
          },
          {
            path: 'documents',
            loadComponent: () => import('./features/student/documents/documents.component').then((m) => m.DocumentsComponent),
          },
          {
            path: 'academics',
            loadComponent: () => import('./features/student/academics/academics.component').then((m) => m.AcademicsComponent),
          },
          {
            path: 'communication',
            loadComponent: () =>
              import('./features/student/communication/communication.component').then((m) => m.CommunicationComponent),
          },
        ],
      },

      // ── Faculty ────────────────────────────────────────────────
      {
        path: 'faculty',
        canActivate: [roleGuard(['FACULTY'])],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/faculty/dashboard/dashboard.component').then((m) => m.FacultyDashboardComponent),
          },
          {
            path: 'attendance',
            loadComponent: () => import('./features/faculty/attendance/roll-call.component').then((m) => m.RollCallComponent),
          },
          {
            path: 'marks',
            loadComponent: () => import('./features/faculty/marks/marks.component').then((m) => m.MarksComponent),
          },
          {
            path: 'assignments',
            loadComponent: () =>
              import('./features/faculty/assignments/post-assignment.component').then((m) => m.PostAssignmentComponent),
          },
        ],
      },

      // ── Admin ──────────────────────────────────────────────────
      {
        path: 'admin',
        canActivate: [roleGuard(['ADMIN'])],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/admin/dashboard/dashboard.component').then((m) => m.AdminDashboardComponent),
          },
          {
            path: 'users',
            loadComponent: () => import('./features/admin/users/users.component').then((m) => m.UsersComponent),
          },
          {
            path: 'notices',
            loadComponent: () => import('./features/admin/notices/notices.component').then((m) => m.NoticesComponent),
          },
          {
            path: 'fees',
            loadComponent: () => import('./features/admin/fees/fees.component').then((m) => m.FeesComponent),
          },
          {
            path: 'library',
            loadComponent: () => import('./features/admin/library/library.component').then((m) => m.LibraryComponent),
          },
          {
            path: 'documents',
            loadComponent: () => import('./features/admin/documents/documents.component').then((m) => m.DocumentsComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];