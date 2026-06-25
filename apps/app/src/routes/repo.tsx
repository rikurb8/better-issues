import { createQuery } from '@tanstack/solid-query';
import { For, Show, createMemo } from 'solid-js';
import { getRequestEvent, isServer } from 'solid-js/web';

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
  const repoQuery = createQuery<RepoDetails>(() => ({
    queryKey: ['github', 'repo', parts().owner, parts().name],
    enabled: !isServer,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const token = localStorage.getItem('github_token_hint');
      if (!token) throw new Error('Save a GitHub token before viewing repository details.');

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ query: REPO_QUERY, variables: parts() }),
      });
      const payload = await response.json();
      if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.[0]?.message ?? 'Failed to fetch repository.');
      return payload.data.repository;
    },
  }));

  return <main class="min-h-screen bg-surface px-6 py-8 text-neutral-950">
    <section class="mx-auto max-w-6xl space-y-6">
      <a class="text-sm font-medium text-violet-700" href="/repos">← Back to repositories</a>
      <Show when={repoQuery.isLoading}><div class="rounded-2xl border bg-white p-6 text-neutral-500">Loading repository…</div></Show>
      <Show when={repoQuery.error}><p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{repoQuery.error instanceof Error ? repoQuery.error.message : 'Failed to fetch repository.'} <a class="underline" href="/setup">Connect GitHub</a></p></Show>
      <Show when={repoQuery.data}>{(current) => <>
        <header class="rounded-2xl border bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 class="text-3xl font-semibold">{current().nameWithOwner}</h1>
              <p class="mt-2 max-w-3xl text-neutral-600">{current().description || 'No description'}</p>
            </div>
            <a class="rounded-lg bg-neutral-950 px-4 py-2 text-white dark:bg-white dark:text-neutral-950" href={current().url} target="_blank">Open on GitHub</a>
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
      </>}</Show>
    </section>
  </main>;
}

function Meta(props: { label: string; value: string; color?: string | null }) {
  return <div class="rounded-xl border bg-neutral-50 p-3">
    <p class="text-xs uppercase tracking-wide text-neutral-500">{props.label}</p>
    <p class="mt-1 flex items-center gap-2 font-medium"><Show when={props.color}><span class="h-3 w-3 rounded-full" style={`background-color: ${props.color}`} /></Show>{props.value}</p>
  </div>;
}

function Panel(props: { title: string; empty: string; items: (Issue | PullRequest)[]; kind: 'issue' | 'pr'; repoNameWithOwner?: string }) {
  function itemHref(item: Issue | PullRequest) {
    if (props.kind !== 'issue' || !props.repoNameWithOwner) return item.url;
    const [owner, name] = props.repoNameWithOwner.split('/');
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${item.number}`;
  }
  return <section class="rounded-2xl border bg-white p-5 shadow-sm">
    <h2 class="text-xl font-semibold">{props.title}</h2>
    <Show when={props.items.length > 0} fallback={<p class="mt-4 text-neutral-500">{props.empty}</p>}>
      <ul class="mt-4 divide-y">
        <For each={props.items}>{(item) => <li class="py-4">
          <a class="font-medium text-violet-700" href={itemHref(item)} target={props.kind === 'pr' ? '_blank' : undefined}>#{item.number} {item.title}</a>
          <p class="mt-1 text-sm text-neutral-500">By {item.author?.login ?? 'unknown'} · updated {relativeDate(item.updatedAt)}</p>
          <Show when={props.kind === 'issue' && 'labels' in item && item.labels?.nodes.length}>
            <div class="mt-2 flex flex-wrap gap-2"><For each={(item as Issue).labels?.nodes ?? []}>{(label) => <span class="rounded-full px-2 py-0.5 text-xs" style={`background-color: #${label.color}22; color: #${label.color}`}>{label.name}</span>}</For></div>
          </Show>
          <Show when={props.kind === 'pr'}><p class="mt-2 text-xs uppercase tracking-wide text-neutral-500">{(item as PullRequest).isDraft ? 'Draft' : ((item as PullRequest).reviewDecision ?? 'Ready')}</p></Show>
        </li>}</For>
      </ul>
    </Show>
  </section>;
}
