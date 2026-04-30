import axios from 'axios';
import keycloak from '../keycloak';

const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30);
    } catch {
      keycloak.login();
      return Promise.reject(new Error('Session expired — please log in again.'));
    }
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

export default api;
