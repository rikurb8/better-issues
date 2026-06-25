import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
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

const QUERY_CACHE_STORAGE_KEY = 'work_hub_query_cache_v1';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function restoreQueryCache() {
  if (isServer) return;
  try {
    const cached = sessionStorage.getItem(QUERY_CACHE_STORAGE_KEY);
    if (!cached) return;
    const queries = JSON.parse(cached) as { queryKey: unknown[]; data: unknown; dataUpdatedAt?: number }[];
    for (const query of queries) queryClient.setQueryData(query.queryKey, query.data, { updatedAt: query.dataUpdatedAt });
  } catch {
    sessionStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  }
}

function persistQueryCache() {
  if (isServer) return;
  const queries = queryClient.getQueryCache().getAll()
    .filter((query) => query.queryKey[0] === 'github' && query.state.status === 'success' && query.state.data !== undefined)
    .map((query) => ({ queryKey: query.queryKey, data: query.state.data, dataUpdatedAt: query.state.dataUpdatedAt }));
  sessionStorage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(queries));
}

if (!isServer) {
  restoreQueryCache();
  queryClient.getQueryCache().subscribe(persistQueryCache);
}

function Routes() {
  const path = pathname();
  if (path === '/setup') return <Setup />;
  if (path === '/repos') return <Repos />;
  if (path.includes('/issues/')) return <IssuePage />;
  if (path.startsWith('/repos/')) return <RepoPage />;
  return <Home />;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><Routes /></QueryClientProvider>;
}
