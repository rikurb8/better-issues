# MVP Plan: SolidStart GitHub Work Hub

## Context

Build an open-source, Docker Compose-friendly app for an agentic developer managing coding-agent work through GitHub issues, pull requests, and comments.

Product vibe: **Linear meets GitHub Lite**. The app should feel fast, minimal, full-width, keyboard-friendly, and workflow-oriented like Linear, while using GitHub as the durable source of truth for repositories, issues, PRs, comments, labels, and agent coordination state.

Important decisions:

- App framework: **SolidStart full-stack app** using https://docs.solidjs.com/solid-start/getting-started.
- Design system/component approach: **custom Tailwind CSS design system + Kobalte headless Solid primitives**.
  - Rationale: best fit for a polished Linear-like product because Kobalte provides accessible Solid-native primitives without forcing a visual style, while Tailwind/CSS variables let us build a distinctive minimal GitHub Lite interface.
  - Use Kobalte for dialogs, dropdowns, menus, comboboxes, tabs, tooltips, popovers, select, and command-style interactions.
  - Use `lucide-solid` for icons and a small internal component layer for buttons, cards, timeline items, labels, inputs, modals, and list rows.
  - Avoid a heavy prebuilt visual component library for MVP because it will fight the desired Linear x GitHub Lite aesthetic.
- Backend/server layer: SolidStart server functions/API routes, not NestJS.
- GitHub client: **Octokit via https://github.com/octokit/octokit.js** with GitHub GraphQL as the primary data access path; REST only for operations that are missing, awkward, or more reliable through REST.
- Auth: no separate app auth. Locally paste a fine-grained GitHub token first; OAuth Device Flow can be added later.
- Storage: no PostgreSQL in MVP. Use SQLite/local cache only for selected repos, UI preferences, Pi job status/logs, and recomputable summaries.
- Durable backend: GitHub.
- Pi Agent: call Pi SDK for read/analyze/respond actions and post useful results back to GitHub.
- Non-goals for MVP: code browsing, code diffs, full GitHub clone, GitHub App install flow, multi-user SaaS auth, autonomous code-writing jobs.

---

## Issue 1 — Project Foundation, Docker Compose, GitHub Connection, and Octokit GraphQL Layer

### What is being done

Create the SolidStart full-stack app foundation and GitHub data layer. The user can run the project locally, connect GitHub with a token, fetch visible repositories, select repos, and read/write GitHub issue/PR data through SolidStart server functions backed by Octokit GraphQL.

### How

- Create a simplified full-stack structure:
  - `apps/app` — SolidStart app containing UI, routes, server functions, and API endpoints.
  - `packages/shared` — shared TypeScript types/schemas only if needed.
- Add `docker-compose.yml` for local development.
- Add `.env.example` documenting GitHub token and Pi SDK environment variables.
- Implement local session handling:
  - paste fine-grained GitHub token in setup UI.
  - store token only for local running instance.
  - logout clears token/session/local cache.
- Implement Octokit GitHub services for SolidStart server functions:
  - create authenticated Octokit client from current token.
  - use GitHub GraphQL first for viewer identity, repository lists, issue/PR lists, issue/PR detail, comments, labels, assignees, review state, and combined timeline-style reads.
  - use REST fallback only for operations where GitHub REST is more complete or simpler, such as some review comments/check endpoints/comment mutations if needed.
  - create issues.
  - edit issue title/body/state/labels/assignees where permitted.
  - create/edit issue or PR comments where permitted.
  - handle GraphQL pagination/cursors, Octokit errors, rate limits, permission errors, and GitHub API failures consistently.
- Use optional SQLite/local cache for:
  - selected repo IDs.
  - lightweight preferences.
  - recent GraphQL snapshots if useful.
  - Pi job logs/status in Issue 3.

### Main files/directories

- `package.json`
- `pnpm-workspace.yaml`
- `docker-compose.yml`
- `.env.example`
- `apps/app/`
- `apps/app/src/routes/`
- `apps/app/src/server/github/`
- `apps/app/src/server/auth/`
- `apps/app/src/server/repos/`
- `apps/app/src/server/issues/`
- `apps/app/src/server/pulls/`
- `apps/app/src/server/db/` if SQLite/cache is used
- `packages/shared/`

### Validation / done when

- `docker compose up` starts the SolidStart app locally.
- User can paste a GitHub token and see connected GitHub identity.
- User can fetch visible user/org repos through Octokit.
- User can select repos and refresh them after reload.
- SolidStart server functions can list repo issues and PRs through Octokit GraphQL.
- SolidStart server functions can fetch issue detail, comments, PR detail, PR comments/review comments, and checks summary.
- SolidStart server functions can create an issue and post/edit a comment, verified on GitHub.
- Permission/rate-limit errors are readable in the UI/server response.

---

## Issue 2 — Linear Meets GitHub Lite UI: Repos, Issue/PR Lists, Comments, and Markdown Reader

### What is being done

Build the core UI/UX: a polished, minimal GitHub Lite interface with Linear-like speed and clarity. The user can browse repositories, view issue/PR lists, read long issue/PR discussions, render markdown close to GitHub, and take common actions without code diffs.

### How

- Build primary routes:
  - `/setup` — paste GitHub token, verify connection.
  - `/repos` — fetch/search/filter/select repos.
  - `/inbox` — unified issue/PR conversation inbox across selected repos.
  - `/r/:owner/:repo` — repo overview.
  - `/r/:owner/:repo/issues` — repo issue list.
  - `/r/:owner/:repo/pulls` — repo PR list.
  - `/r/:owner/:repo/issues/:number` — issue reader.
  - `/r/:owner/:repo/pulls/:number` — PR conversation reader, no diff viewer.
  - `/settings` — token/session, label conventions, Pi SDK config notes.
- Build list UX:
  - Linear-like dense rows.
  - filters for open/closed, labels, assignee, author, updated, agent status, attention flags.
  - show repo, number, title, labels, comment count, updated time, PR/issue state.
- Build issue detail reader:
  - full-width responsive layout.
  - sticky header with title, repo/number, state, labels, assignees, quick actions.
  - body as first timeline card.
  - chronological comments with author, timestamp, edited state.
  - bottom composer for new comments.
  - edit issue/comment where GitHub permits.
- Build PR detail reader:
  - same conversation-first layout.
  - show source/target branch, review state, merge/check summary.
  - show PR conversation comments and review comments where feasible.
  - link out to GitHub for files/diffs instead of rendering diffs.
- Markdown rendering:
  - GitHub Flavored Markdown with tables, task lists, autolinks, mentions, issue refs, blockquotes, images, and code fences.
  - sanitized HTML/output.
  - syntax highlighting.
  - GitHub-like typography, spacing, tables, code blocks, and task lists.
  - raw markdown edit mode with preview before posting.
- Keep UI scope focused:
  - one excellent light theme first.
  - dark mode later unless cheap from styling system.
  - no code browser/diff viewer.

### Main files/directories

- `apps/app/src/routes/`
- `apps/app/src/features/repos/`
- `apps/app/src/features/issues/`
- `apps/app/src/features/pulls/`
- `apps/app/src/features/inbox/`
- `apps/app/src/components/markdown/`
- `apps/app/src/components/layout/`
- `apps/app/src/components/ui/` — internal Tailwind + Kobalte-based design system primitives
- `apps/app/src/lib/api/` or SolidStart server-function clients
- `packages/shared/`

### Reuse / libraries

- SolidStart full-stack framework.
- TanStack Query/Solid Query or equivalent for client fetching/cache.
- GitHub Flavored Markdown stack such as `remark-gfm`, `rehype-sanitize`, syntax highlighting, and GitHub-like markdown CSS/prose styles.
- Tailwind CSS as the styling/design-token layer.
- Kobalte as the Solid-native accessible headless component primitive library.
- `lucide-solid` for icons.
- Optional `@tanstack/virtual` for long issue/PR lists if needed.

### Validation / done when

- Repo picker fetches real GitHub repos and supports search/filter/select.
- Issue list and PR list load for selected repos.
- Issue detail renders body/comments in readable GitHub-like markdown.
- PR detail renders conversation comments, review comments, and check summary without code diffs.
- Markdown examples render correctly: tables, task lists, code fences, links, mentions, issue references, images, blockquotes.
- User can create issue comments from UI and see them on GitHub.
- UI feels full-width, minimal, readable, and not like a noisy GitHub clone.
- Loading, empty, permission, token, and rate-limit states are clear.

---

## Issue 3 — Pi SDK Actions: Summarize, Draft Reply, Triage, Review PR, Plan Implementation

### What is being done

Add Pi Agent as the first built-in agent. The app reads GitHub issue/PR context, calls the Pi SDK for explicit user-triggered actions, and posts useful results back to GitHub. These action implementations should be idiomatic, commented, and runnable as examples for maintainers.

### How

- Add Pi Agent server modules/functions inside the SolidStart app.
- Hide SDK details behind `PiAgentClient` so the app is not tightly coupled to one SDK shape.
- During implementation, confirm exact Pi SDK package/import, auth method, env vars, and input/output contract from Pi SDK docs/examples.
- Add local `PiJob` records/logs for observability:
  - target repo/issue/PR.
  - action type.
  - status: queued/running/succeeded/failed/cancelled.
  - logs/errors.
  - posted GitHub comment URL/id.
- Gather normalized GitHub context before each Pi call:
  - issue/PR title, body, labels, assignees, state.
  - recent comments and timeline-like context.
  - for PRs: changed files summary/checks summary/review comments where feasible; no full diff UI.
- Implement commented action files that double as runnable examples:
  - `summarize-thread.action.ts`
  - `draft-reply.action.ts`
  - `answer-latest-question.action.ts`
  - `triage-issue.action.ts`
  - `review-pr.action.ts`
  - `plan-implementation.action.ts`
- Add a small dev runner/CLI script for example actions against a test issue/PR.
- Add UI action bar on issue/PR detail pages:
  - Summarize thread.
  - Draft reply.
  - Answer latest question.
  - Triage issue.
  - Review PR.
  - Plan implementation.
- Posting policy:
  - `draft reply` opens editable preview before posting.
  - summarize/triage/review/plan can use “run and post” after explicit click.
- Use GitHub-native conventions for durable agent state:
  - labels like `agent:pi`.
  - labels like `agent-status:queued`, `agent-status:in-progress`, `agent-status:review`, `agent-status:blocked`, `needs-human`.
  - structured comments for Pi Agent outputs.

### Initial Pi actions

- `Summarize thread`
  - Input: issue/PR body and comments.
  - Output posted to GitHub: concise status, decisions, blockers, next actions.
- `Draft reply`
  - Input: selected/latest comments plus user instruction.
  - Output: proposed GitHub comment; user edits/approves before posting.
- `Answer latest question`
  - Input: issue/PR context plus latest unanswered human comment.
  - Output posted to GitHub: direct answer with assumptions and next steps.
- `Triage issue`
  - Input: issue title/body/comments.
  - Output posted to GitHub: classification, suggested labels, missing information, proposed next step.
- `Review PR`
  - Input: PR body, comments, review comments, checks summary, changed files summary.
  - Output posted to GitHub: review summary, risks, test suggestions, requested changes.
- `Plan implementation`
  - Input: issue body/comments and repo context summary.
  - Output posted to GitHub: implementation plan, likely files touched, acceptance criteria, test plan.

### Deferred Pi jobs

Defer code-writing jobs until runner sandboxing, checkout credentials, cancellation, logs, and security boundaries are designed:

- Implement issue.
- Fix failing PR checks.
- Apply review feedback.
- Push branches/open PRs.

### Main files/directories

- `apps/app/src/server/pi-agent/`
- `apps/app/src/server/pi-agent/actions/*.action.ts`
- `apps/app/src/server/jobs/`
- `apps/app/src/server/github/` context helpers reused from Issue 1
- `apps/app/src/features/pi-agent/`
- `apps/app/src/features/issues/IssuePiActionBar.tsx`
- `apps/app/src/features/pulls/PullPiActionBar.tsx`},{
- `.env.example`

### Validation / done when

- Pi SDK credentials/config can be supplied locally through environment variables.
- Each action has a typed, commented implementation and can run through the app.
- At least one dev/example runner can execute an action against a test GitHub issue/PR.
- `Summarize thread` posts a useful comment to GitHub.
- `Draft reply` produces an editable preview and posts after approval.
- `Triage issue` can suggest/post labels/comments and handles missing context gracefully.
- `Review PR` posts a PR review-style summary/comment without rendering code diffs in the UI.
- Pi SDK failures/timeouts are visible in job status and do not corrupt GitHub state.

---

## Overall Verification

- Run server-side tests for Octokit GraphQL services and Pi action payload builders.
- Run frontend route/component tests for repo picker, lists, markdown renderer, issue reader, PR reader, and Pi action bar.
- Manually run the full Docker Compose flow against a test GitHub repo.
- Verify all durable user-visible actions appear in GitHub.
- Verify logout clears local session/token/cache while GitHub issues/comments remain intact.
- Verify the MVP feels like a focused Linear x GitHub Lite workflow hub, not a broad GitHub clone.
