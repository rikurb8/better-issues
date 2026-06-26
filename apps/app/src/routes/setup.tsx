import { Button, Link } from '@kobalte/core';
import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { githubAuthStatus } from '../lib/github-api';

type DeviceStart = { device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval: number };

export default function Setup() {
  const [status, setStatus] = createSignal('Checking GitHub connection…');
  const [username, setUsername] = createSignal<string | null>(null);
  const [flow, setFlow] = createSignal<DeviceStart | null>(null);
  const [waiting, setWaiting] = createSignal(false);
  let cancelled = false;

  onCleanup(() => { cancelled = true; });
  onMount(refreshStatus);

  async function refreshStatus() {
    const auth = await githubAuthStatus();
    setUsername(auth.username);
    setStatus(auth.authenticated ? `Connected as ${auth.username ?? 'GitHub user'}.` : auth.invalid ? 'Stored GitHub token was invalid. Please reconnect.' : 'Connect your GitHub account to continue.');
  }

  async function start() {
    cancelled = false;
    setWaiting(true);
    setStatus('Opening GitHub in your browser…');
    const response = await fetch('/api/github?action=start-device');
    const next = await response.json();
    if (!response.ok) throw new Error(next.error ?? 'Failed to start GitHub login.');
    setFlow(next);
    window.open(next.verification_uri_complete ?? next.verification_uri, '_blank', 'noopener,noreferrer');
    void poll(next, Date.now() + next.expires_in * 1000);
  }

  async function poll(current: DeviceStart, expiresAt: number) {
    let interval = current.interval || 5;
    while (!cancelled && Date.now() < expiresAt) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      const response = await fetch('/api/github', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'poll-device', deviceCode: current.device_code }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'GitHub login failed.');
      if (result.status === 'success') { setUsername(result.username); setStatus(`Connected as ${result.username}.`); setWaiting(false); sessionStorage.removeItem('work_hub_query_cache_v1'); return; }
      if (result.status === 'slow_down') interval += 5;
      if (result.status === 'expired_token' || result.status === 'access_denied') { setStatus(result.message ?? 'GitHub login was cancelled or expired.'); setWaiting(false); return; }
      setStatus(result.status === 'slow_down' ? 'GitHub asked us to slow down. Still waiting for authorization…' : 'Waiting for authorization…');
    }
    setWaiting(false);
    setStatus('GitHub login expired. Start again to reconnect.');
  }

  async function disconnect() {
    await fetch('/api/github', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'disconnect' }) });
    setUsername(null);
    setFlow(null);
    sessionStorage.removeItem('work_hub_query_cache_v1');
    setStatus('Disconnected. Local OAuth token file was deleted.');
  }

  return <main class="min-h-screen bg-surface px-6 py-10 text-neutral-950">
    <section class="mx-auto max-w-2xl space-y-6">
      <h1 class="text-3xl font-semibold">Connect GitHub</h1>
      <p class="text-neutral-600">Use GitHub Device Flow for this local, single-user app. Tokens stay server-side on this machine and are never stored in browser storage.</p>
      <div class="mystery-card space-y-4 p-6">
        <p class="font-medium">{status()}</p>
        <Show when={flow()}>{(current) => <div class="rounded-xl border bg-neutral-50 p-4">
          <p>If GitHub did not open, visit <Link.Root class="underline" href={current().verification_uri} target="_blank">{current().verification_uri}</Link.Root></p>
          <p class="mt-3 text-sm uppercase tracking-wide text-neutral-500">Enter code</p>
          <p class="font-mono text-3xl font-semibold tracking-widest">{current().user_code}</p>
        </div>}</Show>
        <div class="flex flex-wrap gap-3">
          <Button.Root class="rounded-lg bg-neutral-950 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-950" disabled={waiting()} onClick={start}>{username() ? 'Reconnect GitHub' : 'Connect GitHub'}</Button.Root>
          <Show when={username()}><Button.Root class="rounded-lg border border-neutral-300 px-4 py-2 font-medium" onClick={disconnect}>Disconnect GitHub</Button.Root></Show>
          <Show when={username()}><Link.Root class="rounded-lg border border-neutral-300 px-4 py-2 font-medium" href="/repos">Fetch repositories</Link.Root></Show>
        </div>
      </div>
    </section>
  </main>;
}
