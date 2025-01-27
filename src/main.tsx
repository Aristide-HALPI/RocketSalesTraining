import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

// Log des variables d'environnement au démarrage
console.log('Environment variables check:', {
  FABRILE_TOKEN: import.meta.env.VITE_FABRILE_TOKEN ? '✓' : '✗',
  FABRILE_ORG_ID: import.meta.env.VITE_FABRILE_ORG_ID ? '✓' : '✗',
  FABRILE_BOT_ID: import.meta.env.VITE_FABRILE_BOT_ID ? '✓' : '✗'
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
