export const environment = {
  production: true,
  keycloak: {
    url: 'https://keycloak01-cyepgyeje2hadygd.canadacentral-01.azurewebsites.net',
    realm: 'dataops',
    clientId: 'dataops-angular'
  },
  apiBaseUrl: 'https://dataops-api-backend.azurewebsites.net' // 👈 backend URL
};