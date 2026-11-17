import React from 'react';
import {createRoot} from 'react-dom/client';
import {StoreProvider} from './store';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import {OperationProgress} from './ActionFeedback';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><StoreProvider><App/></StoreProvider><OperationProgress/></ErrorBoundary></React.StrictMode>);
