// src/app/keycloak-init.ts
import { KeycloakService } from 'keycloak-angular';
import { environment } from '../environments/environment';

export function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url: environment.keycloakBaseUrl,  
        realm: 'dataops',
        clientId: 'dataops-angular',
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      },
      bearerExcludedUrls: ['/assets', '/index.html'],
    });
}
