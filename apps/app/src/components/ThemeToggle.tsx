import { createSignal, onMount } from 'solid-js';

const THEME_STORAGE_KEY = 'work_hub_theme';
type Theme = 'light' | 'dark';

function preferredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = createSignal<Theme>('light');

  onMount(() => {
    const initial = preferredTheme();
    setTheme(initial);
    applyTheme(initial);
  });

  const toggleTheme = () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      aria-label={`Switch to ${theme() === 'dark' ? 'light' : 'dark'} mode`}
      class="fixed right-4 top-4 z-50 rounded-full border border-neutral-200 bg-white/90 px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm backdrop-blur transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-100 dark:hover:bg-neutral-800"
      onClick={toggleTheme}
    >
      {theme() === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
