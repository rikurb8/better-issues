import { Button, Link } from '@kobalte/core';
import { createQuery } from '@tanstack/solid-query';
import { For, Show, createMemo, createSignal } from 'solid-js';
import { loadFavoriteRepos, toggleFavoriteRepo } from '../lib/favorites';
import { githubGraphql } from '../lib/github-api';

const PAGE_SIZE = 25;

const REPOS_QUERY = `
query Repos($first: Int!, $after: String) {
  viewer {
    repositories(first: $first, after: $after, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
      nodes { id nameWithOwner description isPrivate url owner { login } name }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const REPO_SEARCH_QUERY = `
query RepoSearch($searchQuery: String!, $first: Int!, $after: String) {
  search(query: $searchQuery, type: REPOSITORY, first: $first, after: $after) {
    nodes { ... on Repository { id nameWithOwner description isPrivate url owner { login } name } }
    pageInfo { hasNextPage endCursor }
  }
}`;

type PageInfo = { hasNextPage: boolean; endCursor?: string | null };

type Repo = {
  id: string;
  nameWithOwner: string;
  name: string;
  owner: { login: string };
  description?: string | null;
  isPrivate: boolean;
  url: string;
};

export default function Repos() {
  const [error, setError] = createSignal('');
  const [search, setSearch] = createSignal('');
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [repos, setRepos] = createSignal<Repo[]>([]);
  const [pageInfo, setPageInfo] = createSignal<PageInfo>({ hasNextPage: false, endCursor: null });
  const [favoriteKeys, setFavoriteKeys] = createSignal(new Set(loadFavoriteRepos().map((repo) => `${repo.owner}/${repo.name}`)));
  const normalizedSearch = createMemo(() => search().trim());

  function toggleFavorite(repo: Repo) {
    const result = toggleFavoriteRepo({ owner: repo.owner.login, name: repo.name, nameWithOwner: repo.nameWithOwner, url: repo.url, description: repo.description });
    setFavoriteKeys(new Set(result.favorites.map((favorite) => `${favorite.owner}/${favorite.name}`)));
  }

  function isFavorite(repo: Repo) {
    return favoriteKeys().has(`${repo.owner.login}/${repo.name}`);
  }

  const reposQuery = createQuery<{ nodes: Repo[]; pageInfo: PageInfo }>(() => ({
    queryKey: ['github', 'repos', normalizedSearch(), cursor()],
    enabled: false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      if (normalizedSearch()) {
        const searchQuery = `${normalizedSearch()} in:name,description sort:updated-desc`;
        const payload = await githubGraphql<{ search: { nodes: Array<Repo | null>; pageInfo: PageInfo } }>(REPO_SEARCH_QUERY, { searchQuery, first: PAGE_SIZE, after: cursor() });
        return { nodes: (payload.search.nodes ?? []).filter((repo): repo is Repo => !!repo), pageInfo: payload.search.pageInfo };
      }
      const payload = await githubGraphql<{ viewer: { repositories: { nodes: Repo[]; pageInfo: PageInfo } } }>(REPOS_QUERY, { first: PAGE_SIZE, after: cursor() });
      return { nodes: payload.viewer.repositories.nodes ?? [], pageInfo: payload.viewer.repositories.pageInfo };
    },
  }));

  async function runQuery(nextCursor: string | null, append = false) {
    setError('');
    setCursor(nextCursor);
    const result = await reposQuery.refetch();
    if (result.error) {
      setError(result.error instanceof Error ? result.error.message : 'Failed to fetch repositories.');
      return;
    }
    const next = result.data;
    if (!next) return;
    setRepos(append ? [...repos(), ...next.nodes] : next.nodes);
    setPageInfo(next.pageInfo);
  }

  function fetchRepos() {
    void runQuery(null);
  }

  function loadMore() {
    void runQuery(pageInfo().endCursor ?? null, true);
  }

  return <main class="min-h-screen bg-surface px-6 py-8 text-neutral-950">
    <section class="mx-auto max-w-6xl space-y-4">
      <div><h1 class="text-3xl font-semibold">Repositories</h1><p class="text-neutral-600">Search repositories by name or description, or browse your recently pushed repositories.</p></div>
      <form class="mystery-card flex flex-col gap-3 p-4 sm:flex-row" onSubmit={(event) => { event.preventDefault(); fetchRepos(); }}>
        <input class="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-950 outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100" value={search()} onInput={(event) => setSearch(event.currentTarget.value)} placeholder="Search repositories…" />
        <Button.Root type="submit" class="rounded-lg bg-neutral-950 px-4 py-2 text-white dark:bg-white dark:text-neutral-950 disabled:opacity-60" disabled={reposQuery.isFetching}>{reposQuery.isFetching ? 'Searching...' : normalizedSearch() ? 'Search' : 'Fetch repositories'}</Button.Root>
      </form>
      <Show when={error()}><p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error()} <Link.Root class="underline" href="/setup">Connect GitHub</Link.Root></p></Show>
      <Show when={repos().length > 0} fallback={<div class="mystery-card p-6 text-neutral-500">No repos loaded yet. Search, or fetch your repositories.</div>}>
        <ul class="divide-y mystery-card">
          <For each={repos()}>{(repo) => <li class="flex flex-wrap items-start justify-between gap-3 p-4">
            <div>
              <Link.Root class="font-medium text-neutral-950 dark:text-neutral-100" href={`/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`}>{repo.nameWithOwner}</Link.Root>
              <p class="text-sm text-neutral-600 dark:text-neutral-300">{repo.description || 'No description'}</p>
              <div class="mt-2 flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-500">
                <span>{repo.isPrivate ? 'Private' : 'Public'}</span>
                <Link.Root class="normal-case tracking-normal text-neutral-500 underline" href={repo.url} target="_blank">GitHub</Link.Root>
              </div>
            </div>
            <Button.Root class="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700" onClick={() => toggleFavorite(repo)}>{isFavorite(repo) ? '★ Favorited' : '☆ Favorite'}</Button.Root>
          </li>}</For>
        </ul>
        <Show when={pageInfo().hasNextPage}>
          <div class="flex justify-center pt-4">
            <Button.Root class="rounded-lg border border-neutral-300 px-4 py-2 font-medium disabled:opacity-60 dark:border-neutral-700" disabled={reposQuery.isFetching} onClick={loadMore}>{reposQuery.isFetching ? 'Loading...' : 'Load more'}</Button.Root>
          </div>
        </Show>
      </Show>
    </section>
  </main>;
}
