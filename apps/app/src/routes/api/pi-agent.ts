import { createAgentInvocation } from '../../server/agent-invocations/repository';
import { resolveGitHubToken } from '../../server/github/auth';
import { GitHubService } from '../../server/github/service';
import { analyzeIssueReadiness, formatIssueReadinessComment } from '../../server/pi-agent/actions/analyze-issue-readiness.action';
import type { GitHubThreadContext } from '../../server/pi-agent/actions/types';
import { EnvPiAgentClient } from '../../server/pi-agent/client';

function json(data: unknown, init?: ResponseInit) { return Response.json(data, init); }
function error(message: string, status = 400) { return json({ error: message }, { status }); }

function requiredString(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing required field: ${name}`);
  return value;
}

function buildContext(body: Record<string, unknown>): GitHubThreadContext {
  const number = Number(body.number);
  if (!Number.isInteger(number) || number <= 0) throw new Error('Missing required field: number');
  return {
    owner: requiredString(body.owner, 'owner'),
    repo: requiredString(body.repo, 'repo'),
    number,
    kind: 'issue',
    title: requiredString(body.title, 'title'),
    body: typeof body.body === 'string' ? body.body : '',
    labels: Array.isArray(body.labels) ? body.labels.filter((label): label is string => typeof label === 'string') : [],
    comments: Array.isArray(body.comments)
      ? body.comments.map((comment) => ({
          author: typeof comment?.author === 'string' ? comment.author : undefined,
          body: typeof comment?.body === 'string' ? comment.body : '',
          createdAt: typeof comment?.createdAt === 'string' ? comment.createdAt : undefined,
        })).filter((comment) => comment.body.trim())
      : [],
  };
}

export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action !== 'analyze-issue-readiness') return error('Unknown Pi Agent API action.', 404);
    const token = await resolveGitHubToken();
    if (!token) return error('Connect GitHub before posting Pi Agent analysis.', 401);

    const ctx = buildContext(body);
    const result = await analyzeIssueReadiness(new EnvPiAgentClient(), ctx);
    const commentBody = formatIssueReadinessComment(result);
    const comment = await new GitHubService(token).createComment(ctx.owner, ctx.repo, ctx.number, commentBody);
    const commentUrl = comment.data.html_url ?? null;
    await createAgentInvocation({
      agent: 'pi',
      action: 'analyze-issue-readiness',
      workflow: 'Analyze issue readiness',
      status: 'succeeded',
      target: { kind: 'issue', owner: ctx.owner, repo: ctx.repo, number: ctx.number, title: ctx.title },
      summary: result.summary,
      resultLabel: result.status,
      commentUrl,
      details: { reasons: result.reasons, recommendations: result.recommendations },
    });

    return json({ result, commentUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pi Agent API failed.';
    try {
      const ctx = body && typeof body === 'object' ? buildContext(body) : null;
      if (ctx) await createAgentInvocation({
        agent: 'pi',
        action: 'analyze-issue-readiness',
        workflow: 'Analyze issue readiness',
        status: 'failed',
        target: { kind: 'issue', owner: ctx.owner, repo: ctx.repo, number: ctx.number, title: ctx.title },
        summary: message,
      });
    } catch {}
    const status = message.includes('OPENROUTER_API_KEY') || message.includes('DATABASE_URL') ? 500 : 400;
    return error(message, status);
  }
}
