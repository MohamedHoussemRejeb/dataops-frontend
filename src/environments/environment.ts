// src/environments/environment.ts
export const environment = {
  production: false,

  // 🔥 BACKEND LOCAL
  apiBaseUrl:'https://dataops-backendd-g2aabvb0c4f8a0c9.canadacentral-01.azurewebsites.net/api',
  useMock: false, // on garde si c’est utilisé ailleurs

  // 🔐 KEYCLOAK LOCAL
  // 🔐 KEYCLOAK AZURE
  keycloakBaseUrl:
    'https://keycloak01-cyepgyeje2hadygd.canadacentral-01.azurewebsites.net',
  keycloakTokenUrl:
    'https://keycloak01-cyepgyeje2hadygd.canadacentral-01.azurewebsites.net/realms/dataops/protocol/openid-connect/token',
  keycloakClientId: 'dataops-angular',
};
