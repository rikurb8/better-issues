# SolidStart GitHub Work Hub

Linear meets GitHub Lite for agentic developers. This MVP uses GitHub as the durable backend, Octokit/GraphQL for GitHub access, and Pi SDK action wrappers for read/analyze/respond workflows.

## Quick start

```bash
pnpm install
pnpm dev
```

Or with Docker Compose:

```bash
docker compose up
```

Open http://localhost:3001.

## Current scaffold

- `apps/app` — SolidStart full-stack app
- `apps/app/src/server/github` — Octokit GraphQL/REST service layer
- `apps/app/src/server/pi-agent` — Pi SDK adapter boundary and runnable example actions
- `apps/app/src/components/ui` — Tailwind/Kobalte-ready internal UI layer
- `apps/app/src/components/markdown` — GitHub markdown renderer placeholder

## Environment

Copy `.env.example` and set values as needed:

```bash
GITHUB_TOKEN=github_pat_xxx
PI_API_KEY=...
```

The app is designed for local-only auth: whoever connects GitHub in the local session owns the running instance. Logout/reset should clear local credential/cache state; durable changes live in GitHub.

## Verification

```bash
pnpm lint
pnpm test
```
