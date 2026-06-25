import { For, Show, createMemo, createSignal, onMount } from 'solid-js';
import { getRequestEvent, isServer } from 'solid-js/web';
import { Markdown } from '../components/markdown/Markdown';

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

export default function IssuePage() {
  const [repository, setRepository] = createSignal<IssueResponse | null>(null);
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const parts = createMemo(pathParts);

  async function fetchIssue() {
    const token = localStorage.getItem('github_token_hint');
    if (!token) {
      setError('Save a GitHub token before viewing issue details.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ query: ISSUE_QUERY, variables: parts() }),
      });
      const payload = await response.json();
      if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.[0]?.message ?? 'Failed to fetch issue.');
      if (!payload.data.repository?.issue) throw new Error('Issue not found.');
      setRepository(payload.data.repository);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issue.');
    } finally {
      setLoading(false);
    }
  }

  onMount(fetchIssue);

  const issue = createMemo(() => repository()?.issue ?? null);
  const repoHref = createMemo(() => `/repos/${encodeURIComponent(parts().owner)}/${encodeURIComponent(parts().name)}`);

  return <main class="min-h-screen bg-surface px-6 py-8 text-neutral-950">
    <section class="mx-auto max-w-5xl space-y-6">
      <a class="text-sm font-medium text-violet-700" href={repoHref()}>← Back to repository</a>
      <Show when={loading()}><div class="rounded-2xl border bg-white p-6 text-neutral-500">Loading issue…</div></Show>
      <Show when={error()}><p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error()} <a class="underline" href="/setup">Connect GitHub</a></p></Show>
      <Show when={issue()}>{(current) => <>
        <header class="rounded-2xl border bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-sm text-neutral-500">{repository()?.nameWithOwner} #{current().number}</p>
              <h1 class="mt-1 text-3xl font-semibold">{current().title}</h1>
              <p class="mt-2 text-sm text-neutral-600">Opened by {current().author?.login ?? 'unknown'} on {relativeDate(current().createdAt)} · updated {relativeDate(current().updatedAt)}</p>
            </div>
            <a class="rounded-lg bg-neutral-950 px-4 py-2 text-white" href={current().url} target="_blank">Open on GitHub</a>
          </div>
          <div class="mt-5 flex flex-wrap gap-2">
            <span class="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">{current().state}</span>
            <For each={current().labels.nodes}>{(label) => <span class="rounded-full px-3 py-1 text-sm" style={`background-color: #${label.color}22; color: #${label.color}`}>{label.name}</span>}</For>
          </div>
          <Show when={current().assignees.nodes.length > 0}>
            <p class="mt-4 text-sm text-neutral-600">Assigned to <For each={current().assignees.nodes}>{(assignee, index) => <span>{index() > 0 ? ', ' : ''}{assignee.login}</span>}</For></p>
          </Show>
        </header>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold">Description</h2>
          <Markdown body={current().body || 'No description provided.'} />
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
                <Markdown body={comment.body || ''} />
              </li>}</For>
            </ol>
          </Show>
        </section>
      </>}</Show>
    </section>
  </main>;
}
