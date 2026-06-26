import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import {
  AgentHarness,
  InMemorySessionRepo,
  NodeExecutionEnv,
  loadSkills,
  type Skill,
  type SkillDiagnostic,
} from '@earendil-works/pi-agent-core/node';
import { assistantText, createOpenRouterModels, resolvePiAgentModelId } from './client';
import { formatThread, type GitHubThreadContext } from './actions/types';

export type SkillMetadata = {
  name: string;
  description: string;
  disableModelInvocation: boolean;
  filePath: string;
};

export type SkillDiagnosticDto = {
  code: SkillDiagnostic['code'];
  message: string;
  path: string;
};

export type SkillsConfig = {
  /** Absolute directory containing skill subfolders (e.g. `triage/SKILL.md`). */
  skillsPath: string;
  /** Working directory used to resolve relative references inside skills. */
  cwd: string;
};

const SYSTEM_PROMPT = 'You run repository skills against GitHub issue context and return markdown.';

function looksLikeSkillsDir(candidate: string) {
  if (!existsSync(candidate)) return false;
  try {
    return readdirSync(candidate).some((entry) => {
      const child = join(candidate, entry);
      return statSync(child).isDirectory() && existsSync(join(child, 'SKILL.md'));
    });
  } catch {
    return false;
  }
}

/**
 * Resolve the skills directory and execution cwd.
 *
 * Honors `PI_AGENT_SKILLS_PATH` when set, otherwise walks up from the process
 * working directory looking for a `skills/` directory that contains at least one
 * skill (the repo-root `skills/` is the default development source).
 */
export function resolveSkillsConfig(): SkillsConfig {
  const configured = process.env.PI_AGENT_SKILLS_PATH;
  if (configured) {
    const skillsPath = isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
    return { skillsPath, cwd: dirname(skillsPath) };
  }

  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, 'skills');
    if (looksLikeSkillsDir(candidate)) return { skillsPath: candidate, cwd: dir };
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fall back to <cwd>/skills even if empty/missing; loadSkills skips missing dirs.
  return { skillsPath: join(process.cwd(), 'skills'), cwd: process.cwd() };
}

function toMetadata(skill: Skill): SkillMetadata {
  return {
    name: skill.name,
    description: skill.description,
    disableModelInvocation: skill.disableModelInvocation ?? false,
    filePath: skill.filePath,
  };
}

function toDiagnosticDto(diagnostic: SkillDiagnostic): SkillDiagnosticDto {
  return { code: diagnostic.code, message: diagnostic.message, path: diagnostic.path };
}

async function loadSkillsFromConfig(config: SkillsConfig) {
  const env = new NodeExecutionEnv({ cwd: config.cwd });
  const { skills, diagnostics } = await loadSkills(env, config.skillsPath);
  return { env, skills, diagnostics };
}

export async function listSkills(config = resolveSkillsConfig()): Promise<{ skills: SkillMetadata[]; diagnostics: SkillDiagnosticDto[] }> {
  const { skills, diagnostics } = await loadSkillsFromConfig(config);
  return { skills: skills.map(toMetadata), diagnostics: diagnostics.map(toDiagnosticDto) };
}

/** Build the explicit skill invocation prompt from issue context and optional user instruction. */
export function buildSkillInvocationPrompt(ctx: GitHubThreadContext, instructions?: string): string {
  const parts = [
    'Run this skill against the following GitHub issue context and return markdown.',
    formatThread(ctx),
  ];
  const trimmed = instructions?.trim();
  if (trimmed) parts.push(`Additional instructions from the user:\n${trimmed}`);
  return parts.join('\n\n');
}

export type RunSkillResult = {
  skill: SkillMetadata;
  text: string;
  diagnostics: SkillDiagnosticDto[];
};

/**
 * Explicitly invoke a skill by name through the Pi agent harness.
 *
 * Explicit invocation works even when the skill has `disable-model-invocation`;
 * that flag only hides the skill from spontaneous model discovery.
 */
export async function runSkill(options: {
  skillName: string;
  ctx: GitHubThreadContext;
  instructions?: string;
  apiKey?: string;
  modelId?: string;
  config?: SkillsConfig;
}): Promise<RunSkillResult> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required to run skills.');

  const config = options.config ?? resolveSkillsConfig();
  const { env, skills, diagnostics } = await loadSkillsFromConfig(config);
  const skill = skills.find((item) => item.name === options.skillName);
  if (!skill) throw new Error(`Unknown skill: ${options.skillName}`);

  const modelId = resolvePiAgentModelId(options.modelId);
  const { models, model } = await createOpenRouterModels(apiKey, modelId);

  const session = await new InMemorySessionRepo().create({});
  const harness = new AgentHarness({
    env,
    session,
    models,
    model,
    resources: { skills },
    systemPrompt: SYSTEM_PROMPT,
  });

  const message = await harness.skill(skill.name, buildSkillInvocationPrompt(options.ctx, options.instructions));
  const text = assistantText(message).trim();
  if (!text) throw new Error('Skill run returned an empty response.');

  return { skill: toMetadata(skill), text, diagnostics: diagnostics.map(toDiagnosticDto) };
}
