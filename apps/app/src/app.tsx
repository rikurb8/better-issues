import { getRequestEvent, isServer } from 'solid-js/web';
import './styles.css';
import Home from './routes/index';
import Setup from './routes/setup';
import Repos from './routes/repos';
import RepoPage from './routes/repo';
import IssuePage from './routes/issue';

function pathname() {
  if (isServer) return new URL(getRequestEvent()?.request.url ?? 'http://localhost/').pathname;
  return window.location.pathname;
}

export default function App() {
  const path = pathname();
  if (path === '/setup') return <Setup />;
  if (path === '/repos') return <Repos />;
  if (path.includes('/issues/')) return <IssuePage />;
  if (path.startsWith('/repos/')) return <RepoPage />;
  return <Home />;
}
