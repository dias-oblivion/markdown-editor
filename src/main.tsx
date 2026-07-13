import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
// Fontes self-hosted (offline no Electron) — Inter p/ UI, JetBrains Mono p/ editor
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
