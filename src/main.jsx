import React from 'react';
import ReactDOM from 'react-dom/client';
import RootApp from './RootApp.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);
