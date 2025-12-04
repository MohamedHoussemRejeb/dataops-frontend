import { Routes } from '@angular/router';

export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'timeline'
  },
  {
    path: 'timeline',
    loadComponent: () =>
      import('./audit-timeline/audit-timeline.component').then(
        m => m.AuditTimelineComponent
      ),
  },
  {
    path: 'logs',
    loadComponent: () =>
      import('./audit-log.component').then(
        m => m.AuditLogComponent
      ),
  }
];
