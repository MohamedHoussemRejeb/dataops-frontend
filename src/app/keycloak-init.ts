// src/app/keycloak-init.ts
import { KeycloakService } from 'keycloak-angular';

export function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url: 'http://localhost:8181',
        realm: 'dataops',
        clientId: 'dataops-angular',
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false,
        pkceMethod: 'S256',   // ← IMPORTANT en 2025
      },
      bearerExcludedUrls: ['/assets', '/index.html'],
    });
}
