import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.use({ gfm: true, breaks: false });

export type MarkdownRenderMode = 'github' | 'prose' | 'card' | 'dense';

export const markdownRenderModes: { value: MarkdownRenderMode; label: string; description: string }[] = [
  { value: 'github', label: 'GitHub', description: 'github-markdown-css baseline' },
  { value: 'prose', label: 'Editorial', description: 'larger reading rhythm and soft canvas' },
  { value: 'card', label: 'Card', description: 'elevated issue-note treatment' },
  { value: 'dense', label: 'Dense', description: 'compact triage-friendly rendering' },
];

const allowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'details', 'summary']);
const allowedAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  input: ['type', 'checked', 'disabled'],
};

function renderMarkdown(body?: string) {
  const html = marked.parse(body || '', { async: false });
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noreferrer' }),
      input: sanitizeHtml.simpleTransform('input', { disabled: 'disabled' }),
    },
  });
}

const modeClass: Record<MarkdownRenderMode, string> = {
  github: 'markdown-github',
  prose: 'markdown-prose border-neutral-200 bg-white p-7 text-[16px] shadow-sm dark:border-neutral-700 dark:bg-neutral-900',
  card: 'markdown-card border-neutral-200 bg-white p-6 shadow-lg shadow-neutral-200/60 dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-black/30',
  dense: 'markdown-dense p-4 text-sm',
};

export function Markdown(props: { body?: string; mode?: MarkdownRenderMode }) {
  const mode = () => props.mode ?? 'github';
  return <article class={`markdown-body rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 ${modeClass[mode()]}`} innerHTML={renderMarkdown(props.body)} />;
}
