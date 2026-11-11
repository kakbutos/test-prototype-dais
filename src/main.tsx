import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlobalStyle } from '@daisforge/ui';
import { App } from './App';
import './assets/fonts/fonts.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><GlobalStyle theme="light" /><App /></StrictMode>,
);
