import { deleteStoredGitHubAuth, getAuthStatus, pollDeviceFlow, resolveGitHubToken, startDeviceFlow } from '../../server/github/auth';
import { createGitHubClients } from '../../server/github/client';

function json(data: unknown, init?: ResponseInit) { return Response.json(data, init); }
function error(message: string, status = 400) { return json({ error: message }, { status }); }

export async function GET({ request }: { request: Request }) {
  const action = new URL(request.url).searchParams.get('action');
  try {
    if (action === 'status') return json(await getAuthStatus());
    if (action === 'start-device') return json(await startDeviceFlow());
    return error('Unknown GitHub API action.', 404);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'GitHub API failed.', 500);
  }
}

export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === 'poll-device') return json(await pollDeviceFlow(String(body.deviceCode || '')));
    if (body.action === 'disconnect') { await deleteStoredGitHubAuth(); return json({ ok: true }); }
    if (body.action === 'repos') {
      const token = await resolveGitHubToken();
      if (!token) return error('Connect GitHub before using the app.', 401);
      const clients = createGitHubClients(token);
      const response = await clients.rest.apps.listReposAccessibleToInstallation({ per_page: Number(body.first || 25), page: Number(body.page || 1) });
      return json({
        nodes: response.data.repositories.map((repo) => ({ id: String(repo.id), nameWithOwner: repo.full_name, name: repo.name, description: repo.description, isPrivate: repo.private, url: repo.html_url, owner: { login: repo.owner?.login ?? '' } })),
        pageInfo: { hasNextPage: Boolean(response.headers.link?.includes('rel="next"')), endCursor: String(Number(body.page || 1) + 1) },
      });
    }
    if (body.action === 'graphql') {
      const token = await resolveGitHubToken();
      if (!token) return error('Connect GitHub before using the app.', 401);
      const clients = createGitHubClients(token);
      return json(await clients.graphql(String(body.query || ''), body.variables ?? {}));
    }
    return error('Unknown GitHub API action.', 404);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'GitHub API failed.', 500);
  }
}
