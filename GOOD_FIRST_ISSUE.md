# SecDev Audit Report

## Console Pages Found

- Account
- API Testing
- Attack Pipeline
- Billing
- Dashboard
- Deployments
- Deployment Detail
- Env Vars
- GitHub
- Logs
- Notifications
- Performance
- Projects
- Sandboxes
- Security
- Security Agent
- Settings
- Test Suite
- Vibetest

## File: app/api/env-vars/route.ts

## [CRITICAL] Unauthenticated env-var read/write endpoint

**File:** `app/api/env-vars/route.ts`
**Line(s):** `14–83`
**Console Page (if applicable):** `Env Vars`
**Severity:** `Critical`

### Description

This route exposes plaintext secret storage and mutation without any authentication or authorization checks. `GET` can reveal plaintext values with `reveal=1`, and `POST`/`DELETE` can overwrite or remove values for any `project` supplied by the caller.

### Evidence (from code)

```ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const reveal = searchParams.get("reveal") === "1";

    if (!project) {
      return NextResponse.json(
        { error: "project query param required" },
        { status: 400 },
      );
    }

    if (reveal) {
      const vars = await getEnvVars(project);
      return NextResponse.json({
        ok: true,
        vars: Object.entries(vars).map(([key, value]) => ({ key, value })),
      });
    }

    const masked = await listEnvVars(project);
    return NextResponse.json({ ok: true, vars: masked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

### Suggested Fix

Require a valid session before any read or write, then restrict each `project` to the authenticated user's resources. For secret reads, avoid a plaintext reveal flag entirely or gate it behind a stricter admin-only policy.

## File: lib/env-store.ts

## [HIGH] Hardcoded fallback key weakens encrypted env vars

**File:** `lib/env-store.ts`
**Line(s):** `20`
**Console Page (if applicable):** `Env Vars`
**Severity:** `High`

### Description

If `NEXTAUTH_SECRET` is missing, secret encryption falls back to a hardcoded development string. That means env-var values can be decrypted with a predictable key instead of a deployment-specific secret.

### Evidence (from code)

```ts
function getKey(): Buffer {
  const raw = process.env.NEXTAUTH_SECRET ?? "default-dev-secret-32-chars-long";
  return createHash("sha256").update(raw).digest();
}
```

### Suggested Fix

Fail fast when `NEXTAUTH_SECRET` is absent in non-development environments. Do not derive encryption keys from a hardcoded fallback string.

## File: lib/deployer.ts

## [CRITICAL] Shell command injection in sandbox deployment pipeline

**File:** `lib/deployer.ts`
**Line(s):** `236, 266–272`
**Console Page (if applicable):** `Deployments`
**Severity:** `Critical`

### Description

User-controlled `repoUrl`, `branch`, and environment-variable data are interpolated directly into shell command strings. A crafted repository URL or branch can change the `git clone` command, and env-var content is concatenated into the install command without shell escaping.

### Evidence (from code)

```ts
const cloneResult = await sandbox.commands.run(
  `git clone --depth 1 --branch ${branch} ${repoUrl} /home/user/repo 2>&1`,
  { onStdout, onStderr, timeoutMs: 120_000 },
);

const envStr = envVars
  ? Object.entries(envVars)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ")
  : "";

const installCmd = `cd /home/user/repo && ${envStr} ${pkgMgr} install 2>&1`;
```

### Suggested Fix

Stop building shell commands with string interpolation. Use argument arrays or a shell-escaping library, and validate `repoUrl`, `branch`, and env-var values against strict allowlists before they reach the sandbox.

## File: app/api/dashboard/stats/route.ts

## [HIGH] Dashboard stats leak legacy rows across users

**File:** `app/api/dashboard/stats/route.ts`
**Line(s):** `29, 36, 43, 84`
**Console Page (if applicable):** `Dashboard`
**Severity:** `High`

### Description

Each stats query includes rows where `user_id = ''`, so any authenticated user can see records that were created without an owner. That leaks deployment, test-run, and security-agent counts across accounts and makes the dashboard totals untrustworthy.

### Evidence (from code)

```ts
      sql`
        SELECT status, COUNT(*) AS count
        FROM deployments
        WHERE user_id = ${userId} OR user_id = ''
        GROUP BY status
      `,
      sql`
        SELECT type, status, COUNT(*) AS count
        FROM test_runs
        WHERE user_id = ${userId} OR user_id = ''
        GROUP BY type, status
      `,
      sql`
        SELECT status, COUNT(*) AS count
        FROM security_agent_runs
        WHERE user_id = ${userId} OR user_id = ''
        GROUP BY status
      `,
...
      WHERE user_id = ${userId} OR user_id = ''
```

### Suggested Fix

Remove the `user_id = ''` fallback and backfill/repair legacy rows before exposing them. If legacy rows must remain accessible, migrate them to a real owner or gate them behind a separate admin-only path.

## File: app/api/deploy/[id]/route.ts

## [HIGH] Empty-owner deployments bypass the ownership check

**File:** `app/api/deploy/[id]/route.ts`
**Line(s):** `17–18`
**Console Page (if applicable):** `Deployments`
**Severity:** `High`

### Description

The ownership check only rejects a deployment when `record.userId` is truthy and different from the session user. Any deployment row with an empty `userId` skips the check entirely, so authenticated users can read, restart, refresh, or delete those rows.

### Evidence (from code)

```ts
if (record.userId && record.userId !== session.user.id) {
  return {
    error: NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    ),
  };
}
```

### Suggested Fix

Treat missing ownership as forbidden unless the record is explicitly marked public. Enforce ownership on insert and backfill existing rows so an empty `userId` cannot bypass access control.

## File: app/api/tests/run/route.ts

## [HIGH] Test-run history leaks and accepts legacy unowned rows

**File:** `app/api/tests/run/route.ts`
**Line(s):** `47–52, 93`
**Console Page (if applicable):** `Test Suite`
**Severity:** `High`

### Description

The POST path only blocks access when a deployment row exists and has a non-empty `user_id`. If the deployment row is missing or still has `user_id = ''`, the route creates a test run anyway. The GET path has the same `user_id = ''` fallback, so run history from those legacy rows is visible across users.

### Evidence (from code)

```ts
    const dep = await sql`SELECT user_id FROM deployments WHERE sandbox_id = ${sandboxId} LIMIT 1`;
    if (dep.length > 0 && dep[0].user_id && dep[0].user_id !== userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
...
      rows = await sql`SELECT * FROM test_runs WHERE (user_id = ${userId} OR user_id = '') ORDER BY created_at DESC LIMIT 100`;
```

### Suggested Fix

Require an owned deployment row before starting a run, and stop exposing `user_id = ''` rows in history. If legacy runs must be retained, migrate them to a real owner or hide them from normal users.

## File: app/api/tests/ai-plan/route.ts

## [HIGH] AI planning trusts arbitrary sandbox IDs

**File:** `app/api/tests/ai-plan/route.ts`
**Line(s):** `79–92`
**Console Page (if applicable):** `Security Agent`
**Severity:** `High`

### Description

The route accepts any `sandboxId`, parses its routes, and sends the result to OpenAI without proving that the sandbox belongs to the authenticated user. A caller can therefore request AI planning for a sandbox they do not own, which misattributes analysis and can expose route structure.

### Evidence (from code)

```ts
const { sandboxId } = (await request.json()) as { sandboxId?: string };
if (!sandboxId) {
  return NextResponse.json(
    { ok: false, error: "sandboxId is required" },
    { status: 400 },
  );
}

// Discover routes
const routes = await parseApiRoutes(sandboxId);
if (routes.length === 0) {
  return NextResponse.json(
    { ok: false, error: "No API routes found in this deployment" },
    { status: 404 },
  );
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
```

### Suggested Fix

Look up the deployment by `sandboxId` and verify ownership before parsing routes. Also guard `OPENAI_API_KEY` explicitly so the route fails with a clear configuration error instead of a runtime exception.

## File: app/api/attack-pipeline/route.ts

## [MEDIUM] Attack-pipeline runs are accepted for arbitrary sandbox IDs

**File:** `app/api/attack-pipeline/route.ts`
**Line(s):** `36–60`
**Console Page (if applicable):** `Attack Pipeline`
**Severity:** `Medium`

### Description

The POST handler stores and executes a run for whatever `sandboxId` the caller supplies, but it never checks that the sandbox belongs to the signed-in user. That allows a caller to misattribute runs to other sandbox IDs and pollute the attack-pipeline history.

### Evidence (from code)

```ts
const { baseUrl, sandboxId, useAi = false, includePerformance = false } = body;

if (!baseUrl || typeof baseUrl !== "string") {
  return NextResponse.json(
    { ok: false, error: "baseUrl is required" },
    { status: 400 },
  );
}

// Basic URL validation — must start with http(s)://
if (!/^https?:\/\/.+/i.test(baseUrl)) {
  return NextResponse.json(
    { ok: false, error: "baseUrl must start with http:// or https://" },
    { status: 400 },
  );
}

await ensureTables();
const sql = getDb();

const runId = `ap_${randomBytes(8).toString("hex")}`;

// Insert run record immediately so history shows it
await sql`
    INSERT INTO attack_pipeline_runs
      (id, user_id, base_url, sandbox_id, status, created_at)
    VALUES
      (${runId}, ${userId}, ${baseUrl}, ${sandboxId ?? null}, 'running', ${Date.now()})
  `;
```

### Suggested Fix

Verify the sandbox ownership before inserting the run record. If the sandbox does not belong to the authenticated user, return `403` and do not persist or execute the scan.

## File: app/console/dashboard/page.tsx

## [MEDIUM] Dashboard swallows stats fetch failures

**File:** `app/console/dashboard/page.tsx`
**Line(s):** `53–64`
**Console Page (if applicable):** `Dashboard`
**Severity:** `Medium`

### Description

The page fetches dashboard stats on mount, but the `catch` handler does nothing and the component never tracks an error state. If `/api/dashboard/stats` fails, the page quietly shows stale or empty metrics with no feedback to the user.

### Evidence (from code)

```ts
const fetchStats = async () => {
  try {
    const res = await fetch("/api/dashboard/stats");
    const data = await res.json();
    if (data.ok) setStats(data);
  } catch {
    /* ignore */
  }
  setLoading(false);
};

useEffect(() => {
  fetch("/api/dashboard/stats")
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) setStats(data);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
}, []);
```

### Suggested Fix

Store a visible error state and render an inline failure message or retry control when the stats request fails. Avoid maintaining two separate fetch paths for the same mount-time data.

## File: app/console/settings/page.tsx

## [MEDIUM] Save Changes is only local UI state

**File:** `app/console/settings/page.tsx`
**Line(s):** `43–180`
**Console Page (if applicable):** `Settings`
**Severity:** `Medium`

### Description

The settings page presents editable deployment settings and a `Save Changes` button, but the save handler only flips local state and never persists anything. Users can interact with the form, but none of the values are written to the backend.

### Evidence (from code)

```ts
  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
...
      <div className="flex justify-end">
        <button
          onClick={save}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-all ${
            saved
              ? "bg-green-600 text-white"
              : "bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 text-white"
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
```

### Suggested Fix

Wire the form up to a real persistence endpoint or remove the save affordance until storage exists. If the page is intentionally mock-only, label it clearly so it does not imply persistence.

## File: app/console/attack-pipeline/page.tsx

## [LOW] Attack Pipeline page hides deployment and history load failures

**File:** `app/console/attack-pipeline/page.tsx`
**Line(s):** `260, 280, 312`
**Console Page (if applicable):** `Attack Pipeline`
**Severity:** `Low`

### Description

The page silently ignores failures while loading deployments and run history, so the UI can remain empty or stale without explaining why. That makes it hard to distinguish “no data” from “backend failed.”

### Evidence (from code)

```ts
    fetch("/api/deploy")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const all = (d.deployments ?? []).filter((dep: Deployment) => dep.status !== "failed");
          setDeployments(all);
          if (all.length > 0) setSelectedSandbox(all[0].sandboxId);
        }
      })
      .catch(() => null);
...
      .catch(() => null)
...
      }).catch(() => null);
```

### Suggested Fix

Track a visible error state for deployment/history loading and render a retry or empty-state message when the fetch fails.

## File: app/console/api-testing/page.tsx

## [LOW] API Testing page suppresses history/loading errors

**File:** `app/console/api-testing/page.tsx`
**Line(s):** `110`
**Console Page (if applicable):** `API Testing`
**Severity:** `Low`

### Description

The API testing page suppresses fetch failures while loading run history, so the page can render with no runs and no explanation if the backend is down. That makes troubleshooting much harder for users.

### Evidence (from code)

```ts
try {
  const res = await fetch(
    `/api/tests/run?sandboxId=${selectedSandbox}&type=api`,
  );
  const data = await res.json();
  if (data.ok) setRuns(data.runs ?? []);
} catch {
  /* ignore */
}
```

### Suggested Fix

Add an error state for the history fetch and expose a retry action in the page UI.

## File: app/console/security/page.tsx

## [LOW] Security page suppresses history/loading errors

**File:** `app/console/security/page.tsx`
**Line(s):** `130`
**Console Page (if applicable):** `Security`
**Severity:** `Low`

### Description

The Security page ignores failures when loading scan history, so the page can appear empty even when the backend request failed. There is no visible fallback or retry path for users.

### Evidence (from code)

```ts
try {
  const res = await fetch(
    `/api/tests/run?sandboxId=${selectedSandbox}&type=security`,
  );
  const data = await res.json();
  if (data.ok) setScanRuns(data.runs ?? []);
} catch {
  /* ignore */
}
```

### Suggested Fix

Track an error message for failed history loads and render it alongside the existing scan controls.

## File: app/console/performance/page.tsx

## [LOW] Performance page suppresses history/load failures

**File:** `app/console/performance/page.tsx`
**Line(s):** `79`
**Console Page (if applicable):** `Performance`
**Severity:** `Low`

### Description

The Performance page swallows fetch failures when loading historical runs and selected-run results. That leaves the UI with empty state instead of a useful error message when the backend request fails.

### Evidence (from code)

```ts
try {
  const res = await fetch(
    `/api/tests/run?sandboxId=${selectedSandbox}&type=performance`,
  );
  const data = await res.json();
  if (data.ok) setRuns(data.runs ?? []);
} catch {
  /* ignore */
}
```

### Suggested Fix

Record a fetch error and display a retry affordance so failures are visible instead of silent.

## File: app/console/vibetest/page.tsx

## [LOW] Vibetest page suppresses history/load failures

**File:** `app/console/vibetest/page.tsx`
**Line(s):** `85`
**Console Page (if applicable):** `Vibetest`
**Severity:** `Low`

### Description

The Vibetest page ignores failures while loading run history and result data. Users get no indication that the backend request failed, which makes the page look broken or empty.

### Evidence (from code)

```ts
try {
  const res = await fetch(
    `/api/tests/run?sandboxId=${selectedSandbox}&type=vibetest`,
  );
  const data = await res.json();
  if (data.ok) setRuns(data.runs ?? []);
} catch {
  /* ignore */
}
```

### Suggested Fix

Add error state and retry UI around the run-history load path.

## File: app/console/testing/page.tsx

## [LOW] Test Suite page suppresses history/load failures

**File:** `app/console/testing/page.tsx`
**Line(s):** `558`
**Console Page (if applicable):** `Test Suite`
**Severity:** `Low`

### Description

The Test Suite page silently ignores fetch failures while loading run history, so a broken backend looks identical to an empty project. That makes it easy for users to miss a real error.

### Evidence (from code)

```ts
try {
  const res = await fetch(
    `/api/tests/run?sandboxId=${selectedSandbox}&type=suite`,
  );
  const data = await res.json();
  if (data.ok) setRuns(data.runs ?? []);
} catch {
  /* ignore */
}
```

### Suggested Fix

Surface a visible error state and let the user retry the run-history load.

## File: app/console/testing/page.tsx.bak

## [LOW] Stale backup file left in the tracked source tree

**File:** `app/console/testing/page.tsx.bak`
**Line(s):** `1–260`
**Console Page (if applicable):** `Test Suite`
**Severity:** `Low`

### Description

The repository contains a full backup copy of the Test Suite page alongside the real page implementation. That is dead code from the application's perspective and creates a maintenance risk because future edits can diverge from the active page.

### Evidence (from code)

```ts
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Globe,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Shield,
  Code2,
  Zap,
  Sparkles,
  Square,
  BarChart3,
  Clock,
  Activity,
  ChevronRight,
  TestTube2,
} from "lucide-react";
```

### Suggested Fix

Delete the `.bak` file once the active page is confirmed, or move it outside the source tree if it is needed as a reference snapshot.
