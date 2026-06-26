import { listAgentInvocations } from '../../server/agent-invocations/repository';

function json(data: unknown, init?: ResponseInit) { return Response.json(data, init); }
function error(message: string, status = 400) { return json({ error: message }, { status }); }

export async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? '100');
    const invocations = await listAgentInvocations(Number.isFinite(limit) ? limit : 100);
    return json({ invocations });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load agent activity.';
    return error(message, message.includes('DATABASE_URL') ? 500 : 400);
  }
}
