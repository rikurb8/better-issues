export type GitHubThreadContext = {
  owner: string;
  repo: string;
  number: number;
  kind: 'issue' | 'pull';
  title: string;
  body?: string;
  labels?: string[];
  comments: Array<{ author?: string; body: string; createdAt?: string }>;
  extra?: Record<string, unknown>;
};

export type IssueReadinessStatus = 'needs-refinement' | 'needs-approval' | 'ready-for-agent';

export type IssueReadinessResult = {
  status: IssueReadinessStatus;
  summary: string;
  reasons: string[];
  recommendations?: string[];
};

export function formatThread(ctx: GitHubThreadContext) {
  return [`${ctx.kind.toUpperCase()} ${ctx.owner}/${ctx.repo}#${ctx.number}: ${ctx.title}`, ctx.body ?? '', 'Labels:', ...(ctx.labels ?? []).map((label) => `- ${label}`), 'Comments:', ...ctx.comments.map((c) => `- ${c.author ?? 'unknown'}: ${c.body}`)].join('\n\n');
}
