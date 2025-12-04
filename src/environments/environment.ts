// src/environments/environment.ts
export const environment = {
  production: false,

  // 🔥 BACKEND LOCAL
  apiBaseUrl: 'http://localhost:8083/api',
  useMock: false, // on garde si c’est utilisé ailleurs

  // 🔐 KEYCLOAK LOCAL
  keycloakBaseUrl: 'http://localhost:8181',
  keycloakTokenUrl:
    'http://localhost:8181/realms/dataops/protocol/openid-connect/token',
  keycloakClientId: 'dataops-angular',
};
