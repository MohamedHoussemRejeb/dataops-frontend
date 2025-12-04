// src/app/app.component.ts
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { delay, filter, map, tap } from 'rxjs/operators';

import { GlobalSearchComponent } from './features/search/global-search/global-search.component';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { ColorModeService } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { iconSubset } from './icons/icon-subset';

// 🔥 temps réel
import { RealtimeEventsService } from './core/realtime-events.service';
import { NotificationService } from './core/notification.service';   // ⬅️ ajout
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <router-outlet></router-outlet>
    <app-toast-container></app-toast-container>
    <app-global-search></app-global-search>
  `,
  imports: [RouterOutlet, GlobalSearchComponent, ToastContainerComponent]
})
export class AppComponent implements OnInit {
  title = 'CoreUI Angular Admin Template';

  readonly #destroyRef: DestroyRef = inject(DestroyRef);
  readonly #activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #titleService = inject(Title);

  readonly #colorModeService = inject(ColorModeService);
  readonly #iconSetService = inject(IconSetService);

  // 🔥 Services temps réel
  private realtime = inject(RealtimeEventsService);
  private notifications = inject(NotificationService);  // ⬅️ ajout

  constructor() {
    // Titre + icônes + thème CoreUI
    this.#titleService.setTitle(this.title);
    this.#iconSetService.icons = { ...iconSubset };
    this.#colorModeService.localStorageItemName.set(
      'coreui-free-angular-admin-template-theme-default'
    );
    this.#colorModeService.eventName.set('ColorSchemeChange');
  }

  ngOnInit(): void {
    const apiBaseUrl = environment.apiBaseUrl; // ex: 'http://localhost:8083'

    // ✅ Connexions temps réel déclenchées une seule fois
    this.realtime.connect(apiBaseUrl);
    this.notifications.connect(apiBaseUrl);   // ⬅️ connexion des notifs

    this.#router.events
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(evt => {
        if (!(evt instanceof NavigationEnd)) return;
        // logique post-navigation si besoin
      });

    this.#activatedRoute.queryParams
      .pipe(
        delay(1),
        map(params => <string>params['theme']?.match(/^[A-Za-z0-9\s]+/)?.[0]),
        filter(theme => ['dark', 'light', 'auto'].includes(theme)),
        tap(theme => this.#colorModeService.colorMode.set(theme)),
        takeUntilDestroyed(this.#destroyRef)
      )
      .subscribe();
  }
}
