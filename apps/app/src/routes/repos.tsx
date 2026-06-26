import { Button, Link } from '@kobalte/core';
import { createQuery } from '@tanstack/solid-query';
import { For, Show, createSignal } from 'solid-js';
import { loadFavoriteRepos, toggleFavoriteRepo } from '../lib/favorites';
import { githubGraphql } from '../lib/github-api';

const REPOS_QUERY = `
query Repos($first: Int!) {
  viewer {
    repositories(first: $first, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
      nodes { id nameWithOwner description isPrivate url owner { login } name }
    }
  }
}`;

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
  const [favoriteKeys, setFavoriteKeys] = createSignal(new Set(loadFavoriteRepos().map((repo) => `${repo.owner}/${repo.name}`)));

  function toggleFavorite(repo: Repo) {
    const result = toggleFavoriteRepo({ owner: repo.owner.login, name: repo.name, nameWithOwner: repo.nameWithOwner, url: repo.url, description: repo.description });
    setFavoriteKeys(new Set(result.favorites.map((favorite) => `${favorite.owner}/${favorite.name}`)));
  }

  function isFavorite(repo: Repo) {
    return favoriteKeys().has(`${repo.owner.login}/${repo.name}`);
  }

  const reposQuery = createQuery<Repo[]>(() => ({
    queryKey: ['github', 'repos'],
    enabled: false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const payload = await githubGraphql<{ viewer: { repositories: { nodes: Repo[] } } }>(REPOS_QUERY, { first: 50 });
      return payload.viewer.repositories.nodes ?? [];
    },
  }));

  async function fetchRepos() {
    setError('');
    const result = await reposQuery.refetch();
    if (result.error) setError(result.error instanceof Error ? result.error.message : 'Failed to fetch repositories.');
  }

  return <main class="min-h-screen bg-surface px-6 py-8 text-neutral-950">
    <section class="mx-auto max-w-6xl space-y-4">
      <div><h1 class="text-3xl font-semibold">Repositories</h1><p class="text-neutral-600">GraphQL-backed repo picker goes here: search, filter, select enabled repos.</p></div>
      <Button.Root class="rounded-lg bg-neutral-950 px-4 py-2 text-white dark:bg-white dark:text-neutral-950 disabled:opacity-60" disabled={reposQuery.isFetching} onClick={fetchRepos}>{reposQuery.isFetching ? 'Fetching...' : 'Fetch repositories'}</Button.Root>
      <Show when={error()}><p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error()} <Link.Root class="underline" href="/setup">Connect GitHub</Link.Root></p></Show>
      <Show when={(reposQuery.data?.length ?? 0) > 0} fallback={<div class="mystery-card p-6 text-neutral-500">No repos loaded yet. Connect GitHub, then fetch via SolidStart server functions.</div>}>
        <ul class="divide-y mystery-card">
          <For each={reposQuery.data ?? []}>{(repo) => <li class="flex flex-wrap items-start justify-between gap-3 p-4">
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
      </Show>
    </section>
  </main>;
}
