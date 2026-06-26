# Plan: Two Planning/Issue-Focused Pi Agent Features

## Context

The app is a SolidStart GitHub work hub with a Pi Agent integration. It currently supports issue readiness analysis from the issue page, posts a GitHub comment, and records local/server agent activity.

Initial idea: add two high-value Pi Agent workflows that help move issues from discussion to execution.

## Approach

Recommended feature set to confirm with the user:

1. **Generate implementation plan for an issue** — from an issue page, run Pi Agent to produce a structured plan with scope, likely files, implementation steps, risks, acceptance criteria, and tests; optionally post it as a GitHub comment and record it in Agent Activity.
2. **Find/cluster related issues for planning** — from a repo page or issue page, identify related open issues/duplicates/blockers by title, labels, and recent comments so users can avoid fragmented planning and link relevant work.

## Files to modify

Likely files, pending deeper exploration:

- `apps/app/src/routes/issue.tsx` — add issue-level actions and result panels.
- `apps/app/src/routes/repo.tsx` — likely home for repo-wide related/planning workflow.
- `apps/app/src/routes/api/pi-agent.ts` — route additional Pi Agent actions.
- `apps/app/src/lib/pi-agent-api.ts` — client helpers/types for new workflows.
- `apps/app/src/server/pi-agent/actions/plan-implementation.action.ts` — reuse/extend existing action.
- `apps/app/src/server/pi-agent/actions/*` — add related-issues planning action if needed.
- `apps/app/src/server/github/service.ts` and/or `queries.ts` — reuse existing GitHub issue/comment fetching; add repo issue search if missing.
- Tests under `apps/app` and/or `tests` after locating current test patterns.

## Reuse

Discovered reusable pieces:

- `GitHubThreadContext` and `formatThread` in `apps/app/src/server/pi-agent/actions/types.ts` for consistent issue context.
- Existing `planImplementation` action in `apps/app/src/server/pi-agent/actions/plan-implementation.action.ts` already creates implementation plans from thread context.
- Existing readiness API path in `apps/app/src/routes/api/pi-agent.ts` shows how to validate inputs, run Pi Agent, post GitHub comments via `GitHubService.createComment`, and persist agent invocations.
- Existing issue page flow in `apps/app/src/routes/issue.tsx` shows how to collect title/body/labels/comments, call client API, show a panel, and record browser-local fallback activity.
- Existing agent activity page in `apps/app/src/routes/agent.tsx` can display new workflow runs without major structural change if invocations use existing fields.

## Steps

- [ ] Confirm the exact two features and posting behavior with the user.
- [ ] Explore repo page, GitHub service/query helpers, and tests for implementation patterns.
- [ ] Define result types and parsers for both features.
- [ ] Add server action(s), API handling, and client API helpers.
- [ ] Add UI buttons/result panels in the selected pages.
- [ ] Record invocations consistently in server DB and browser fallback.
- [ ] Add tests for parsing/API behavior and manual verification steps.

## Verification

- Run `pnpm lint`.
- Run `pnpm test`.
- Manually connect GitHub, open an issue, run the new planning workflow(s), verify result panel and GitHub comment.
- Open Agent Activity and verify successful/failed runs are listed.
