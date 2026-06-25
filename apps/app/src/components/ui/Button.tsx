import type { JSX } from 'solid-js';
export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} class={`rounded-lg bg-neutral-950 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 ${props.class ?? ''}`} />;
}
