
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './src/App';
import { AppProvider } from './src/context/AppContext';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
}

// AI Studio uses `index.tsx` for all project types. This is the React entry point.

// AI Studio always uses an `index.tsx` file for all project types.
