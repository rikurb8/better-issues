# MVP Plan: SolidJS + NestJS GitHub Work Hub

## Context

The repository is currently empty. The goal is to plan an open-source MVP for a SolidJS frontend and NestJS backend that uses GitHub as the source of truth for repositories, issues, pull requests, comments, and related workflow data. All GitHub API implementation should use Octokit, specifically https://github.com/octokit/octokit.js as the foundation for REST/GraphQL access, auth, pagination, and errors.

The product direction is **Linear meets GitHub Lite** for an agentic developer who manages coding-agent work through GitHub issues, pull requests, and comments. The app should feel fast, keyboard-friendly, minimal, and workflow-oriented like Linear, while preserving the familiar GitHub issue/PR data model. It should make it easy to discourse with AI agents, assign work, review outcomes, and keep GitHub as the operational source of truth.

## Approach

Recommended MVP direction:

- Build a Docker Compose-friendly monorepo with separate apps for:
  - SolidJS web client as a Vite SPA for the simplest high-quality UI shell.
  - NestJS API server.
  - SQLite file/volume for local ephemeral cache/jobs/preferences only if needed; avoid PostgreSQL for MVP because GitHub is the durable backend.
- Use a local-only GitHub credential flow rather than separate app auth.
  - No separate user accounts, orgs, passwords, or app ownership model.
  - Whoever connects to GitHub in the local app session owns the current running instance.
  - Logout clears local session/credential/cache state.
- Recommended MVP credential options:
  - Primary and first implementation: paste a GitHub fine-grained personal access token for fastest Docker Compose/self-hosted setup.
  - Follow-up polish: GitHub OAuth Device Flow for “Login with GitHub” without building separate auth.
  - Defer OAuth web flow and GitHub App installation flow until webhooks, org-scale permissions, or multi-user hosted deployment become important.
- Treat GitHub as the source of truth for all durable actions/state:
  - repositories
  - issues
  - pull requests
  - issue/PR comments
  - labels, milestones, assignees, issue state
  - agent assignment/status conventions represented through labels/comments/issue body sections where possible
- Keep local storage ephemeral and convenience-oriented only:
  - active GitHub credential/session
  - selected repositories and filters
  - Pi SDK credentials/configuration for the local instance
  - short-lived Pi job records/logs for observability, retry, and cancellation
  - optional local cache for API responsiveness/rate limits
  - optional temporary summaries/attention flags that can be recomputed
- Focus the first MVP on creating, reading, editing, discussing, coordinating issue/PR work, and invoking Pi SDK actions that read GitHub context and post results back to GitHub.
- Make the UI feel like **Linear meets GitHub Lite**:
  - fast command-center style workflow for repo/issue/PR navigation
  - clean, minimal, full-width issue/PR reader
  - repository picker
  - issue/PR lists with Linear-like density, keyboard shortcuts, quick filters, and clear status/priority signals
  - issue comments
  - PR conversation/review comments/check summary
  - GitHub-like markdown rendering
  - no source-code browsing or code diff viewer in the first pass

## Outside Review and Simplification Decisions

To keep quality high without overbuilding, the MVP should be **smaller in backend surface area and more intentional in UX**:

- Do **not** build a full GitHub clone. Build the best issue/PR conversation cockpit for agentic work.
- Do **not** start with PostgreSQL, multi-user auth, GitHub App installs, code browsing, or diff rendering.
- Use GitHub as the durable backend and SQLite/local cache only for fast UI state, selected repos, and Pi job observability.
- Start with pasted fine-grained GitHub token; add OAuth Device Flow after the core experience feels excellent.
- Prefer Octokit REST endpoints first; use GraphQL only when it materially simplifies a combined view.
- Keep Pi SDK scope to read/analyze/respond jobs first; defer repo checkout/code-writing jobs.
- Invest UI effort in a few polished surfaces:
  - repo picker
  - unified inbox
  - repo issue/PR lists
  - issue/PR reader
  - markdown renderer
  - Pi action bar/job result flow
- The product quality bar should come from speed, clarity, keyboard navigation, typography, markdown fidelity, and low-friction Pi actions, not from feature breadth.

## MVP Scope Proposal

### Core user flows

- Connect GitHub using a pasted fine-grained token first; OAuth Device Flow can be added after the token path is solid.
- Select one or more repositories visible to the connected GitHub identity/token.
- View a unified issue/PR inbox across selected repositories.
- Filter and sort by repo, type, status, author, assignee, label, review state, agent, attention state, and updated time.
- Create new GitHub issues from the app.
- Open an issue/PR detail page optimized for reading long technical discussions:
  - full-width responsive layout with narrow metadata rail only where useful
  - sticky title/header with repo, number, state, labels, assignees, and actions
  - GitHub-like markdown rendered body
  - chronological issue comments
  - PR conversation comments, review summaries, and review comments where feasible
  - PR checks summary and merge/review status where feasible
  - labels/assignees/milestone
  - linked branch/PR references where available
  - local AI/agent summary and attention indicators
- Add and edit comments on issues/PRs where permissions allow.
- Edit issue fields such as title, body, state, labels, assignees, and milestone where permissions allow.
- Coordinate Pi Agent work using first-class UI actions backed by GitHub-native labels/comments and Pi SDK job execution.

### Agentic-workflow MVP concepts

Recommendation: make agents feel first-class in the UI, but store durable agent assignment/status in GitHub-native labels/comments so logout or local reset does not lose important workflow state.

- Agent registry:
  - initially bootstrapped from GitHub labels/comments and configurable in local settings
  - slug/display name/avatar color
  - agent type/provider/tool, starting with Pi Agent; keep generic support for Codex, Claude Code, Cursor, Devin, and custom bots later
  - capabilities/tags, e.g. frontend, backend, tests, docs, review
  - optional default instructions/working style
  - later can be persisted in a repository config issue/file if durable cross-device configuration is needed
- Agent work dashboard:
  - grouped by agent, status, repository, and attention state
  - shows assigned issues/PRs, stale work, blocked items, pending review, and needs-human items
- GitHub-native sync conventions:
  - assignment labels like `agent:pi` or `agent:<slug>`
  - status labels like `agent-status:queued`, `agent-status:in-progress`, `agent-status:blocked`, `agent-status:review`, `needs-human`
  - structured handoff comments posted to GitHub for transparency, e.g. Pi Agent assignment, handoff, summary, blocked, and review-request comments
- AI discourse panel on each issue/PR:
  - timeline of GitHub comments plus local summaries
  - composer for human-to-agent instructions that can be posted as GitHub comments
  - quick actions such as assign agent, request changes, mark blocked, ask for summary, and mark needs-human
- Slightly-above-MVP differentiator:
  - local “attention engine” that flags threads needing action using simple deterministic rules first, e.g. new agent comment, failed checks, stale PR, blocked label, mention/requested review, unresolved human question.

### Pi Agent SDK action runner

The MVP should include a lightweight Pi Agent runner. The app will read GitHub issue/PR context, call the Pi SDK for a selected action, then post the result back to GitHub as a comment and/or metadata update.

Recommended initial action model:

- User explicitly clicks an action in the issue/PR discourse panel.
- API creates a local `PiJob` record with target repo, issue/PR number, action type, prompt/instructions, and status.
- API gathers GitHub context:
  - issue/PR title, body, labels, assignees, state
  - recent comments and timeline events
  - for PRs: diff/changed files, checks summary, review comments where feasible
- API calls the Pi SDK with a structured payload.
- API posts Pi Agent's answer back to GitHub as a durable comment.
- API updates labels/status, e.g. `agent:pi`, `agent-status:review`, `agent-status:blocked`, `needs-human`, as appropriate.
- UI shows job progress/logs and links to the posted GitHub comment.

Initial Pi SDK jobs:

- `Summarize thread`
  - Input: issue/PR body and comments.
  - Output posted to GitHub: concise status, decisions, blockers, next actions.
- `Draft reply`
  - Input: selected comments plus user instruction.
  - Output: proposed GitHub comment; user can edit before posting or post directly if configured.
- `Answer latest question`
  - Input: issue/PR context plus the latest unanswered human comment.
  - Output posted to GitHub: a direct Pi Agent answer with caveats, assumptions, and next steps.
- `Triage issue`
  - Input: issue title/body/comments.
  - Output posted to GitHub: classification, suggested labels, missing information, proposed next step.
  - Optional metadata updates: add labels such as `needs-human`, `bug`, `enhancement`, `agent-status:queued`.
- `Review PR`
  - Input: PR body, comments, diff/changed files, checks summary.
  - Output posted to GitHub: review summary, risks, test suggestions, requested changes.
- `Plan implementation`
  - Input: issue body/comments and repo context summary.
  - Output posted to GitHub: implementation plan, files likely touched, acceptance criteria, test plan.

Above-MVP/follow-up Pi jobs:

- `Implement issue`: Pi Agent creates branch, changes code, opens/updates PR.
- `Fix failing PR checks`: Pi Agent reads CI output, patches branch, comments with changes.
- `Apply review feedback`: Pi Agent updates PR branch based on comments.

MVP recommendation: include Pi SDK calls for read/analyze/respond actions first. Defer code-writing jobs until runner sandboxing, checkout credentials, job cancellation, logs, and security boundaries are designed.

Pi SDK implementation style:

- Wrap the Pi SDK behind a small `PiAgentClient` interface so examples remain runnable and the rest of the app does not depend directly on SDK details.
- Provide idiomatic, commented action files such as:
  - `summarize-thread.action.ts`
  - `draft-reply.action.ts`
  - `triage-issue.action.ts`
  - `review-pr.action.ts`
  - `plan-implementation.action.ts`
  - `answer-latest-question.action.ts`
- Each action file should double as a readable example:
  - clearly typed input payload
  - GitHub context normalization
  - Pi SDK call
  - response validation/normalization
  - GitHub comment body formatting
  - errors/timeouts surfaced to the UI and optionally commented back to GitHub only when useful
- Include a minimal CLI/dev runner or script for each example action so maintainers can run it against a test issue/PR without opening the UI.

### Explicit non-goals for initial MVP

- Replacing GitHub code browsing.
- Full project management suite.
- Full CI/CD dashboard.
- Full autonomous code-writing Pi jobs in the first release.
- Reimplementing every GitHub issue/PR operation.
- Full GitHub Projects replacement.
- Complex autonomous planning/execution before the issue/PR discourse loop is strong.

## Recommended Architecture

### Backend modules

- `AuthModule`: local GitHub credential/session handling; no separate app accounts.
- `GithubAuthModule`: pasted fine-grained PAT support plus optional GitHub OAuth Device/Web Flow.
- `GithubSyncModule`: Octokit-based GitHub REST/GraphQL wrappers, pagination, caching, rate-limit/error handling.
- `RepositoriesModule`: selected repos/workspaces and repo metadata.
- `IssuesModule`: issue list/detail/create/edit/comment operations.
- `PullRequestsModule`: PR list/detail/comments/check-summary operations.
- `AgentsModule`: local agent registry, capabilities, assignment/status mapping.
- `PiAgentModule`: Pi SDK client, action payload builders, response normalization.
- `JobsModule`: local Pi job records, status, logs, retries/cancellation, and GitHub result posting.
- `AttentionModule`: deterministic rules for “needs action” indicators.
- `MarkdownModule` or shared markdown utilities: GitHub Flavored Markdown rendering/sanitization helpers for server/client consistency where useful.

### Frontend routes

- `/setup`: first-run Docker Compose setup, paste token or start GitHub OAuth flow.
- `/repos`: fetch and choose repositories visible to the connected GitHub identity.
- `/inbox`: unified issue/PR work inbox across selected repositories.
- `/r/:owner/:repo`: repository overview with issue/PR tabs and saved filters.
- `/r/:owner/:repo/issues`: repository issue list.
- `/r/:owner/:repo/pulls`: repository pull request list.
- `/issues/new`: create GitHub issue.
- `/r/:owner/:repo/issues/:number`: issue detail + AI discourse panel.
- `/r/:owner/:repo/pulls/:number`: PR detail + AI discourse panel; no code diff viewer in MVP.
- `/agents`: Pi Agent status/actions and workload board.
- `/settings`: GitHub integration, Pi SDK config, label conventions, workspace preferences.

### UI plan

- Visual direction:
  - Linear meets GitHub Lite: fast, calm, minimal, command-friendly, and highly readable
  - full-width, keyboard-friendly UI optimized for reading and acting on issue/PR discussions
  - GitHub-inspired entities and markdown, but with Linear-like speed, density, shortcuts, sidebar navigation, and crisp status treatment
  - centered content column for comment bodies on large screens, with optional right metadata/action rail
  - dense list views, spacious detail views
  - focus on one excellent light theme first, with dark mode as a follow-up unless it falls out cheaply from the styling system
- Repository selection:
  - fetch authenticated user repos/org repos through GitHub API
  - search/filter repos by owner/name, private/public, recently pushed, selected/enabled
  - persist selected repo IDs locally only; re-fetch from GitHub after logout/login
- Repository issue/PR lists:
  - tabs for Issues, Pull Requests, and unified Conversation inbox
  - filters for open/closed, labels, author, assignee, mentioned, updated, agent labels, attention flags
  - compact rows showing title, repo, number, labels, comments count, updated time, status, assigned Pi Agent state
- Issue detail reader:
  - sticky header with title, state, repo/number, labels, assignees, comment/create/edit actions
  - body rendered as first timeline card
  - comments rendered chronologically as readable cards with author, timestamp, edited state, reactions if easy
  - edit affordances for issue body and comments authored by the connected user/token where GitHub permits
  - composer at bottom and optional sticky quick-reply composer
  - Pi Agent action bar: summarize, draft reply, answer latest question, triage, plan implementation
- PR detail reader:
  - same conversation-first layout as issues
  - show PR metadata: source/target branch, merge state, review state, checks summary
  - show PR review comments in conversation/timeline form where feasible
  - omit code diff browsing for MVP; link out to GitHub for files/diffs
  - Pi Agent action bar: summarize, draft reply, answer latest question, review PR
- Markdown rendering:
  - render GitHub Flavored Markdown using a robust markdown pipeline with syntax highlighting, tables, task lists, autolinks, mentions, issue references, blockquotes, and code fences
  - sanitize output before rendering
  - style markdown to closely match GitHub readability: typography, spacing, code blocks, tables, task lists, alerts/admonitions where supported
  - preserve raw markdown in edit mode and preview rendered output before posting
- Loading/error states:
  - skeletons for lists/detail pages
  - clear GitHub rate-limit and permission errors
  - retry controls for GitHub and Pi SDK failures
  - empty states that explain required token scopes and selected repo setup

### API endpoints, initial

- `GET /api/github/viewer` — connected GitHub user/token identity.
- `GET /api/github/repos` — fetch repos available to the token.
- `GET /api/repos/selected` / `PUT /api/repos/selected` — local selected repo preferences.
- `GET /api/repos/:owner/:repo/issues` — issue list with filters.
- `GET /api/repos/:owner/:repo/pulls` — PR list with filters.
- `GET /api/repos/:owner/:repo/issues/:number` — issue body, metadata, comments, timeline subset.
- `GET /api/repos/:owner/:repo/pulls/:number` — PR body, metadata, comments, review comments, check summary; no diff payload for MVP.
- `POST /api/repos/:owner/:repo/issues` — create issue.
- `PATCH /api/repos/:owner/:repo/issues/:number` — edit issue fields.
- `POST /api/repos/:owner/:repo/issues/:number/comments` — create issue/PR conversation comment.
- `PATCH /api/repos/:owner/:repo/comments/:commentId` — edit comment where permitted.
- `POST /api/pi/jobs` — run Pi SDK action for target issue/PR.
- `GET /api/pi/jobs/:id` — read job status/log/result.

### Local data model, initial

- `LocalSession` — active connected GitHub identity/token reference; cleared on logout.
- `RepositoryCache` — GitHub repo id/name/owner plus enabled flag/cache metadata.
- `LocalPreference` — selected repos, filters, UI defaults, label prefixes; safe to clear/recreate.
- `AgentViewConfig` — optional local display config for known agent labels. Seed/configure Pi Agent as the first built-in agent profile.
- `PiJob` — local short-lived job status/logs for Pi SDK actions; durable result is posted to GitHub.
- `ThreadSummaryCache` — cached summary, last summarized GitHub event/comment id, attention flags; recomputable.

GitHub remains canonical for issue/PR/comment content and durable agent workflow state. Local DB/cache stores only ephemeral convenience data unless the user later chooses a repo-backed config file/issue.

## Files to modify

No application files exist yet. Expected future files/directories:

- `package.json`
- `pnpm-workspace.yaml` or equivalent workspace config
- `apps/web/` — SolidJS app
- `apps/api/` — NestJS API
- `packages/shared/` — shared types/schema utilities
- `docker-compose.yml`
- `apps/api/src/db/` or lightweight SQLite cache setup if needed
- `apps/api/src/pi-agent/` — Pi SDK integration and action runners
- `apps/api/src/jobs/` — local Pi job status/log handling
- `.env.example`
- `apps/api/src/pi-agent/actions/*.action.ts` — commented runnable Pi SDK examples/actions
- `apps/web/src/components/markdown/` — GitHub-like markdown renderer/styles
- `apps/web/src/features/repos/` — repo picker and repo pages
- `apps/web/src/features/issues/` — issue list/detail/comment composer
- `apps/web/src/features/pulls/` — PR list/detail conversation reader
- `apps/web/src/features/pi-agent/` — Pi action bar, job progress/result UI
- `README.md`

## Reuse

No existing code or utilities are present in this repository yet.

Likely external/open-source building blocks to evaluate:

- SolidJS + Vite Solid template for a simpler SPA MVP
- NestJS
- Octokit as the required GitHub client layer, using https://github.com/octokit/octokit.js:
  - `octokit.js` / `@octokit/rest` for issues, pulls, comments, labels, repos, checks, and review comments
  - `@octokit/graphql` only where GraphQL is clearly better for combined views/search
  - Octokit auth and pagination helpers for repo, issue, PR, and comment lists
  - Octokit-native error/rate-limit handling surfaced through NestJS services
- GitHub OAuth Device Flow/Web Flow libraries if OAuth is included
- Fine-grained GitHub personal access tokens for simplest local setup
- Pi SDK for read/analyze/respond agent actions
- SQLite with Prisma/Drizzle only for local cache/preferences/jobs if needed; avoid PostgreSQL in MVP
- TanStack Query/Solid Query for client-side data fetching/cache
- GitHub Flavored Markdown stack such as `remark-gfm`, `rehype-sanitize`, syntax highlighting, and GitHub-like markdown CSS/prose styles
- Tailwind or another OSS component styling system

## Steps

- [x] Confirm MVP product boundaries and target user persona: agentic developer managing coding-agent work.
- [x] Confirm initial deployment shape: Docker Compose self-hosted setup is enough.
- [x] Finalize GitHub auth model: no separate auth; local GitHub credential via pasted fine-grained token first, OAuth flow as nicer option.
- [x] Define baseline GitHub write scope: create issues, read issues/PRs/comments, edit issues/comments/metadata where permitted.
- [ ] Finalize exact GitHub label/comment conventions for Pi Agent coordination.
- [x] Decide Pi Agent execution scope: call Pi SDK for read/analyze/respond actions and post results to GitHub.
- [x] Confirm GitHub client choice: use Octokit for all GitHub API access.
- [x] Simplify MVP architecture after outside review: Vite Solid SPA + NestJS + optional SQLite/local cache, no PostgreSQL/multi-user/GitHub App/diffs.
- [ ] Resolve Pi SDK package/API shape and credentials during implementation; hide details behind `PiAgentClient`.
- [x] Choose initial app architecture and repository structure.
- [x] Define API modules and frontend routes.
- [x] Define MVP data model for local persistence.
- [x] Define UI plan for repo fetching, issue/PR lists, comments, PR comments, markdown rendering, and full-width reading experience.
- [ ] Define verification plan and launch criteria.

## Verification

Planned verification once implementation begins:

- Run API unit/integration tests for GitHub service wrappers.
- Run frontend component/route tests for inbox and detail views.
- Run the stack with Docker Compose.
- Connect GitHub with a fine-grained PAT or OAuth flow.
- List issues and pull requests across selected repositories.
- Create a new issue from the app and confirm it appears on GitHub.
- Open detail views and verify comments/metadata render correctly.
- Create and edit a comment from the app and confirm it appears on GitHub.
- Update issue title/body/state/labels/assignees where supported and confirm changes sync to GitHub.
- Assign an issue to Pi Agent and verify GitHub labels/comments contain the durable workflow state.
- Run a Pi SDK `Summarize thread` job and confirm the generated answer is posted to GitHub.
- Run a Pi SDK `Draft reply`, `Answer latest question`, or `Triage issue` job and confirm user approval/posting flow works.
- Verify repo fetching for user and org repos visible to the connected token.
- Verify repository issue list and PR list filters.
- Verify issue detail renders body/comments in GitHub-like markdown.
- Verify PR detail renders conversation comments, review comments, and checks summary without code diffs.
- Verify markdown rendering for tables, task lists, code fences, links, mentions, issue references, images, and blockquotes.
- Validate behavior under GitHub API errors/rate limits and Pi SDK failures/timeouts.

## Open Questions

- During implementation, confirm the exact Pi SDK package/import, auth method, environment variables, and input/output contract from Pi SDK docs or examples.
- Default posting policy: summarize/triage/review/plan actions can post directly when the user clicks “run and post”; draft reply opens editable preview before posting.
- Durable agent configuration can remain label/comment based for MVP; repo-backed config can be added later if needed.
