import { Link, Select } from '@kobalte/core';
import { createQuery } from '@tanstack/solid-query';
import { For, Show, createMemo, createSignal } from 'solid-js';
import { getRequestEvent, isServer } from 'solid-js/web';
import { Markdown, type MarkdownRenderMode, markdownRenderModes } from '../components/markdown/Markdown';
import { recordAgentInvocation } from '../lib/agent-activity';
import { githubGraphql } from '../lib/github-api';
import { analyzeIssueReadiness, listSkills, runSkill, type AnalyzeIssueReadinessResponse, type RunSkillResponse, type SkillMetadata } from '../lib/pi-agent-api';

type RenderModeOption = (typeof markdownRenderModes)[number];

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
      const payload = await githubGraphql<{ repository: IssueResponse }>(ISSUE_QUERY, parts());
      if (!payload.repository?.issue) throw new Error('Issue not found.');
      return payload.repository;
    },
  }));

  const issue = createMemo(() => issueQuery.data?.issue ?? null);
  const repoHref = createMemo(() => `/repos/${encodeURIComponent(parts().owner)}/${encodeURIComponent(parts().name)}`);
  const [renderMode, setRenderMode] = createSignal<MarkdownRenderMode>('card');
  const [readiness, setReadiness] = createSignal<AnalyzeIssueReadinessResponse | null>(null);
  const [readinessError, setReadinessError] = createSignal<string | null>(null);
  const [readinessLoading, setReadinessLoading] = createSignal(false);

  const skillsQuery = createQuery<SkillMetadata[]>(() => ({
    queryKey: ['pi-agent', 'skills'],
    enabled: !isServer,
    staleTime: 5 * 60_000,
    queryFn: async () => (await listSkills()).skills,
  }));
  const [selectedSkill, setSelectedSkill] = createSignal<string>('');
  const [skillInstructions, setSkillInstructions] = createSignal('');
  const [skillPostComment, setSkillPostComment] = createSignal(false);
  const [skillResult, setSkillResult] = createSignal<RunSkillResponse | null>(null);
  const [skillError, setSkillError] = createSignal<string | null>(null);
  const [skillRunning, setSkillRunning] = createSignal(false);

  const effectiveSkill = createMemo(() => {
    const skills = skillsQuery.data ?? [];
    const chosen = selectedSkill();
    if (chosen && skills.some((skill) => skill.name === chosen)) return chosen;
    return skills[0]?.name ?? '';
  });

  async function onRunSkill() {
    const current = issue();
    const skill = effectiveSkill();
    if (!current || !skill) return;
    setSkillRunning(true);
    setSkillError(null);
    const target = { kind: 'issue' as const, owner: parts().owner, repo: parts().name, number: current.number, title: current.title, url: current.url };
    try {
      const response = await runSkill({
        skill,
        instructions: skillInstructions().trim() || undefined,
        postComment: skillPostComment(),
        owner: parts().owner,
        repo: parts().name,
        number: current.number,
        title: current.title,
        body: current.body,
        labels: current.labels.nodes.map((label) => label.name),
        comments: current.comments.nodes.map((comment) => ({ author: comment.author?.login, body: comment.body ?? '', createdAt: comment.createdAt })),
      });
      setSkillResult(response);
      recordAgentInvocation({
        agent: 'pi',
        action: `run-skill:${skill}`,
        workflow: `Run skill: ${skill}`,
        status: 'succeeded',
        target,
        summary: `Ran skill "${skill}" on ${parts().owner}/${parts().name}#${current.number}.`,
        resultLabel: skill,
        commentUrl: response.commentUrl,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run skill.';
      setSkillError(message);
      recordAgentInvocation({
        agent: 'pi',
        action: `run-skill:${skill}`,
        workflow: `Run skill: ${skill}`,
        status: 'failed',
        target,
        summary: message,
        resultLabel: skill,
      });
    } finally {
      setSkillRunning(false);
    }
  }

  async function onAnalyzeReadiness() {
    const current = issue();
    if (!current) return;
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const response = await analyzeIssueReadiness({
        owner: parts().owner,
        repo: parts().name,
        number: current.number,
        title: current.title,
        body: current.body,
        labels: current.labels.nodes.map((label) => label.name),
        comments: current.comments.nodes.map((comment) => ({ author: comment.author?.login, body: comment.body ?? '', createdAt: comment.createdAt })),
      });
      setReadiness(response);
      recordAgentInvocation({
        agent: 'pi',
        action: 'analyze-issue-readiness',
        workflow: 'Analyze issue readiness',
        status: 'succeeded',
        target: { kind: 'issue', owner: parts().owner, repo: parts().name, number: current.number, title: current.title, url: current.url },
        summary: response.result.summary,
        resultLabel: response.result.status,
        commentUrl: response.commentUrl,
        details: { reasons: response.result.reasons, recommendations: response.result.recommendations },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze issue readiness.';
      setReadinessError(message);
      recordAgentInvocation({
        agent: 'pi',
        action: 'analyze-issue-readiness',
        workflow: 'Analyze issue readiness',
        status: 'failed',
        target: { kind: 'issue', owner: parts().owner, repo: parts().name, number: current.number, title: current.title, url: current.url },
        summary: message,
      });
    } finally {
      setReadinessLoading(false);
    }
  }

  return <main class="min-h-screen bg-surface px-6 py-8 text-neutral-950">
    <section class="mx-auto max-w-5xl space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Link.Root class="text-sm font-medium text-neutral-950 dark:text-neutral-100" href={repoHref()}>← Back to repository</Link.Root>
        <Link.Root class="text-sm font-medium text-neutral-950 underline dark:text-neutral-100" href="/agent">Agent activity</Link.Root>
      </div>
      <Show when={issueQuery.isLoading}><div class="mystery-card p-6 text-neutral-500">Loading issue…</div></Show>
      <Show when={issueQuery.error}><p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{issueQuery.error instanceof Error ? issueQuery.error.message : 'Failed to fetch issue.'} <Link.Root class="underline" href="/setup">Connect GitHub</Link.Root></p></Show>
      <Show when={issue()}>{(current) => (<>
        <header class="mystery-card overflow-hidden dark:bg-neutral-900">
          <div class="border-b bg-white p-6 dark:bg-neutral-950">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm text-neutral-500">{issueQuery.data?.nameWithOwner} #{current().number}</p>
                <h1 class="mt-1 max-w-4xl text-4xl font-semibold tracking-tight">{current().title}</h1>
                <p class="mt-3 text-sm text-neutral-600">Opened by <span class="font-medium text-neutral-900">{current().author?.login ?? 'unknown'}</span> on {relativeDate(current().createdAt)} · updated {relativeDate(current().updatedAt)}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100" disabled={readinessLoading()} onClick={onAnalyzeReadiness}>{readinessLoading() ? 'Analyzing…' : 'Analyze issue readiness'}</button>
                <Link.Root class="rounded-lg bg-neutral-950 px-4 py-2 text-white dark:bg-white dark:text-neutral-950" href={current().url} target="_blank">Open on GitHub</Link.Root>
              </div>
            </div>
            <div class="mt-5 flex flex-wrap gap-2">
              <span class="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">{current().state}</span>
              <For each={current().labels.nodes}>{(label) => <span class="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">{label.name}</span>}</For>
            </div>
          </div>
          <div class="grid gap-3 p-4 sm:grid-cols-3">
            <InfoCard label="Comments" value={String(current().comments.totalCount)} />
            <InfoCard label="Assignees" value={String(current().assignees.nodes.length || 'None')} />
            <InfoCard label="Markdown renderer" value={markdownRenderModes.find((mode) => mode.value === renderMode())?.label ?? 'Card'} />
          </div>
        </header>

        <Show when={readinessError()}>{(message) => <p class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{message()}</p>}</Show>

        <Show when={readiness()}>{(analysis) => <section class="mystery-card p-5 dark:bg-neutral-900">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-500">Pi Agent readiness</p>
              <h2 class="mt-1 text-xl font-semibold">{analysis().result.summary}</h2>
            </div>
            <span class="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">{analysis().result.status}</span>
          </div>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 class="font-semibold">Reasons</h3>
              <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300"><For each={analysis().result.reasons}>{(reason) => <li>{reason}</li>}</For></ul>
            </div>
            <Show when={analysis().result.recommendations?.length}>
              <div>
                <h3 class="font-semibold">Recommendations</h3>
                <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300"><For each={analysis().result.recommendations}>{(item) => <li>{item}</li>}</For></ul>
              </div>
            </Show>
          </div>
          <Show when={analysis().commentUrl}><p class="mt-4 text-sm"><Link.Root class="font-medium underline" href={analysis().commentUrl ?? ''} target="_blank">Posted GitHub comment</Link.Root></p></Show>
        </section>}</Show>

        <section class="mystery-card p-5 dark:bg-neutral-900">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-500">Run a skill</p>
              <h2 class="mt-1 text-xl font-semibold">Run a repository skill against this issue</h2>
            </div>
          </div>
          <Show when={skillsQuery.error}><p class="mt-3 text-sm text-red-700 dark:text-red-300">{skillsQuery.error instanceof Error ? skillsQuery.error.message : 'Failed to load skills.'}</p></Show>
          <Show when={skillsQuery.isLoading}><p class="mt-3 text-sm text-neutral-500">Loading skills…</p></Show>
          <Show when={!skillsQuery.isLoading && (skillsQuery.data?.length ?? 0) === 0}><p class="mt-3 text-sm text-neutral-500">No skills available from the configured skills path.</p></Show>
          <Show when={(skillsQuery.data?.length ?? 0) > 0}>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <label class="grid gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Skill
                <select
                  class="rounded-xl border bg-white px-3 py-2 text-neutral-950 shadow-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  value={effectiveSkill()}
                  onChange={(event) => setSelectedSkill(event.currentTarget.value)}
                >
                  <For each={skillsQuery.data}>{(skill) => <option value={skill.name}>{skill.name}</option>}</For>
                </select>
              </label>
              <div class="text-sm text-neutral-600 dark:text-neutral-400">
                <p class="font-medium text-neutral-700 dark:text-neutral-300">Description</p>
                <p class="mt-1">{skillsQuery.data?.find((skill) => skill.name === effectiveSkill())?.description ?? ''}</p>
              </div>
            </div>
            <label class="mt-4 grid gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Additional instructions (optional)
              <textarea
                class="min-h-20 rounded-xl border bg-white px-3 py-2 text-neutral-950 shadow-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                value={skillInstructions()}
                onInput={(event) => setSkillInstructions(event.currentTarget.value)}
                placeholder="Anything extra the skill should consider…"
              />
            </label>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" checked={skillPostComment()} onChange={(event) => setSkillPostComment(event.currentTarget.checked)} />
                Post output as a GitHub comment
              </label>
              <button type="button" class="rounded-lg bg-neutral-950 px-4 py-2 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-950" disabled={skillRunning() || !effectiveSkill()} onClick={onRunSkill}>{skillRunning() ? 'Running…' : 'Run skill'}</button>
            </div>
          </Show>
          <Show when={skillError()}>{(message) => <p class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{message()}</p>}</Show>
          <Show when={skillResult()}>{(result) => <div class="mt-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs uppercase tracking-wide text-neutral-500">Output from {result().skill.name}</p>
              <Show when={result().commentUrl}><Link.Root class="text-sm font-medium underline" href={result().commentUrl ?? ''} target="_blank">Posted GitHub comment</Link.Root></Show>
            </div>
            <Markdown body={result().text} mode={renderMode()} />
          </div>}</Show>
        </section>

        <section class="space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold">Description</h2>
              <p class="text-sm text-neutral-500">GFM tables, task lists, code blocks, images, blockquotes, and details are styled here.</p>
            </div>
            <Select.Root
              class="grid gap-1 text-sm font-medium text-neutral-700"
              options={markdownRenderModes}
              optionValue="value"
              optionTextValue="label"
              value={markdownRenderModes.find((mode) => mode.value === renderMode())}
              onChange={(mode) => mode && setRenderMode(mode.value)}
              itemComponent={(props) => <Select.Item class="cursor-pointer px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" item={props.item}><Select.ItemLabel>{props.item.rawValue.label}</Select.ItemLabel></Select.Item>}
            >
              <Select.Label>Render style</Select.Label>
              <Select.Trigger class="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-neutral-950 shadow-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">
                <Select.Value<RenderModeOption>>{(state) => state.selectedOption()?.label ?? 'Select style'}</Select.Value>
                <Select.Icon>⌄</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content class="z-50 rounded-xl border bg-white py-1 text-neutral-950 shadow-lg dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">
                  <Select.Listbox />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
          <Markdown body={current().body || sampleMarkdown} mode={renderMode()} />
        </section>

        <section class="mystery-card p-5">
          <h2 class="text-xl font-semibold">Comments ({current().comments.totalCount})</h2>
          <Show when={current().comments.nodes.length > 0} fallback={<p class="mt-4 text-neutral-500">No comments yet.</p>}>
            <ol class="mt-4 space-y-4">
              <For each={current().comments.nodes}>{(comment) => <li class="rounded-xl border bg-neutral-50 p-4">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500">
                  <span>{comment.author?.login ?? 'unknown'} commented on {relativeDate(comment.createdAt)}</span>
                  <Link.Root class="text-neutral-950 dark:text-neutral-100 underline" href={comment.url} target="_blank">GitHub comment</Link.Root>
                </div>
                <Markdown body={comment.body || ''} mode={renderMode()} />
              </li>}</For>
            </ol>
          </Show>
        </section>
      </>)}</Show>
    </section>
  </main>;
}
