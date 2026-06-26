import { Button, Link } from '@kobalte/core';
import { createQuery } from '@tanstack/solid-query';
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { isServer } from 'solid-js/web';
import { type FavoriteRepo, loadFavoriteRepos, saveFavoriteRepos } from '../lib/favorites';
import { githubGraphql } from '../lib/github-api';

type FavoriteActivity = {
  id: string;
  nameWithOwner: string;
  pushedAt?: string | null;
  updatedAt?: string | null;
  defaultBranchRef?: { name: string; target?: { history?: { totalCount: number; nodes: CommitActivity[] } } | null } | null;
  issues: { totalCount: number; nodes: IssueActivity[] };
  pullRequests: { totalCount: number; nodes: PullActivity[] };
};

type CommitActivity = { oid: string; committedDate: string };
type IssueActivity = { id: string; updatedAt: string };
type PullActivity = { id: string; updatedAt: string };

const FAVORITE_ACTIVITY_QUERY = `
query FavoriteActivity($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    nameWithOwner
    pushedAt
    updatedAt
    defaultBranchRef {
      name
      target {
        ... on Commit {
          history(first: 1) {
            totalCount
            nodes { oid committedDate }
          }
        }
      }
    }
    issues(first: 1, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes { id updatedAt }
    }
    pullRequests(first: 1, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes { id updatedAt }
    }
  }
}`;

function relativeDate(value?: string | null) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function Home() {
  const [favorites, setFavorites] = createSignal<FavoriteRepo[]>([]);

  onMount(() => {
    setFavorites(loadFavoriteRepos());
    const syncFavorites = () => setFavorites(loadFavoriteRepos());
    window.addEventListener('favorite-repos-changed', syncFavorites);
    window.addEventListener('storage', syncFavorites);
    onCleanup(() => {
      window.removeEventListener('favorite-repos-changed', syncFavorites);
      window.removeEventListener('storage', syncFavorites);
    });
  });

  function removeFavorite(repo: FavoriteRepo) {
    const next = favorites().filter((favorite) => favorite.owner !== repo.owner || favorite.name !== repo.name);
    setFavorites(next);
    saveFavoriteRepos(next);
  }

  const activityQuery = createQuery<Record<string, FavoriteActivity>>(() => ({
    queryKey: ['github', 'favorite-repos-activity', favorites().map((repo) => `${repo.owner}/${repo.name}`).join(',')],
    enabled: !isServer && favorites().length > 0,
    initialData: {},
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const entries = await Promise.all(favorites().map(async (favorite) => {
        const payload = await githubGraphql<{ repository: FavoriteActivity }>(FAVORITE_ACTIVITY_QUERY, { owner: favorite.owner, name: favorite.name });
        const activity = payload.repository;
        return [activity.nameWithOwner, activity] as const;
      }));
      return Object.fromEntries(entries);
    },
  }));

  return <main class="min-h-screen bg-surface text-neutral-950 dark:bg-neutral-950 dark:text-neutral-100">
    <section class="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <section class="mystery-card p-6">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-2xl font-semibold">Favorite repositories</h2>
            <p class="mt-1 text-sm text-neutral-500">Saved in this browser.</p>
          </div>
          <div class="flex gap-2">
            <Link.Root class="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700" href="/agent">Agent activity</Link.Root>
            <Link.Root class="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700" href="/repos">Add favorites</Link.Root>
          </div>
        </div>

        <Show when={favorites().length > 0} fallback={<div class="mt-6 rounded-2xl border bg-neutral-50 p-6 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">No favorites yet.</div>}>
          <ul class="mt-6 grid gap-4 md:grid-cols-2">
            <For each={favorites()}>{(repo) => <li class="rounded-2xl border bg-neutral-50 p-4 dark:bg-neutral-800/60">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <Link.Root class="text-lg font-semibold text-neutral-950 underline dark:text-neutral-100" href={`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`}>{repo.nameWithOwner}</Link.Root>
                  <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{repo.description || 'No description'}</p>
                </div>
                <Button.Root class="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" onClick={() => removeFavorite(repo)}>Remove</Button.Root>
              </div>
              <Show when={activityQuery.data?.[repo.nameWithOwner]}>{(activity) => <RepoActivity activity={activity()} />}</Show>
              <Show when={repo.url}><Link.Root class="mt-3 inline-block text-sm text-neutral-500 underline" href={repo.url} target="_blank">Open on GitHub</Link.Root></Show>
            </li>}</For>
          </ul>
        </Show>
      </section>
    </section>
  </main>;
}

function RepoActivity(props: { activity: FavoriteActivity }) {
  const latestCommit = () => props.activity.defaultBranchRef?.target?.history?.nodes[0];
  const latestIssue = () => props.activity.issues.nodes[0];
  const latestPull = () => props.activity.pullRequests.nodes[0];

  return <div class="mt-3 grid gap-2 rounded-xl border border-neutral-200 bg-white/70 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-950/40 sm:grid-cols-2">
    <ActivityStat label="Repo" value="Updated" meta={relativeDate(props.activity.updatedAt)} />
    <ActivityStat label={props.activity.defaultBranchRef?.name ?? 'main'} value={`${props.activity.defaultBranchRef?.target?.history?.totalCount ?? 0} commits`} meta={`latest ${relativeDate(latestCommit()?.committedDate ?? props.activity.pushedAt)}`} />
    <ActivityStat label="Issues" value={`${props.activity.issues.totalCount} open`} meta={props.activity.issues.totalCount > 0 ? `latest ${relativeDate(latestIssue()?.updatedAt)}` : 'none open'} />
    <ActivityStat label="PRs" value={`${props.activity.pullRequests.totalCount} open`} meta={props.activity.pullRequests.totalCount > 0 ? `latest ${relativeDate(latestPull()?.updatedAt)}` : 'none open'} />
  </div>;
}

function ActivityStat(props: { label: string; value: string; meta: string }) {
  return <div>
    <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">{props.label}</p>
    <p class="font-medium text-neutral-900 dark:text-neutral-100">{props.value}</p>
    <p class="text-xs text-neutral-500">{props.meta}</p>
  </div>;
}
