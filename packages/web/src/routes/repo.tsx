import { Button, Link } from '@kobalte/core';
import { createQuery } from '@tanstack/solid-query';
import { For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { getRequestEvent, isServer } from 'solid-js/web';
import { fetchFavoriteRepos, toggleFavoriteRepo } from '../lib/favorites';
import { githubGraphql } from '../lib/github-api';

const REPO_QUERY = `
query Repo($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    nameWithOwner
    description
    isPrivate
    url
    homepageUrl
    stargazerCount
    forkCount
    watchers { totalCount }
    primaryLanguage { name color }
    licenseInfo { name }
    defaultBranchRef { name }
    pushedAt
    updatedAt
    issues(first: 10, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes { id number title url updatedAt author { login } labels(first: 5) { nodes { name color } } }
    }
    pullRequests(first: 10, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes { id number title url updatedAt author { login } isDraft reviewDecision }
    }
  }
}`;

type Issue = {
  id: string;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  author?: { login: string } | null;
  labels?: { nodes: { name: string; color: string }[] };
};

type PullRequest = {
  id: string;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  author?: { login: string } | null;
  isDraft: boolean;
  reviewDecision?: string | null;
};

type RepoDetails = {
  id: string;
  nameWithOwner: string;
  description?: string | null;
  isPrivate: boolean;
  url: string;
  homepageUrl?: string | null;
  stargazerCount: number;
  forkCount: number;
  watchers: { totalCount: number };
  primaryLanguage?: { name: string; color?: string | null } | null;
  licenseInfo?: { name: string } | null;
  defaultBranchRef?: { name: string } | null;
  pushedAt: string;
  updatedAt: string;
  issues: { totalCount: number; nodes: Issue[] };
  pullRequests: { totalCount: number; nodes: PullRequest[] };
};

function currentPathname() {
  if (isServer) return new URL(getRequestEvent()?.request.url ?? 'http://localhost/').pathname;
  return window.location.pathname;
}

function pathParts() {
  const parts = currentPathname().split('/').filter(Boolean);
  return { owner: decodeURIComponent(parts[1] ?? ''), name: decodeURIComponent(parts.slice(2).join('/') ?? '') };
}

function relativeDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function RepoPage() {
  const parts = createMemo(pathParts);
  const [favoriteKeys, setFavoriteKeys] = createSignal(new Set<string>());
  onMount(async () => setFavoriteKeys(new Set((await fetchFavoriteRepos()).map((repo) => `${repo.owner}/${repo.name}`))));

  async function toggleFavorite(repo: RepoDetails) {
    const [owner, name] = repo.nameWithOwner.split('/');
    const result = await toggleFavoriteRepo({ owner, name, nameWithOwner: repo.nameWithOwner, url: repo.url, description: repo.description }, isFavorite(repo));
    setFavoriteKeys(new Set(result.favorites.map((favorite) => `${favorite.owner}/${favorite.name}`)));
  }

  function isFavorite(repo: RepoDetails) {
    const [owner, name] = repo.nameWithOwner.split('/');
    return favoriteKeys().has(`${owner}/${name}`);
  }
  const repoQuery = createQuery<RepoDetails>(() => ({
    queryKey: ['github', 'repo', parts().owner, parts().name],
    enabled: !isServer,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const payload = await githubGraphql<{ repository: RepoDetails }>(REPO_QUERY, parts());
      return payload.repository;
    },
  }));

  return <main class="min-h-screen bg-surface px-6 py-8 text-neutral-950">
    <section class="mx-auto max-w-6xl space-y-6">
      <Link.Root class="text-sm font-medium text-neutral-950 dark:text-neutral-100" href="/repos">← Back to repositories</Link.Root>
      <Show when={repoQuery.isLoading}><div class="mystery-card p-6 text-neutral-500">Loading repository…</div></Show>
      <Show when={repoQuery.error}><p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{repoQuery.error instanceof Error ? repoQuery.error.message : 'Failed to fetch repository.'} <Link.Root class="underline" href="/setup">Connect GitHub</Link.Root></p></Show>
      <Show when={repoQuery.data}>{(current) => (<>
        <header class="mystery-card p-6 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 class="text-3xl font-semibold">{current().nameWithOwner}</h1>
              <p class="mt-2 max-w-3xl text-neutral-600">{current().description || 'No description'}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button.Root class="rounded-lg border border-neutral-300 px-4 py-2 font-medium dark:border-neutral-700" onClick={() => toggleFavorite(current())}>{isFavorite(current()) ? '★ Favorited' : '☆ Favorite'}</Button.Root>
              <Link.Root class="rounded-lg bg-neutral-950 px-4 py-2 text-white dark:bg-white dark:text-neutral-950" href={current().url} target="_blank">Open on GitHub</Link.Root>
            </div>
          </div>
          <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Visibility" value={current().isPrivate ? 'Private' : 'Public'} />
            <Meta label="Stars" value={String(current().stargazerCount)} />
            <Meta label="Forks" value={String(current().forkCount)} />
            <Meta label="Watchers" value={String(current().watchers.totalCount)} />
            <Meta label="Language" value={current().primaryLanguage?.name ?? 'Unknown'} color={current().primaryLanguage?.color} />
            <Meta label="Default branch" value={current().defaultBranchRef?.name ?? 'None'} />
            <Meta label="License" value={current().licenseInfo?.name ?? 'None'} />
            <Meta label="Last pushed" value={relativeDate(current().pushedAt)} />
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-2">
          <Panel title={`Open issues (${current().issues.totalCount})`} empty="No open issues." items={current().issues.nodes} kind="issue" repoNameWithOwner={current().nameWithOwner} />
          <Panel title={`Open PRs (${current().pullRequests.totalCount})`} empty="No open pull requests." items={current().pullRequests.nodes} kind="pr" />
        </div>
      </>)}</Show>
    </section>
  </main>;
}

function Meta(props: { label: string; value: string; color?: string | null }) {
  return <div class="rounded-xl border bg-neutral-50 p-3">
    <p class="text-xs uppercase tracking-wide text-neutral-500">{props.label}</p>
    <p class="mt-1 flex items-center gap-2 font-medium"><Show when={props.color}><span class="h-3 w-3 rounded-full bg-neutral-950 dark:bg-neutral-100" /></Show>{props.value}</p>
  </div>;
}

function Panel(props: { title: string; empty: string; items: (Issue | PullRequest)[]; kind: 'issue' | 'pr'; repoNameWithOwner?: string }) {
  function itemHref(item: Issue | PullRequest) {
    if (props.kind !== 'issue' || !props.repoNameWithOwner) return item.url;
    const [owner, name] = props.repoNameWithOwner.split('/');
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${item.number}`;
  }
  return <section class="mystery-card p-5">
    <h2 class="text-xl font-semibold">{props.title}</h2>
    <Show when={props.items.length > 0} fallback={<p class="mt-4 text-neutral-500">{props.empty}</p>}>
      <ul class="mt-4 divide-y">
        <For each={props.items}>{(item) => <li class="py-4">
          <Link.Root class="font-medium text-neutral-950 dark:text-neutral-100" href={itemHref(item)} target={props.kind === 'pr' ? '_blank' : undefined}>#{item.number} {item.title}</Link.Root>
          <p class="mt-1 text-sm text-neutral-500">By {item.author?.login ?? 'unknown'} · updated {relativeDate(item.updatedAt)}</p>
          <Show when={props.kind === 'issue' && 'labels' in item && item.labels?.nodes.length}>
            <div class="mt-2 flex flex-wrap gap-2"><For each={(item as Issue).labels?.nodes ?? []}>{(label) => <span class="rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">{label.name}</span>}</For></div>
          </Show>
          <Show when={props.kind === 'pr'}><p class="mt-2 text-xs uppercase tracking-wide text-neutral-500">{(item as PullRequest).isDraft ? 'Draft' : ((item as PullRequest).reviewDecision ?? 'Ready')}</p></Show>
        </li>}</For>
      </ul>
    </Show>
  </section>;
}
