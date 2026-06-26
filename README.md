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

- `packages/web` — SolidStart full-stack web app
- `packages/web/src/server/github` — Octokit GraphQL/REST service layer
- `packages/web/src/server/pi-agent` — Pi SDK adapter boundary and runnable example actions
- `packages/web/src/components/ui` — Tailwind/Kobalte-ready internal UI layer
- `packages/web/src/components/markdown` — GitHub markdown renderer placeholder

## GitHub authentication

The recommended path is GitHub OAuth Device Flow from `/setup`. The app opens `https://github.com/login/device`, shows a short code, then stores the OAuth token server-side only at `${APP_DATA_DIR || ".data"}/auth/github.json` with restrictive file permissions where supported. `.data/` is gitignored.

This v1 auth model is local-only and single-user per running instance: whoever connects GitHub owns that local app instance. Credentials stay on the user's machine and are never stored in browser localStorage/sessionStorage or sent to browser JavaScript. Use **Disconnect GitHub** to delete the local stored token.

The OAuth app must have Device Flow enabled and requests exactly `repo read:user`. The client ID defaults to `Ov23liQVEcCGHU1uxAGI` and can be overridden with `GITHUB_OAUTH_CLIENT_ID`; no client secret is used. Organisation repositories may require user access, org OAuth App approval, and SAML/SSO authorization depending on org policy.

Optional environment values:

```bash
# Experimental/dev fallback only; not the normal onboarding path.
GITHUB_TOKEN=github_pat_xxx
GITHUB_OAUTH_CLIENT_ID=Ov23liQVEcCGHU1uxAGI
APP_DATA_DIR=.data
PI_API_KEY=...
```

## Verification

```bash
pnpm lint
pnpm test
```
