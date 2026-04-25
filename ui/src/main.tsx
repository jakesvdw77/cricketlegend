import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import keycloak from './keycloak';
import { loginEventApi } from './api/loginEventApi';

keycloak
  .init({ onLoad: 'check-sso', checkLoginIframe: false })
  .then((authenticated) => {
    if (authenticated && !sessionStorage.getItem('loginRecorded')) {
      sessionStorage.setItem('loginRecorded', 'true');
      loginEventApi.record().catch(() => {});
    }
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch(console.error);
