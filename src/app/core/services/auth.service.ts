import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { AuthResponse, AuthUser, Role } from '../models';

/** Central auth state (signal-based) + token persistence. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly TOKEN_KEY = 'erp.access';
  private readonly REFRESH_KEY = 'erp.refresh';
  private readonly USER_KEY = 'erp.user';

  private userSignal = signal<AuthUser | null>(this.loadUser());
  private readonly _userChanged = new Subject<AuthUser | null>();

  /** Emits whenever the signed-in user changes (+login/logout). */
  readonly userChanged$ = this._userChanged.asObservable();

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly role = computed<Role | null>(() => this.userSignal()?.role ?? null);

  /** Default landing route for a role (kept in one place for redirects). */
  static readonly HOME: Record<Role, string> = {
    STUDENT: '/app/student/dashboard',
    FACULTY: '/app/faculty/dashboard',
    ADMIN: '/app/admin/dashboard',
  };

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((r) => this.persist(r)));
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap((r) => this.persist(r)));
  }

  logout(): void {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (refreshToken) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, { refreshToken })
        .pipe(catchError(() => throwError(() => new Error('logout'))))
        .subscribe({ error: () => void 0 });
    }
    this.clear();
  }

  clear(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.userSignal.set(null);
    this._userChanged.next(null);
  }

  accessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  homeForRole(role: Role | null): string {
    return role ? AuthService.HOME[role] : '/login';
  }

  private persist(r: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, r.accessToken);
    localStorage.setItem(this.REFRESH_KEY, r.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(r.user));
    this.userSignal.set(r.user);
    this._userChanged.next(r.user);
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }
}