import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { UIProvider } from './ui/UIProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </UIProvider>
  </StrictMode>,
);
