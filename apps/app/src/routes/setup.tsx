import { createSignal, onMount } from 'solid-js';

export default function Setup() {
  const [token, setToken] = createSignal('');
  const [saved, setSaved] = createSignal(false);

  onMount(() => setToken(localStorage.getItem('github_token_hint') ?? ''));

  function saveToken() {
    localStorage.setItem('github_token_hint', token());
    sessionStorage.removeItem('work_hub_query_cache_v1');
    setSaved(true);
  }

  return <main class="min-h-screen bg-surface px-6 py-10 text-neutral-950">
    <section class="mx-auto max-w-2xl space-y-6">
      <h1 class="text-3xl font-semibold">Connect GitHub</h1>
      <p class="text-neutral-600">Paste a fine-grained token for this local session. Logout/reset will clear local state; GitHub remains the durable backend.</p>
      <textarea class="h-28 w-full rounded-xl border p-3 font-mono text-sm" placeholder="github_pat_..." value={token()} onInput={(e) => { setToken(e.currentTarget.value); setSaved(false); }} />
      <div class="flex flex-wrap items-center gap-3">
        <button class="rounded-lg bg-neutral-950 px-4 py-2 text-white" onClick={saveToken}>Save locally</button>
        {saved() && <>
          <p class="text-sm font-medium text-green-700">Token saved locally.</p>
          <a class="rounded-lg border border-neutral-300 px-4 py-2 font-medium" href="/repos">Fetch repositories</a>
        </>}
      </div>
    </section>
  </main>;
}
