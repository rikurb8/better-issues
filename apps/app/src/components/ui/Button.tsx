import { Button as KobalteButton } from '@kobalte/core';
import type { JSX } from 'solid-js';

export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <KobalteButton.Root {...props} class={`rounded-lg bg-neutral-950 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 ${props.class ?? ''}`} />;
}
