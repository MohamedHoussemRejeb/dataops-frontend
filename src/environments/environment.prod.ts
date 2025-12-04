export const environment = {
  production: true,
  keycloak: {
    url: 'https://keycloak01-cyepgyeje2hadygd.canadacentral-01.azurewebsites.net',
    realm: 'dataops',
    clientId: 'dataops-angular'
  },
  // 🔹 Backend Spring Boot déployé sur Azure
  //    → on inclut /api car tous tes contrôleurs sont sous /api/...
  apiBaseUrl: 'https://dataops-backendd-g2aabvb0c4f8a0c9.canadacentral-01.azurewebsites.net/api'
};
