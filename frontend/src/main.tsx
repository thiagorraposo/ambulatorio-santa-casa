import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './app/App';
import { SessionProvider } from './app/session';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter><SessionProvider><App /></SessionProvider></BrowserRouter>,
);
