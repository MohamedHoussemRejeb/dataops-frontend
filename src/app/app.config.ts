// src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import {
  provideRouter,
  withEnabledBlockingInitialNavigation,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { DropdownModule, SidebarModule } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { routes } from './app.routes';

import { provideNativeDateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';

// ✅ HTTP
import {
  provideHttpClient,
  withInterceptorsFromDi,
  withFetch,
  withInterceptors,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';

// ✅ Interceptors
import { AuthInterceptor } from './core/auth.interceptor';           // class-based
import { authTokenInterceptor } from './core/auth-token.interceptor'; // functional

// ✅ Keycloak
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { initializeKeycloak } from './keycloak-init';

export const appConfig: ApplicationConfig = {
  providers: [
    // --- Router ---
    provideRouter(
      routes,
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      withEnabledBlockingInitialNavigation(),
      withViewTransitions()
    ),

    // --- CoreUI modules ---
    importProvidersFrom(SidebarModule, DropdownModule),
    IconSetService,

    // --- Animations ---
    provideAnimationsAsync(),

    // --- Material date adapter & locale ---
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },

    // --- HTTP: client + Fetch + interceptors ---
    provideHttpClient(
      // ✅ Functional interceptor: ajoute le Bearer token
      withInterceptors([authTokenInterceptor]),

      // ✅ Pour continuer à utiliser les interceptors DI (AuthInterceptor)
      withInterceptorsFromDi(),

      withFetch()
    ),

    // 🔐 Intercepteur class-based (par ex. pour 401 / redirection)
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },

    // --- Keycloak integration ---
    importProvidersFrom(KeycloakAngularModule),
    KeycloakService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [KeycloakService],
    },
  ],
};
