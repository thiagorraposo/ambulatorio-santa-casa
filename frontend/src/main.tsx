import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './app/App';
import { SessionProvider } from './app/session';
import './styles.css';

const router = createBrowserRouter([{ path: '*', element: <SessionProvider><App /></SessionProvider> }]);
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
