import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

export type Role = 'admin' | 'steward' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _user$ = new BehaviorSubject<User | null>(null);
  user$ = this._user$.asObservable();

  constructor(private router: Router) {
    const token = localStorage.getItem('access_token');
    if (token) this.setTokens(token);
  }

  /** Enregistre le token + construit l'objet User */
  setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);

    const payload = this.decodeJwt(accessToken);
    const role = this.mapRole(payload);

    const user: User = {
      id: payload.sub,
      name: payload.preferred_username || payload.name || 'User',
      email: payload.email || '',
      role
    };

    console.log('[AUTH] user = ', user);

    this._user$.next(user);
  }

  /** Décodage du JWT */
  private decodeJwt(token: string): any {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return {};
    }
  }

  /** Mapping des rôles Keycloak → rôles UI */
  private mapRole(payload: any): Role {
    const realmRoles: string[] = payload.realm_access?.roles ?? [];
    const clientRoles: string[] = payload.resource_access?.['dataops-angular']?.roles ?? [];
    const r = [...realmRoles, ...clientRoles].map(v => v.toLowerCase());

    if (r.includes('admin')) return 'admin';
    if (r.includes('steward')) return 'steward';
    return 'viewer';
  }

  get isLogged(): boolean {
    return !!this._user$.value;
  }

  get role(): Role {
    return this._user$.value?.role ?? 'viewer';
  }

  /** 🔥 Nouveau : accès synchrone au user courant */
  get currentUser(): User | null {
    return this._user$.value;
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this._user$.next(null);

    // important: always go to login WITH a returnUrl
    window.location.href = '/login?returnUrl=/runs';
  }
}
