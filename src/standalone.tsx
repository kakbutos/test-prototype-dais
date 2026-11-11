import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlobalStyle } from '@daisforge/ui';
import Screen, { meta } from 'virtual:dais-prototype';
import { PreviewBoundary } from './PreviewBoundary';
import './assets/fonts/fonts.css';
import './styles.css';

document.title = meta.title;
createRoot(document.getElementById('root')!).render(
  <StrictMode><GlobalStyle theme="light" /><PreviewBoundary><Screen /></PreviewBoundary></StrictMode>,
);
