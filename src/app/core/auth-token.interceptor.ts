// src/app/core/auth-token.interceptor.ts

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {

  const keycloak = inject(KeycloakService);

  // Ne touche que les URLs backend
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return from(keycloak.getToken()).pipe(
    mergeMap((token: string) => {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(cloned);
    })
  );
};
