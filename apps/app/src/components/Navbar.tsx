import { Link } from '@kobalte/core';

export default function Navbar() {
  return <nav class="border-b bg-white/90 px-6 py-3 text-neutral-950 backdrop-blur dark:border-neutral-700 dark:bg-neutral-950/90 dark:text-neutral-100">
    <div class="mx-auto flex max-w-6xl items-center gap-4">
      <Link.Root class="mr-2 text-sm font-semibold tracking-tight" href="/">Work Hub</Link.Root>
      <Link.Root class="text-sm text-neutral-600 underline underline-offset-4 dark:text-neutral-300" href="/">Home</Link.Root>
      <Link.Root class="text-sm text-neutral-600 underline underline-offset-4 dark:text-neutral-300" href="/repos">Repos</Link.Root>
      <Link.Root class="text-sm text-neutral-600 underline underline-offset-4 dark:text-neutral-300" href="/setup">Connect</Link.Root>
    </div>
  </nav>;
}
