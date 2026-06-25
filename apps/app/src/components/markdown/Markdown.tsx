// Lightweight component placeholder. Wire remark/rehype rendering here during UI implementation.
export function Markdown(props: { body?: string }) {
  return <article class="markdown-body whitespace-pre-wrap rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900">{props.body || ''}</article>;
}
