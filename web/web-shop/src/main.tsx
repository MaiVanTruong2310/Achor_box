import { AppErrorBoundary, ConnectionNotice } from './components/AppResilience';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeContext';
import './shop.css';
import './visual-refresh.css';
import './commerce-ui.css';
import './contact.css';
import './components/store-header.css';
import './store-theme.css';
import './apple-home.css';
import './theme/tokens.css';
import './theme/seamless.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <ThemeProvider><AppErrorBoundary><ConnectionNotice /><BrowserRouter>
      <App />
    </BrowserRouter></AppErrorBoundary></ThemeProvider>
  </React.StrictMode>);
