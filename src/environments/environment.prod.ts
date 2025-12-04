// src/environments/environment.prod.ts
export const environment = {
  production: true,

  // 🔥 BACKEND AZURE
  apiBaseUrl:
    'https://dataops-backendd-g2aabvb0c4f8a0c9.canadacentral-01.azurewebsites.net/api',

  // 🔐 KEYCLOAK AZURE
  keycloakBaseUrl:
    'https://keycloak01-cyepgyeje2hadygd.canadacentral-01.azurewebsites.net',
  keycloakTokenUrl:
    'https://keycloak01-cyepgyeje2hadygd.canadacentral-01.azurewebsites.net/realms/dataops/protocol/openid-connect/token',
  keycloakClientId: 'dataops-angular',
};
