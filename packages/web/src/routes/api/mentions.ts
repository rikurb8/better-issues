import { addFavorite, listFavorites, listMentions, pollMentions, removeFavorite, updateMentionStatus } from '../../server/mentions';

function json(data: unknown, init?: ResponseInit) { return Response.json(data, init); }
function error(message: string, status = 400) { return json({ error: message }, { status }); }

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  try {
    if (url.searchParams.get('resource') === 'favorites') return json({ favorites: await listFavorites() });
    return json({ items: await listMentions(url.searchParams.get('status')) });
  } catch (err) { return error(err instanceof Error ? err.message : 'Mentions API failed.', 500); }
}

export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === 'poll') return json(await pollMentions());
    if (body.action === 'favorite:add') return json({ favorites: await addFavorite({ owner: String(body.owner || ''), repo: String(body.repo || body.name || ''), nameWithOwner: body.nameWithOwner, url: body.url, description: body.description }) });
    if (body.action === 'favorite:remove') return json({ favorites: await removeFavorite(String(body.owner || ''), String(body.repo || body.name || '')) });
    if (body.action === 'status') return json({ item: await updateMentionStatus(String(body.id || ''), body.status) });
    return error('Unknown mentions API action.', 404);
  } catch (err) { return error(err instanceof Error ? err.message : 'Mentions API failed.', 500); }
}
