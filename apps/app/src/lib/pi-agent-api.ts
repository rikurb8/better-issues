import type { IssueReadinessResult } from '../server/pi-agent/actions/types';

export type AnalyzeIssueReadinessInput = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body?: string | null;
  labels?: string[];
  comments?: Array<{ author?: string; body: string; createdAt?: string }>;
};

export type AnalyzeIssueReadinessResponse = {
  result: IssueReadinessResult;
  commentUrl?: string | null;
};

export async function analyzeIssueReadiness(input: AnalyzeIssueReadinessInput): Promise<AnalyzeIssueReadinessResponse> {
  const response = await fetch('/api/pi-agent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'analyze-issue-readiness', ...input }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Failed to analyze issue readiness.');
  return payload as AnalyzeIssueReadinessResponse;
}
