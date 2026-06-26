import { Button, Link } from '@kobalte/core';
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { fetchAgentInvocations, loadAgentInvocations, type AgentInvocation } from '../lib/agent-activity';

function relativeDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function targetLabel(invocation: AgentInvocation) {
  const target = invocation.target;
  if (target.owner && target.repo && target.number) return `${target.owner}/${target.repo}#${target.number}`;
  if (target.owner && target.repo) return `${target.owner}/${target.repo}`;
  return target.title ?? 'Unknown target';
}

function targetHref(invocation: AgentInvocation) {
  const target = invocation.target;
  if (target.kind === 'issue' && target.owner && target.repo && target.number) return `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/issues/${target.number}`;
  if (target.url) return target.url;
  return undefined;
}

export default function AgentPage() {
  const [invocations, setInvocations] = createSignal<AgentInvocation[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setInvocations(await fetchAgentInvocations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent activity.');
      setInvocations(loadAgentInvocations());
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    void refresh();
    const sync = () => void refresh();
    window.addEventListener('agent-invocations-changed', sync);
    window.addEventListener('storage', sync);
    onCleanup(() => {
      window.removeEventListener('agent-invocations-changed', sync);
      window.removeEventListener('storage', sync);
    });
  });

  const stats = createMemo(() => {
    const items = invocations();
    return {
      total: items.length,
      succeeded: items.filter((item) => item.status === 'succeeded').length,
      failed: items.filter((item) => item.status === 'failed').length,
    };
  });

  return <main class="min-h-screen bg-surface px-6 py-8 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-100">
    <section class="mx-auto max-w-6xl space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-sm font-medium text-neutral-500">Pi Agent</p>
          <h1 class="text-3xl font-semibold">Agent activity</h1>
          <p class="mt-1 max-w-2xl text-neutral-600 dark:text-neutral-300">A lightweight local timeline of agent workflows run from this browser, starting with issue readiness analysis.</p>
        </div>
        <div class="flex gap-2">
          <Link.Root class="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700" href="/">Home</Link.Root>
          <Button.Root class="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700" disabled={loading()} onClick={refresh}>{loading() ? 'Refreshing…' : 'Refresh'}</Button.Root>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <Stat label="Total runs" value={String(stats().total)} />
        <Stat label="Succeeded" value={String(stats().succeeded)} />
        <Stat label="Failed" value={String(stats().failed)} />
      </div>

      <Show when={error()}>{(message) => <p class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{message()} Showing browser-local fallback activity, if any.</p>}</Show>

      <Show when={!loading()} fallback={<div class="mystery-card p-6 text-neutral-500">Loading agent activity…</div>}>
      <Show when={invocations().length > 0} fallback={<div class="mystery-card p-6 text-neutral-500">No agent activity yet. Run “Analyze issue readiness” on an issue to populate this page.</div>}>
        <ol class="mystery-card divide-y dark:divide-neutral-800">
          <For each={invocations()}>{(invocation) => <li class="p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide dark:border-neutral-700 dark:bg-neutral-950">{invocation.agent} agent</span>
                  <span class="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800">{invocation.status}</span>
                  <Show when={invocation.resultLabel}><span class="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800">{invocation.resultLabel}</span></Show>
                </div>
                <h2 class="mt-3 text-lg font-semibold">{invocation.workflow}</h2>
                <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{invocation.summary ?? 'No summary captured.'}</p>
                <div class="mt-3 flex flex-wrap gap-3 text-sm">
                  <Show when={targetHref(invocation)} fallback={<span class="text-neutral-500">{targetLabel(invocation)}</span>}>{(href) => <Link.Root class="font-medium underline" href={href()}>{targetLabel(invocation)}</Link.Root>}</Show>
                  <Show when={invocation.commentUrl}><Link.Root class="font-medium underline" href={invocation.commentUrl ?? ''} target="_blank">GitHub comment</Link.Root></Show>
                </div>
              </div>
              <time class="text-sm text-neutral-500" dateTime={invocation.ranAt}>{relativeDate(invocation.ranAt)}</time>
            </div>
          </li>}</For>
        </ol>
      </Show>
      </Show>
    </section>
  </main>;
}

function Stat(props: { label: string; value: string }) {
  return <div class="mystery-card p-4">
    <p class="text-xs uppercase tracking-wide text-neutral-500">{props.label}</p>
    <p class="mt-1 text-2xl font-semibold">{props.value}</p>
  </div>;
}
