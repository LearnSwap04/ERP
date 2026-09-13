import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

const RETRY_HEADER = 'X-Auth-Retried';

/** Attach the JWT; on a 401, refresh the token once and replay the request, else clear the session. */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const token = auth.accessToken();
  const isAuthCall = req.url.includes('/auth/');
  const alreadyRetried = req.headers.has(RETRY_HEADER);

  const authorizedReq = token && !req.headers.has('Authorization') ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorizedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthCall && !alreadyRetried) {
        return auth.refresh().pipe(
          switchMap(() => {
            const freshToken = auth.accessToken();
            const retry = req
              .clone({ setHeaders: { Authorization: `Bearer ${freshToken ?? ''}` } })
              .clone({ setHeaders: { [RETRY_HEADER]: 'true' } });
            return next(retry);
          }),
          catchError(() => {
            auth.clear();
            void router.navigate(['/login']);
            toast.error('Your session expired. Please sign in again.');
            return throwError(() => err);
          }),
        );
      }

      if (err.status === 403) {
        toast.error(err.error?.error ?? 'You do not have permission to do that.');
      } else if (err.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (err.status !== 401) {
        const message = err.error?.error ?? err.error?.issues?.[0]?.message ?? 'Something went wrong.';
        toast.error(message);
      }
      return throwError(() => err);
    }),
  );
};