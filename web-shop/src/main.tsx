import { AppErrorBoundary, ConnectionNotice } from './components/AppResilience';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './shop.css';
import './visual-refresh.css';
import './commerce-ui.css';
import './contact.css';
import './components/store-header.css';
import './store-theme.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <AppErrorBoundary><ConnectionNotice /><BrowserRouter>
      <App />
    </BrowserRouter></AppErrorBoundary>
  </React.StrictMode>);
