import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  /* =========================
   *  VUE D’ENSEMBLE
   * ========================= */
  {
    name: 'Cockpit DataOps',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' },
    badge: {
      color: 'info',
      text: 'LIVE'
    }
  },
  {
    name: 'BI Analytics',
    url: '/powerbi',
    iconComponent: { name: 'cil-chart' }
  },

  {
    title: true,
    name: 'Supervision & Qualité'
  },

  /* =========================
   *  SUPERVISION & QUALITÉ
   * ========================= */

  {
    name: 'Centre d’alertes',
    url: '/alerts',
    iconComponent: { name: 'cil-bell' }
  },

  {
    name: 'Supervision temps réel',
    url: '/live',
    iconComponent: { name: 'cil-av-timer' }
  },

  {
    name: 'Runs pipelines',
    url: '/runs',
    iconComponent: { name: 'cil-loop' }
  },

  {
    name: 'Comparaison de runs',
    url: '/runs/compare',
    iconComponent: { name: 'cil-balance-scale' }
  },

  {
    name: 'Qualité & SLA',
    url: '/quality',
    iconComponent: { name: 'cil-chart-line' },
    badge: { color: 'info', text: 'Soda' }
  },

  {
    title: true,
    name: 'Catalogue & Gouvernance'
  },

  /* =========================
   *  CATALOGUE & GOUVERNANCE
   * ========================= */

  {
    name: 'Catalogue de données',
    url: '/catalog',
    iconComponent: { name: 'cil-library' }
  },

  {
    name: 'Lineage',
    iconComponent: { name: 'cil-share' },
    children: [
      { name: 'Lineage graphique', url: '/lineage/graph' },
      { name: 'Lineage colonnes',  url: '/lineage/columns' },
      { name: 'Flow map',          url: '/lineage/flow' },
    ]
  },

  {
    name: 'Lineage avancé',
    url: '/lineage-advanced',
    iconComponent: { name: 'cil-share' }
  },

  {
    name: 'Politiques & documentation',
    url: '/docs',
    iconComponent: { name: 'cil-description' }
  },

  {
    name: 'Matrice d’accès',
    url: '/access-matrix',
    iconComponent: { name: 'cil-people' },
    attributes: { roles: ['admin', 'steward'] }
  },

  {
    name: 'Champs & templates',
    url: '/admin/custom-fields',
    iconComponent: { name: 'cil-settings' }
  },

  {
    title: true,
    name: 'Orchestration & Intégration'
  },

  /* =========================
   *  ORCHESTRATION & INTÉGRATION
   * ========================= */

  {
    name: 'Orchestrateur de workflows',
    url: '/workflow',
    iconComponent: { name: 'cil-arrow-circle-right' },
    attributes: { roles: ['admin', 'steward'] }
  },

  {
    name: 'Sources de données',
    url: '/sources',
    iconComponent: { name: 'cil-layers' },
  },

  {
    name: 'Import catalogue',
    url: '/catalog-import',
    iconComponent: { name: 'cil-cloud-upload' },
    attributes: { roles: ['admin', 'steward'] }
  },

  {
    title: true,
    name: 'Audit & Administration',
    class: 'mt-auto'
  },

  /* =========================
   *  AUDIT & ADMIN
   * ========================= */

  {
    name: 'Audit & traçabilité',
    url: '/audit',
    iconComponent: { name: 'cil-shield-alt' },
    children: [
      {
        name: 'Timeline des événements',
        url: '/audit/timeline',
        iconComponent: { name: 'cilClock' },
      },
      {
        name: 'Journal d’audit',
        url: '/audit/logs',
        iconComponent: { name: 'cilList' },
      },
    ],
  },

  {
    name: 'Paramètres plateforme',
    url: '/settings',
    iconComponent: { name: 'cil-settings' }
  },

  {
    name: 'Assistant IA',
    url: '/chatbot',
    iconComponent: { name: 'cil-chat-bubble' }
  }
];
