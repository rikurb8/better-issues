import { createAgentInvocation } from '../../server/agent-invocations/repository';
import { resolveGitHubToken } from '../../server/github/auth';
import { GitHubService } from '../../server/github/service';
import { analyzeIssueReadiness, formatIssueReadinessComment } from '../../server/pi-agent/actions/analyze-issue-readiness.action';
import type { GitHubThreadContext } from '../../server/pi-agent/actions/types';
import { EnvPiAgentClient } from '../../server/pi-agent/client';
import { listSkills, runSkill } from '../../server/pi-agent/skills';

function json(data: unknown, init?: ResponseInit) { return Response.json(data, init); }
function error(message: string, status = 400) { return json({ error: message }, { status }); }

function errorStatus(message: string) {
  return message.includes('OPENROUTER_API_KEY') || message.includes('DATABASE_URL') ? 500 : 400;
}

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

async function handleAnalyzeIssueReadiness(body: Record<string, unknown>) {
  const token = await resolveGitHubToken();
  if (!token) return error('Connect GitHub before posting Pi Agent analysis.', 401);

  const ctx = buildContext(body);
  try {
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
    await createAgentInvocation({
      agent: 'pi',
      action: 'analyze-issue-readiness',
      workflow: 'Analyze issue readiness',
      status: 'failed',
      target: { kind: 'issue', owner: ctx.owner, repo: ctx.repo, number: ctx.number, title: ctx.title },
      summary: message,
    }).catch(() => {});
    return error(message, errorStatus(message));
  }
}

async function handleListSkills() {
  try {
    const { skills, diagnostics } = await listSkills();
    return json({ skills, diagnostics });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list skills.';
    return error(message, errorStatus(message));
  }
}

async function handleRunSkill(body: Record<string, unknown>) {
  const skillName = requiredString(body.skill, 'skill');
  const ctx = buildContext(body);
  const instructions = typeof body.instructions === 'string' ? body.instructions : undefined;
  const postComment = body.postComment === true;
  const action = `run-skill:${skillName}`;
  const workflow = `Run skill: ${skillName}`;

  let token: string | undefined;
  if (postComment) {
    token = (await resolveGitHubToken()) ?? undefined;
    if (!token) return error('Connect GitHub before posting skill output as a comment.', 401);
  }

  try {
    const result = await runSkill({ skillName, ctx, instructions });
    let commentUrl: string | null = null;
    if (postComment && token) {
      const comment = await new GitHubService(token).createComment(ctx.owner, ctx.repo, ctx.number, result.text);
      commentUrl = comment.data.html_url ?? null;
    }
    await createAgentInvocation({
      agent: 'pi',
      action,
      workflow,
      status: 'succeeded',
      target: { kind: 'issue', owner: ctx.owner, repo: ctx.repo, number: ctx.number, title: ctx.title },
      summary: `Ran skill "${skillName}" on ${ctx.owner}/${ctx.repo}#${ctx.number}.`,
      resultLabel: skillName,
      commentUrl,
      details: { instructions: instructions ?? null, diagnostics: result.diagnostics },
    });
    return json({ skill: result.skill, text: result.text, diagnostics: result.diagnostics, commentUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to run skill.';
    await createAgentInvocation({
      agent: 'pi',
      action,
      workflow,
      status: 'failed',
      target: { kind: 'issue', owner: ctx.owner, repo: ctx.repo, number: ctx.number, title: ctx.title },
      summary: message,
      resultLabel: skillName,
    }).catch(() => {});
    return error(message, errorStatus(message));
  }
}

export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => ({}));
  try {
    switch (body.action) {
      case 'analyze-issue-readiness':
        return await handleAnalyzeIssueReadiness(body);
      case 'list-skills':
        return await handleListSkills();
      case 'run-skill':
        return await handleRunSkill(body);
      default:
        return error('Unknown Pi Agent API action.', 404);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pi Agent API failed.';
    return error(message, errorStatus(message));
  }
}
