import assert from 'node:assert/strict';
import { buildSkillInvocationPrompt, listSkills, resolveSkillsConfig } from './skills';
import type { GitHubThreadContext } from './actions/types';

// Lightweight checks for skill loading and prompt formatting. No LLM call.

async function main() {
  const config = resolveSkillsConfig();
  console.log(`Skills path: ${config.skillsPath}`);

  const { skills, diagnostics } = await listSkills(config);
  console.log(`Loaded ${skills.length} skill(s): ${skills.map((skill) => skill.name).join(', ') || '(none)'}`);
  if (diagnostics.length) console.log('Diagnostics:', diagnostics);

  const triage = skills.find((skill) => skill.name === 'triage');
  assert.ok(triage, 'expected the "triage" skill to load from the configured skills path');
  assert.equal(triage.disableModelInvocation, true, 'triage skill should have disable-model-invocation set');
  assert.equal(diagnostics.length, 0, 'expected no skill load diagnostics');

  const ctx: GitHubThreadContext = {
    owner: 'example', repo: 'repo', number: 7, kind: 'issue', title: 'Run skills through the Pi Agent SDK',
    body: 'Body text.', labels: ['enhancement'],
    comments: [{ author: 'human', body: 'Please triage.' }],
  };

  const prompt = buildSkillInvocationPrompt(ctx, 'Focus on acceptance criteria.');
  assert.ok(prompt.includes('example/repo#7'), 'prompt should embed issue context');
  assert.ok(prompt.includes('Focus on acceptance criteria.'), 'prompt should embed user instructions');

  const promptNoInstructions = buildSkillInvocationPrompt(ctx);
  assert.ok(!promptNoInstructions.includes('Additional instructions'), 'prompt should omit instructions block when none given');

  console.log('skills.test.ts passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
