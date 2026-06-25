export default function Home() {
  return <main class="min-h-screen bg-neutral-950 text-neutral-100">
    <section class="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-20">
      <p class="text-sm uppercase tracking-[0.3em] text-violet-300">Linear meets GitHub Lite</p>
      <h1 class="text-5xl font-semibold tracking-tight">Agentic GitHub work hub</h1>
      <p class="max-w-2xl text-lg text-neutral-300">Read issues, PR conversations, GitHub-flavored markdown, and run Pi Agent actions that post back to GitHub.</p>
      <div class="flex gap-3"><a class="rounded-lg bg-white px-4 py-2 font-medium text-neutral-950" href="/setup">Connect GitHub</a><a class="rounded-lg border border-neutral-700 px-4 py-2" href="/repos">Browse repos</a></div>
    </section>
  </main>;
}
