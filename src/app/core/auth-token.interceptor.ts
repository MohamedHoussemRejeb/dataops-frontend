// src/app/core/auth-token.interceptor.ts
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

// ⛔ Mauvais (un seul ..)
// import { environment } from '../environments/environment';

// ✅ Bon chemin depuis src/app/core
import { environment } from '../../environments/environment';

export const authTokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {
  const keycloak = inject(KeycloakService);

  // Ne touche pas aux assets, index.html, etc.
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return from(keycloak.getToken()).pipe(
    mergeMap((token: string | undefined) => {
      if (!token) {
        // Pas loggué → on laisse passer (le backend renverra 401)
        return next(req);
      }

      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      return next(authReq);
    })
  );
};
