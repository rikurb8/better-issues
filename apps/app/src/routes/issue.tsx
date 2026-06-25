import { createQuery } from '@tanstack/solid-query';
import { For, Show, createMemo, createSignal } from 'solid-js';
import { getRequestEvent, isServer } from 'solid-js/web';
import { Markdown, type MarkdownRenderMode, markdownRenderModes } from '../components/markdown/Markdown';

const ISSUE_QUERY = `
query Issue($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    nameWithOwner
    url
    issue(number: $number) {
      id
      number
      title
      body
      url
      state
      createdAt
      updatedAt
      closedAt
      author { login }
      labels(first: 10) { nodes { name color } }
      assignees(first: 10) { nodes { login } }
      comments(first: 25, orderBy: {field: UPDATED_AT, direction: ASC}) {
        totalCount
        nodes {
          id
          body
          url
          createdAt
          updatedAt
          author { login }
        }
      }
    }
  }
}`;

type IssueComment = {
  id: string;
  body?: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  author?: { login: string } | null;
};

type IssueDetails = {
  id: string;
  number: number;
  title: string;
  body?: string | null;
  url: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  author?: { login: string } | null;
  labels: { nodes: { name: string; color: string }[] };
  assignees: { nodes: { login: string }[] };
  comments: { totalCount: number; nodes: IssueComment[] };
};

type IssueResponse = {
  nameWithOwner: string;
  url: string;
  issue: IssueDetails | null;
};

function currentPathname() {
  if (isServer) return new URL(getRequestEvent()?.request.url ?? 'http://localhost/').pathname;
  return window.location.pathname;
}

function pathParts() {
  const parts = currentPathname().split('/').filter(Boolean);
  return {
    owner: decodeURIComponent(parts[1] ?? ''),
    name: decodeURIComponent(parts[2] ?? ''),
    number: Number(parts[4] ?? '0'),
  };
}

function relativeDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const sampleMarkdown = `No description provided.

> This fallback showcases markdown rendering quality.

- [x] Task lists
- [ ] Pending work

| Element | Status |
| --- | --- |
| Tables | Polished |
| Code | Highlight-ready |

\`inline code\` and fenced blocks:

\`\`\`ts
const renderer = 'beautiful';
\`\`\`

<details><summary>Expandable details</summary>Hidden context can live here.</details>`;

function InfoCard(props: { label: string; value: string }) {
  return <div class="rounded-2xl border bg-neutral-50 p-4 dark:bg-neutral-800/60">
    <p class="text-xs uppercase tracking-wide text-neutral-500">{props.label}</p>
    <p class="mt-1 text-2xl font-semibold">{props.value}</p>
  </div>;
}

export default function IssuePage() {
  const parts = createMemo(pathParts);
  const issueQuery = createQuery<IssueResponse>(() => ({
    queryKey: ['github', 'issue', parts().owner, parts().name, parts().number],
    enabled: !isServer,
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const token = localStorage.getItem('github_token_hint');
      if (!token) throw new Error('Save a GitHub token before viewing issue details.');

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ query: ISSUE_QUERY, variables: parts() }),
      });
      const payload = await response.json();
      if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.[0]?.message ?? 'Failed to fetch issue.');
      if (!payload.data.repository?.issue) throw new Error('Issue not found.');
      return payload.data.repository;
    },
  }));

  const issue = createMemo(() => issueQuery.data?.issue ?? null);
  const repoHref = createMemo(() => `/repos/${encodeURIComponent(parts().owner)}/${encodeURIComponent(parts().name)}`);
  const [renderMode, setRenderMode] = createSignal<MarkdownRenderMode>('card');

  return <main class="min-h-screen bg-surface px-6 py-8 text-neutral-950">
    <section class="mx-auto max-w-5xl space-y-6">
      <a class="text-sm font-medium text-violet-700" href={repoHref()}>← Back to repository</a>
      <Show when={issueQuery.isLoading}><div class="rounded-2xl border bg-white p-6 text-neutral-500">Loading issue…</div></Show>
      <Show when={issueQuery.error}><p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{issueQuery.error instanceof Error ? issueQuery.error.message : 'Failed to fetch issue.'} <a class="underline" href="/setup">Connect GitHub</a></p></Show>
      <Show when={issue()}>{(current) => <>
        <header class="overflow-hidden rounded-3xl border bg-white shadow-sm dark:bg-neutral-900">
          <div class="border-b bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm text-neutral-500">{issueQuery.data?.nameWithOwner} #{current().number}</p>
                <h1 class="mt-1 max-w-4xl text-4xl font-semibold tracking-tight">{current().title}</h1>
                <p class="mt-3 text-sm text-neutral-600">Opened by <span class="font-medium text-neutral-900">{current().author?.login ?? 'unknown'}</span> on {relativeDate(current().createdAt)} · updated {relativeDate(current().updatedAt)}</p>
              </div>
              <a class="rounded-lg bg-neutral-950 px-4 py-2 text-white dark:bg-white dark:text-neutral-950" href={current().url} target="_blank">Open on GitHub</a>
            </div>
            <div class="mt-5 flex flex-wrap gap-2">
              <span class="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">{current().state}</span>
              <For each={current().labels.nodes}>{(label) => <span class="rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ring-black/5" style={`background-color: #${label.color}22; color: #${label.color}`}>{label.name}</span>}</For>
            </div>
          </div>
          <div class="grid gap-3 p-4 sm:grid-cols-3">
            <InfoCard label="Comments" value={String(current().comments.totalCount)} />
            <InfoCard label="Assignees" value={String(current().assignees.nodes.length || 'None')} />
            <InfoCard label="Markdown renderer" value={markdownRenderModes.find((mode) => mode.value === renderMode())?.label ?? 'Card'} />
          </div>
        </header>

        <section class="space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold">Description</h2>
              <p class="text-sm text-neutral-500">GFM tables, task lists, code blocks, images, blockquotes, and details are styled here.</p>
            </div>
            <label class="grid gap-1 text-sm font-medium text-neutral-700">
              Render style
              <select class="rounded-xl border bg-white px-3 py-2 text-neutral-950 shadow-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100" value={renderMode()} onChange={(event) => setRenderMode(event.currentTarget.value as MarkdownRenderMode)}>
                <For each={markdownRenderModes}>{(mode) => <option value={mode.value}>{mode.label}</option>}</For>
              </select>
            </label>
          </div>
          <Markdown body={current().body || sampleMarkdown} mode={renderMode()} />
        </section>

        <section class="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 class="text-xl font-semibold">Comments ({current().comments.totalCount})</h2>
          <Show when={current().comments.nodes.length > 0} fallback={<p class="mt-4 text-neutral-500">No comments yet.</p>}>
            <ol class="mt-4 space-y-4">
              <For each={current().comments.nodes}>{(comment) => <li class="rounded-xl border bg-neutral-50 p-4">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500">
                  <span>{comment.author?.login ?? 'unknown'} commented on {relativeDate(comment.createdAt)}</span>
                  <a class="text-violet-700 underline" href={comment.url} target="_blank">GitHub comment</a>
                </div>
                <Markdown body={comment.body || ''} mode={renderMode()} />
              </li>}</For>
            </ol>
          </Show>
        </section>
      </>}</Show>
    </section>
  </main>;
}
