import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import './index.css';
// Import the nepali-calendar-js wrapper to load the library
import './lib/nepaliCalendarWrapper.js';

// Set environment variables on window object for the app to access
// Try multiple sources: import.meta.env, __ENV__, and environment variables
declare const __ENV__: Record<string, string>;

(window as any).VITE_GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  __ENV__.VITE_GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID;

(window as any).VITE_GOOGLE_CLIENT_SECRET =
  import.meta.env.VITE_GOOGLE_CLIENT_SECRET ||
  __ENV__.VITE_GOOGLE_CLIENT_SECRET ||
  process.env.VITE_GOOGLE_CLIENT_SECRET;

(window as any).VITE_REDIRECT_URI =
  import.meta.env.VITE_REDIRECT_URI ||
  __ENV__.VITE_REDIRECT_URI ||
  process.env.VITE_REDIRECT_URI ||
  'http://localhost:3000/callback';

// Debug: Log environment variables
console.log('Environment variables loaded:', {
  clientId: (window as any).VITE_GOOGLE_CLIENT_ID ? (window as any).VITE_GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'MISSING',
  clientSecret: (window as any).VITE_GOOGLE_CLIENT_SECRET ? 'PRESENT' : 'MISSING',
  redirectUri: (window as any).VITE_REDIRECT_URI || 'NOT SET'
});
console.log('__ENV__:', __ENV__);

// Render the app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
