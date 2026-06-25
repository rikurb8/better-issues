import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.use({ gfm: true, breaks: false });

const allowedTags = sanitizeHtml.defaults.allowedTags.concat(['img', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
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

export function Markdown(props: { body?: string }) {
  return <article class="markdown-body rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900" innerHTML={renderMarkdown(props.body)} />;
}
