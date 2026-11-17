import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

/* Fonts-ready gate: add .fonts-ready class when web fonts load */
if (typeof document !== 'undefined') {
  const ready = () => document.documentElement.classList.add('fonts-ready');
  if (document.fonts?.ready) {
    document.fonts.ready.then(ready).catch(ready);
  } else {
    /* Fallback for older browsers */
    document.addEventListener('DOMContentLoaded', ready);
    setTimeout(ready, 3000);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);