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
  withFetch,
  withInterceptors,
} from '@angular/common/http';

// ✅ Interceptor fonctionnel Keycloak
import { authTokenInterceptor } from './core/auth-token.interceptor';

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

    // --- HTTP + interceptor Bearer ---
    provideHttpClient(
      withFetch(),
      withInterceptors([authTokenInterceptor])
    ),

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
