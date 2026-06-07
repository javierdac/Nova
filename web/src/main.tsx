import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { queryClient } from '@/lib/queryClient';
import '@/i18n';
import { bootstrapPreferences } from '@/store/preferences';
import './index.css';

// Sync persisted theme + language with the DOM and i18next before render.
bootstrapPreferences();

// NOTE: React.StrictMode is intentionally omitted. Its dev-only double
// mount/unmount detaches recharts' ResponsiveContainer ResizeObserver, leaving
// charts measured at 0×0 (blank) until a window resize. StrictMode is inert in
// production, so this only affects the dev experience.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
