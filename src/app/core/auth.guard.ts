// src/app/core/auth.guard.ts
import { inject } from '@angular/core';
import {
  CanActivateChildFn,
  CanMatchFn,
  Route,
  UrlSegment,
  Router,
  UrlTree
} from '@angular/router';
import { AuthService, Role } from './auth.service';

/**
 * 🔒 AuthGuard : protège toutes les routes enfants du layout
 */
export const authGuard: CanActivateChildFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLogged) {
    return true;
  }

  const returnUrl = state.url || '/runs';
  // ✅ On renvoie un UrlTree, pas un navigate() + false
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl }
  });
};

/**
 * 🔒 roleMatchGuard : vérifie les rôles demandés dans route.data.roles
 */
export const roleMatchGuard: CanMatchFn = (
  route: Route,
  segments: UrlSegment[]
): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // URL qu'on essaie d'ouvrir (ex: /settings, /alerts, ...)
  const url = '/' + segments.map(s => s.path).join('/') || '/runs';

  // 1) Pas loggé -> redirect vers login avec returnUrl
  if (!auth.isLogged) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: url }
    });
  }

  // 2) Vérifier les rôles nécessaires
  const required = (route.data?.['roles'] as Role[]) || [];
  if (!required.length) {
    return true;
  }

  const hasRole = required.includes(auth.role);

  if (!hasRole) {
    // ✅ On renvoie vers 403 plutôt que navigate()
    return router.createUrlTree(['/403']);
  }

  return true;
};
