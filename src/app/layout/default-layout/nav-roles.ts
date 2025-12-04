// src/app/layout/default-layout/nav-roles.ts
import { INavData } from '@coreui/angular';

export type Role = 'admin' | 'steward' | 'viewer';

// On étend INavData pour *pouvoir* porter "roles" mais sans forcer à l'écrire dans _nav.ts
export interface NavWithRoles extends INavData {
  roles?: Role[];
  children?: NavWithRoles[];
}

const ALL: Role[] = ['admin', 'steward', 'viewer'];

/**
 * Map optionnel d'autorisations par URL.
 * 👉 Tu peux élargir/réduire comme tu veux, sans toucher au gros _nav.ts.
 * S'il n'y a rien dans ce map pour une entrée, on considère ALL (tout le monde).
 */
export const ROLE_MAP: Record<string, Role[]> = {
  '/dashboard': ALL,

  // --- tes pages appli ---
  '/alerts': ALL,
  '/calendar': ALL,
  '/catalog': ALL,
  '/lineage': ALL,
  '/lineage-advanced': ['admin', 'steward'],
  '/live': ['admin', 'steward'],
  '/runs/compare': ['admin', 'steward'],
  '/settings': ['admin', 'steward'],
  '/audit': ['admin'],

  // --- démo CoreUI : souvent admin seulement, adapte si tu veux ---
  '/base': ['admin'],
  '/buttons': ['admin'],
  '/forms': ['admin'],
  '/charts': ['admin'],
  '/icons': ['admin'],
  '/notifications': ['admin'],
  '/widgets': ['admin'],

  // pages publiques
  '/login': ALL,
  '/register': ALL,
  '/404': ALL,
  '/500': ALL,
};

/** Retourne les rôles autorisés pour un item donné (fallback = ALL) */
function rolesFor(item: INavData): Role[] {
  const url = item.url;
  if (typeof url === 'string' && ROLE_MAP[url]) return ROLE_MAP[url];
  // Si l'item est un "title" sans URL, on le montre si un enfant garde quelque chose.
  return ALL;
}

/** Filtre récursif du menu par rôle */
export function filterNavByRole(items: INavData[], role: Role): NavWithRoles[] {
  console.log('%c[NAV] filterNavByRole role = ' + role, 'color: dodgerblue');
  const out: NavWithRoles[] = [];

  for (const it of items as NavWithRoles[]) {
    // Calcul des enfants filtrés en premier (si présents)
    let children: NavWithRoles[] | undefined;
    if (it.children?.length) {
      children = filterNavByRole(it.children, role);
    }

    // Rôles applicables pour l'item courant :
    // 1) priorité à it.roles (si tu décides d'en ajouter directement dans _nav.ts plus tard)
    // 2) sinon, ROLE_MAP par URL
    // 3) fallback = ALL
    const allowed = (it.roles && it.roles.length ? it.roles : rolesFor(it));
    const isAllowed = allowed.includes(role);

    // Cas 1 : item titre (title: true)
    if (it.title) {
      // On garde un "title" uniquement s'il reste des enfants visibles juste après lui
      if (children && children.length) {
        out.push({ ...it, children });
      }
      continue;
    }

    // Cas 2 : item "normal"
    // On conserve si l'item est autorisé, ou s'il n'est pas autorisé mais garde des enfants autorisés
    if (isAllowed || (children && children.length)) {
      const clone: NavWithRoles = { ...it };
      if (children) clone.children = children;
      out.push(clone);
    }
  }

  return out;
}
