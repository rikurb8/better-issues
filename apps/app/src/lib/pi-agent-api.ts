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

export type SkillMetadata = {
  name: string;
  description: string;
  disableModelInvocation: boolean;
  filePath: string;
};

export type SkillDiagnostic = {
  code: string;
  message: string;
  path: string;
};

export type ListSkillsResponse = {
  skills: SkillMetadata[];
  diagnostics: SkillDiagnostic[];
};

export type RunSkillInput = AnalyzeIssueReadinessInput & {
  skill: string;
  instructions?: string;
  postComment?: boolean;
};

export type RunSkillResponse = {
  skill: SkillMetadata;
  text: string;
  diagnostics: SkillDiagnostic[];
  commentUrl?: string | null;
};

async function postPiAgent<T>(payload: Record<string, unknown>, fallbackError: string): Promise<T> {
  const response = await fetch('/api/pi-agent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? fallbackError);
  return data as T;
}

export async function analyzeIssueReadiness(input: AnalyzeIssueReadinessInput): Promise<AnalyzeIssueReadinessResponse> {
  return postPiAgent<AnalyzeIssueReadinessResponse>({ action: 'analyze-issue-readiness', ...input }, 'Failed to analyze issue readiness.');
}

export async function listSkills(): Promise<ListSkillsResponse> {
  return postPiAgent<ListSkillsResponse>({ action: 'list-skills' }, 'Failed to list skills.');
}

export async function runSkill(input: RunSkillInput): Promise<RunSkillResponse> {
  return postPiAgent<RunSkillResponse>({ action: 'run-skill', ...input }, 'Failed to run skill.');
}
