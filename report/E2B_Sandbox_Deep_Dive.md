# E2B Sandbox Deep Dive (SecDev)

This document explains exactly how E2B is used in this codebase, how the sandbox lifecycle works, which templates are involved, and how deployment/testing pipelines interact with a running sandbox.

## 1) High-level model

SecDev treats E2B as the runtime boundary for untrusted app code.

- One deployment = one E2B sandbox
- Source repo is cloned into sandbox filesystem at `/home/user/repo`
- App is launched on sandbox port `3000`
- Public preview URL is derived from E2B host mapping
- Sandbox metadata + logs + status are persisted in Neon Postgres

Primary implementation: [lib/deployer.ts](../lib/deployer.ts)

## 2) Core E2B entry points in code

### Sandbox creation and startup

- `Sandbox.create(...)` in deployment flow: [lib/deployer.ts](../lib/deployer.ts)
- Template selector via env fallback:
  - `E2B_TEMPLATE = process.env.E2B_TEMPLATE ?? "secdev-web-runtime"`
- Timeout configured as 1 hour in app code:
  - `SANDBOX_TIMEOUT_MS = 60 * 60 * 1000`

### Sandbox connect and management

- Kill sandbox: [lib/deployer.ts](../lib/deployer.ts)
- Refresh/ping status: [lib/deployer.ts](../lib/deployer.ts)
- List sandboxes from E2B API and join with DB ownership: [app/api/sandboxes/route.ts](../app/api/sandboxes/route.ts)

### Route and API discovery inside sandbox filesystem

- Connects to sandbox and executes shell discovery commands:
  - [lib/route-parser.ts](../lib/route-parser.ts)

### Vibetest (browser checks) executed in sandbox

- Connects to existing sandbox and runs Playwright agent scripts:
  - [lib/test-functions/vibetest-run.ts](../lib/test-functions/vibetest-run.ts)

## 3) End-to-end deployment lifecycle

Source path: [app/api/deploy/route.ts](../app/api/deploy/route.ts) and [lib/deployer.ts](../lib/deployer.ts)

### Step-by-step

1. Authenticated user calls `POST /api/deploy`.
2. Server loads saved env vars from Neon for selected repo.
3. `startDeployment(...)` checks if same user already has active deployment for same repo+branch.
4. If no active deployment, server creates E2B sandbox with template `secdev-web-runtime` (or `E2B_TEMPLATE`).
5. Public URL computed as `https://${sandbox.getHost(3000)}`.
6. Deployment row inserted in `deployments` table with status `deploying`.
7. Background pipeline runs inside sandbox:
   - git clone
   - package manager detection (pnpm/yarn/npm)
   - dependency install
   - framework detection
   - app start command generation
   - health check using `curl http://localhost:3000/`
8. DB status transitions to `live` on success, `failed` on failures.

### Framework behavior

Deployment runtime chooses start strategy by project shape.

- Next.js detected:
  - Runs `next dev` instead of `next build` to avoid OOM in 1 GB sandbox
  - Uses `NODE_OPTIONS='--max-old-space-size=512'`
- Vite/CRA detected:
  - Builds and serves static output (`dist` or `build`) via `serve`
- Generic Node app with start script:
  - Runs `pkgMgr start`
- Static fallback:
  - Serves repo root via `serve -s`

All logic in: [lib/deployer.ts](../lib/deployer.ts)

## 4) E2B runtime template (what is baked in)

Template directory: [templates/web-runtime](../templates/web-runtime)

### Template manifest

- E2B template config: [templates/web-runtime/e2b.toml](../templates/web-runtime/e2b.toml)
- Declares:
  - `template_name = "secdev-web-runtime"`
  - `template_id = "qg1v6gyvxew6q52r04lp"`
  - dockerfile path

### Docker image composition

File: [templates/web-runtime/Dockerfile](../templates/web-runtime/Dockerfile)

Base and system:

- Base image: `node:20-slim`
- Installs: `git`, `curl`, `wget`, `ca-certificates`, `procps`

Global CLIs:

- `pnpm`
- `serve`
- `@lhci/cli`
- `pa11y`
- `artillery`

Playwright pre-install:

- Sets `PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright`
- Installs `playwright@latest`
- Installs Chromium with deps
- Makes browser files world-readable for sandbox users

### start.sh behavior

File: [templates/web-runtime/start.sh](../templates/web-runtime/start.sh)

- Supports optional `REPO_URL` clone and `BRANCH`
- Detects package manager
- Installs deps
- Detects framework and starts app

Important implementation detail:

- Current SecDev deploy flow does not call `/home/user/start.sh`; instead it executes commands directly from Node in [lib/deployer.ts](../lib/deployer.ts).
- So `start.sh` is reusable template entry logic, but not the active path used by current deploy API.

## 5) Sandbox API surface in SecDev

### Deployment APIs

- Start/list deployments: [app/api/deploy/route.ts](../app/api/deploy/route.ts)
- Per-deployment operations (get, redeploy, refresh, delete): [app/api/deploy/[id]/route.ts](../app/api/deploy/[id]/route.ts)

### Sandbox management API

- List user-owned live/stopped sandboxes and metadata:
  - [app/api/sandboxes/route.ts](../app/api/sandboxes/route.ts)
- Kill sandbox (ownership checked):
  - [app/api/sandboxes/route.ts](../app/api/sandboxes/route.ts)

### Template connectivity smoke endpoint

- [app/api/test/route.ts](../app/api/test/route.ts)
- Verifies:
  - DB write/read/delete
  - E2B template can be created and run commands (`node`, `pnpm`, `serve`)
  - Env var persistence characteristics

## 6) How tests use existing sandbox deployments

Testing is event-driven via Inngest and generally targets an existing deployment sandbox id.

Inngest registration:

- Client config: [lib/inngest.ts](../lib/inngest.ts)
- Route handler: [app/api/inngest/route.ts](../app/api/inngest/route.ts)

Trigger endpoint:

- [app/api/tests/run/route.ts](../app/api/tests/run/route.ts)
- Accepts `{ sandboxId, type }`
- Maps type to event names (`test/suite.run`, `test/security.run`, etc.)

Functions:

- Route health suite: [lib/test-functions/test-suite.ts](../lib/test-functions/test-suite.ts)
- Security checks: [lib/test-functions/security-scan.ts](../lib/test-functions/security-scan.ts)
- API tests: [lib/test-functions/api-tests.ts](../lib/test-functions/api-tests.ts)
- Performance tests: [lib/test-functions/performance-tests.ts](../lib/test-functions/performance-tests.ts)
- Vibetest browser agents (inside sandbox): [lib/test-functions/vibetest-run.ts](../lib/test-functions/vibetest-run.ts)

### Vibetest sandbox specifics

- Connects to same sandbox by `sandboxId`
- Ensures `/tmp/vt` exists
- Prefers pre-baked Playwright at `/opt/playwright/node_modules/playwright`
- Falls back to runtime install in `/tmp/vt` if template lacks pre-baked install
- Writes JS agents into sandbox and executes them with Node

## 7) Security Agent integration with sandbox

Trigger and orchestration:

- Trigger API: [app/api/security-agent/run/route.ts](../app/api/security-agent/run/route.ts)
- Worker function: [lib/security-agent/functions.ts](../lib/security-agent/functions.ts)

Flow:

- Uses deployment `sandboxId` to resolve public URL and route set
- Runs scanner agents and writes findings to DB
- AI summarization is only in final analysis stage

## 8) Attack Pipeline relation to sandbox

Endpoints:

- Run/list/stop: [app/api/attack-pipeline/route.ts](../app/api/attack-pipeline/route.ts)
- Report fetch: [app/api/attack-pipeline/report/route.ts](../app/api/attack-pipeline/report/route.ts)

Notes:

- Attack pipeline uses `baseUrl` as the primary scan target.
- `sandboxId` is optional metadata/context in the run record.
- This means pipeline can scan either deployed sandbox URLs or other explicit URLs.

## 9) Persistence model (DB schema)

Schema bootstrap is centralized in: [lib/db.ts](../lib/db.ts)

Sandbox-related tables:

- `deployments`
  - one row per sandbox deployment
  - includes repo, branch, status, public/log URLs, user ownership
- `deployment_logs`
  - streamed build/runtime logs by sandbox id
- `test_runs`, `test_results`, `security_results`, `api_test_results`, `performance_results`, `vibetest_results`
  - all keyed by sandbox/run context
- `security_agent_runs`, `security_agent_findings`

Ownership and isolation:

- API handlers consistently enforce user auth and ownership checks before read/kill/report operations.

## 10) Environment variables and secret injection

Env var store:

- [lib/env-store.ts](../lib/env-store.ts)
- Encrypted at rest via AES-256-GCM derived from `NEXTAUTH_SECRET`
- Persist in Neon, independent of sandbox lifecycle

Deployment use:

- Deploy API reads saved env vars and injects them into install command context in deployer
- Secrets are not persisted in sandbox DB tables as plaintext

## 11) Failure handling and operational behavior

Observed behavior from code:

- Clone/build/install failures set deployment to `failed`
- Server launch health check uses localhost curl from inside sandbox
- If sandbox connect fails during refresh/kill, status is still marked failed in DB
- Deployment deduplication prevents duplicate live-ish deployments per user/repo/branch

## 12) Template build/publish workflow

Described in: [README.md](../README.md)

Commands:

- `cd templates/web-runtime`
- `e2b template build --name secdev-web-runtime`

Template config source of truth:

- [templates/web-runtime/e2b.toml](../templates/web-runtime/e2b.toml)

## 13) Required environment variables for E2B path

From code and README:

- `E2B_API_KEY` (required for create/connect/list/kill)
- `E2B_TEMPLATE` (optional override; defaults to `secdev-web-runtime`)
- `DATABASE_URL` (required for deployment/test persistence)
- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` (for background test orchestration)

## 14) Quick mental model

Think of SecDev sandboxing as 3 layers:

1. Template layer

- Docker-based, pre-baked tools and browsers
- Defined in [templates/web-runtime](../templates/web-runtime)

2. Runtime orchestration layer

- Creates sandbox, clones code, starts server, logs and status updates
- Implemented in [lib/deployer.ts](../lib/deployer.ts)

3. Test and scan layer

- Re-attaches to running sandbox and/or scans public URL
- Implemented across test/security/attack pipeline modules

---

## File index (all directly related)

- [templates/web-runtime/Dockerfile](../templates/web-runtime/Dockerfile)
- [templates/web-runtime/e2b.toml](../templates/web-runtime/e2b.toml)
- [templates/web-runtime/start.sh](../templates/web-runtime/start.sh)
- [lib/deployer.ts](../lib/deployer.ts)
- [lib/route-parser.ts](../lib/route-parser.ts)
- [app/api/deploy/route.ts](../app/api/deploy/route.ts)
- [app/api/deploy/[id]/route.ts](../app/api/deploy/[id]/route.ts)
- [app/api/sandboxes/route.ts](../app/api/sandboxes/route.ts)
- [app/api/test/route.ts](../app/api/test/route.ts)
- [lib/inngest.ts](../lib/inngest.ts)
- [app/api/inngest/route.ts](../app/api/inngest/route.ts)
- [app/api/tests/run/route.ts](../app/api/tests/run/route.ts)
- [lib/test-functions/test-suite.ts](../lib/test-functions/test-suite.ts)
- [lib/test-functions/security-scan.ts](../lib/test-functions/security-scan.ts)
- [lib/test-functions/api-tests.ts](../lib/test-functions/api-tests.ts)
- [lib/test-functions/performance-tests.ts](../lib/test-functions/performance-tests.ts)
- [lib/test-functions/vibetest-run.ts](../lib/test-functions/vibetest-run.ts)
- [app/api/security-agent/run/route.ts](../app/api/security-agent/run/route.ts)
- [app/api/security-agent/report/route.ts](../app/api/security-agent/report/route.ts)
- [lib/security-agent/functions.ts](../lib/security-agent/functions.ts)
- [app/api/attack-pipeline/route.ts](../app/api/attack-pipeline/route.ts)
- [app/api/attack-pipeline/report/route.ts](../app/api/attack-pipeline/report/route.ts)
- [lib/db.ts](../lib/db.ts)
- [lib/env-store.ts](../lib/env-store.ts)
- [README.md](../README.md)
