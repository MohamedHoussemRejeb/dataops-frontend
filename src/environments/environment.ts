// src/environments/environment.ts
export const environment = {
  production: false,

  // 🔥 BACKEND LOCAL
  apiBaseUrl: 'http://localhost:8083/api',

  // 🔥 KEYCLOAK LOCAL
  keycloakTokenUrl:
    'http://localhost:8181/realms/dataops/protocol/openid-connect/token',
  keycloakClientId: 'dataops-angular',

  useMock: false
};