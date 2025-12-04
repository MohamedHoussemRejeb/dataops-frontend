// src/app/keycloak-init.ts
import { KeycloakService } from 'keycloak-angular';

export function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url:
          window.location.hostname === 'localhost'
            ? 'http://localhost:8181' // Keycloak local
            : 'https://keycloak01-cyepgyeje2hadygd.canadacentral-01.azurewebsites.net',
        realm: 'dataops',
        clientId: 'dataops-angular',
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false,
        pkceMethod: 'S256',
        redirectUri: window.location.origin,  // très important
      },
      bearerExcludedUrls: ['/assets', '/index.html'],
    });
}
