import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export const authTokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {
  const keycloak = inject(KeycloakService);

  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return from(keycloak.getToken()).pipe(
    mergeMap((token: string | undefined) => {
      if (!token) {
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
