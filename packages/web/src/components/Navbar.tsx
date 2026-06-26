import { Link } from '@kobalte/core';

export default function Navbar() {
  const linkClass = 'rounded-full px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100';

  return <nav class="border-b border-neutral-200 bg-white/85 px-6 py-4 text-neutral-950 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85 dark:text-neutral-100">
    <div class="mx-auto flex min-h-10 max-w-6xl items-center gap-6">
      <Link.Root class="mr-auto text-base font-semibold tracking-tight" href="/">Work Hub</Link.Root>
      <div class="flex items-center gap-1 rounded-full border border-neutral-200 bg-white/70 p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
        <Link.Root class={linkClass} href="/">Home</Link.Root>
        <Link.Root class={linkClass} href="/repos">Repos</Link.Root>
        <Link.Root class={linkClass} href="/agent">Agent</Link.Root>
        <Link.Root class={linkClass} href="/setup">Connect</Link.Root>
      </div>
    </div>
  </nav>;
}
