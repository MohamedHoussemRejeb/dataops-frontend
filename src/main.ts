/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { SettingsService } from './app/core/settings.service'; // 👈 import

// Locale FR pour pipes et datepicker
registerLocaleData(localeFr);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    provideAnimations(),                        // indispensable pour MatDatepicker
    provideNativeDateAdapter(),                 // adapter Date natif Material
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' } // format FR globalement
  ]
})
.then(appRef => {
  // 👇 Appliquer dark-mode + couleurs de statut dès le boot
  const settings = appRef.injector.get(SettingsService);
  settings.applyToDom();
})
.catch(err => console.error(err));
