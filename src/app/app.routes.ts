// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LiveRunsComponent } from './features/live/live-runs/live-runs.component';
import { authGuard, roleMatchGuard } from './core/auth.guard';

export const routes: Routes = [
  // 🔁 Root → Login by default
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 🔒 Protected layout: everything inside requires authentication
  {
    path: '',
    loadComponent: () => import('./layout').then(m => m.DefaultLayoutComponent),
    canActivateChild: [authGuard],
    data: { title: 'Home' },
    children: [
      // --- Runs / Admin flux ---
      {
        path: 'runs',
        loadComponent: () =>
          import('./features/runs/runs-list/runs-list').then(m => m.RunsList),
      },
      {
        path: 'runs/compare',
        loadComponent: () =>
          import('./features/runs/compare-runs/compare-runs.component').then(m => m.CompareRunsComponent),
      },
      {
        path: 'runs/:id',
        loadComponent: () =>
          import('./features/runs/run-detail/run-detail').then(m => m.RunDetail),
      },
      {
        path: 'upload',
        loadComponent: () =>
          import('./features/upload/upload-page/upload-page').then(m => m.UploadPage),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard-home/dashboard-home.component').then(
            (m) => m.DashboardComponent
          ),
      },

      // --- Alerts : admin + steward ---
      {
        path: 'alerts',
        data: { roles: ['admin', 'steward'] },
        canMatch: [roleMatchGuard],
        loadComponent: () =>
          import('./features/alerts/alerts-list/alerts-list.component').then(m => m.AlertsList),
      },

      // --- Calendar / Live ---
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/runs-calendar/runs-calendar.component').then(m => m.RunsCalendarComponent),
      },
      { path: 'live', component: LiveRunsComponent },

      // --- Catalog ---
      {
        path: 'catalog',
        loadComponent: () =>
          import('./features/catalog/catalog/catalog.component').then(m => m.CatalogComponent),
      },

      // --- Lineage (shell + tabs) ---
      {
        path: 'lineage',
        loadComponent: () =>
          import('./features/lineage/lineage-shell.component')
            .then(m => m.LineageShellComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'graph' },

          {
            path: 'graph',
            loadComponent: () =>
              import('./features/lineage/lineage.component')
                .then(m => m.LineageComponent),
          },
          {
            path: 'columns',
            loadComponent: () =>
              import('./features/lineage/column-lineage.component')
                .then(m => m.ColumnLineageComponent),
          },
          // ✅ route admin colonnes/lineage (DYNAMIQUE)
          {
            path: 'columns-admin/:id',
            loadComponent: () =>
              import('./features/lineage/column-admin/column-admin.component')
                .then(m => m.ColumnAdminComponent),
          },
          {
            path: 'flow',
            loadComponent: () =>
              import('./features/lineage/flow-map/flow-map.component')
                .then(m => m.FlowMapComponent),
          },
        ]
      },

      {
        path: 'lineage-advanced',
        loadComponent: () =>
          import('./features/lineage/lineage-advanced/lineage-advanced.component')
            .then(m => m.LineageEnterpriseComponent),
      },
      {
        path: 'lineage/:urn',
        loadComponent: () =>
          import('./features/lineage/lineage-advanced/lineage-advanced.component')
            .then(m => m.LineageEnterpriseComponent),
      },

      // --- Quality ---
      {
        path: 'quality',
        loadComponent: () =>
          import('./features/quality/quality-dashboard/quality-dashboard.component')
            .then(m => m.QualityDashboardComponent),
      },
      {
        path: 'column-profile',
        loadComponent: () =>
          import('./features/quality/column-profile/column-profile.component')
            .then(m => m.ColumnProfileComponent),
      },

      {
        path: 'catalog-import',
        loadComponent: () =>
          import('./features/catalog/import-wizard/import-wizard.component')
            .then(m => m.ImportWizardComponent)
      },
      {
        path: 'sources',
        loadComponent: () =>
          import('./features/sources/sources-list/sources-list.component')
            .then(m => m.SourcesListComponent)
      },
      {
        path: 'docs',
        loadComponent: () =>
          import('./features/docs/docs-list/docs-list.component')
            .then(m => m.DocsListComponent)
      },
      {
        path: 'catalog/:id',
        loadComponent: () =>
          import('./features/catalog/dataset-detail/dataset-detail.component')
            .then(m => m.DatasetDetailComponent)
      },

      // --- Settings / Audit ---
      {
        path: 'admin/custom-fields',
        data: { roles: ['admin'] },
        canMatch: [roleMatchGuard],
        loadComponent: () =>
          import('./features/settings/admin-custom-fields/admin-custom-fields.component')
            .then(m => m.AdminCustomFieldsComponent),
      },
      {
        path: 'settings',
        data: { roles: ['admin'] },
        canMatch: [roleMatchGuard],
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'audit',
        data: { roles: ['admin', 'steward'] },
        canMatch: [roleMatchGuard],
        loadChildren: () =>
          import('./features/audit/audit.routes').then(m => m.AUDIT_ROUTES),
      },

      // --- Access Matrix ---
      {
        path: 'access-matrix',
        data: { roles: ['admin', 'steward'] },
        canMatch: [roleMatchGuard],
        loadComponent: () =>
          import('./features/access-matrix/access-matrix/access-matrix.component')
            .then(m => m.AccessMatrixComponent),
      },
      {
        path: 'workflow',
        data: { roles: ['admin', 'steward'] },
        canMatch: [roleMatchGuard],
        loadComponent: () =>
          import('./features/runs/workflow-edges/workflow-edges.component')
            .then(m => m.WorkflowEdgesComponent),
      },
      {
        path: 'powerbi',
        loadComponent: () =>
          import('./features/powerbi/powerbi.component')
            .then(m => m.PowerbiComponent),
      },
      {
        path: 'chatbot',
        loadComponent: () =>
          import('./views/chatbot/chatbot-demo.component')
            .then(m => m.ChatbotDemoComponent),
      },

      // --- CoreUI demo routes (still protected by authGuard) ---
      { path: 'dashboard-demo', loadChildren: () => import('./views/dashboard/routes').then(m => m.routes) },
      { path: 'theme',         loadChildren: () => import('./views/theme/routes').then(m => m.routes) },
      { path: 'base',          loadChildren: () => import('./views/base/routes').then(m => m.routes) },
      { path: 'buttons',       loadChildren: () => import('./views/buttons/routes').then(m => m.routes) },
      { path: 'forms',         loadChildren: () => import('./views/forms/routes').then(m => m.routes) },
      { path: 'icons',         loadChildren: () => import('./views/icons/routes').then(m => m.routes) },
      { path: 'notifications', loadChildren: () => import('./views/notifications/routes').then(m => m.routes) },
      { path: 'widgets',       loadChildren: () => import('./views/widgets/routes').then(m => m.routes) },
      { path: 'charts',        loadChildren: () => import('./views/charts/routes').then(m => m.routes) },
      { path: 'pages',         loadChildren: () => import('./views/pages/routes').then(m => m.routes) },
    ],
  },

  // 🔓 Public pages
  {
    path: 'login',
    loadComponent: () =>
      import('./views/pages/login/login.component').then(m => m.LoginComponent),
    data: { title: 'Login Page' },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./views/pages/register/register.component').then(m => m.RegisterComponent),
    data: { title: 'Register Page' },
  },

  // Errors
  {
    path: '403',
    loadComponent: () =>
      import('./views/pages/page404/page404.component').then(m => m.Page404Component),
    data: { title: 'Page 403' },
  },
  {
    path: '404',
    loadComponent: () =>
      import('./views/pages/page404/page404.component').then(m => m.Page404Component),
    data: { title: 'Page 404' },
  },
  {
    path: '500',
    loadComponent: () =>
      import('./views/pages/page500/page500.component').then(m => m.Page500Component),
    data: { title: 'Page 500' },
  },

  // Fallback
  { path: '**', redirectTo: '404' }
];
