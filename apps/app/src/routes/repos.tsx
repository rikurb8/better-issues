import { createQuery } from '@tanstack/solid-query';
import { For, Show, createSignal } from 'solid-js';

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

  const reposQuery = createQuery<Repo[]>(() => ({
    queryKey: ['github', 'repos'],
    enabled: false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const token = localStorage.getItem('github_token_hint');
      if (!token) throw new Error('Save a GitHub token before fetching repositories.');

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          authorization: `bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query: REPOS_QUERY, variables: { first: 50 } }),
      });
      const payload = await response.json();
      if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.[0]?.message ?? 'Failed to fetch repositories.');
      return payload.data.viewer.repositories.nodes ?? [];
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
      <button class="rounded-lg bg-neutral-950 px-4 py-2 text-white dark:bg-white dark:text-neutral-950 disabled:opacity-60" disabled={reposQuery.isFetching} onClick={fetchRepos}>{reposQuery.isFetching ? 'Fetching...' : 'Fetch repositories'}</button>
      <Show when={error()}><p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error()} <a class="underline" href="/setup">Connect GitHub</a></p></Show>
      <Show when={(reposQuery.data?.length ?? 0) > 0} fallback={<div class="rounded-2xl border bg-white p-6 text-neutral-500">No repos loaded yet. Connect GitHub, then fetch via SolidStart server functions.</div>}>
        <ul class="divide-y rounded-2xl border bg-white">
          <For each={reposQuery.data ?? []}>{(repo) => <li class="p-4">
            <a class="font-medium text-violet-700" href={`/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`}>{repo.nameWithOwner}</a>
            <p class="text-sm text-neutral-600">{repo.description || 'No description'}</p>
            <div class="mt-2 flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-500">
              <span>{repo.isPrivate ? 'Private' : 'Public'}</span>
              <a class="normal-case tracking-normal text-neutral-500 underline" href={repo.url} target="_blank">GitHub</a>
            </div>
          </li>}</For>
        </ul>
      </Show>
    </section>
  </main>;
}
