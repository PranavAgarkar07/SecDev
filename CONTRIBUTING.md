# Contributing to SecDev

Thanks for helping improve SecDev. This repository powers an autonomous deployment, testing, and security platform built with Next.js, TypeScript, E2B, Neon Postgres, Inngest, and Groq. Contributions should fit that stack and respect the platform's security-first design.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Add the upstream remote if you plan to keep your fork synced.
4. Install dependencies with `pnpm install`.
5. Copy your environment file from the project example, then fill in the required values.
6. Run the app locally with `pnpm dev`.
7. Start the Inngest dev server in a separate terminal with `npx inngest-cli@latest dev`.

If you are working on deployment, sandbox, or API flow changes, verify the affected page or route locally before opening a pull request.

## Branch Naming

Use short, descriptive branches and keep the prefix aligned with the change type.

- `feature/<issue-number>-<short-description>`
- `fix/<issue-number>-<short-description>`
- `docs/<short-description>`

Examples:

- `feature/42-console-sidebar-a11y`
- `fix/118-deployment-error-state`
- `docs/update-env-vars-guide`

## Commit Messages

Use Conventional Commits so history stays readable and release notes stay automated.

Format:

`type(scope): short summary`

Common types in this repo:

- `feat` for new functionality
- `fix` for bug fixes
- `docs` for documentation-only changes
- `refactor` for behavior-preserving code changes
- `style` for formatting or non-functional UI changes
- `chore` for maintenance work

Examples:

- `feat(attack-pipeline): add empty-state guidance`
- `fix(email): remove direct console logging`
- `docs(contributing): clarify gssoc flow`

Keep commit messages short, imperative, and focused on one logical change.

## Code Style

Follow the patterns already used in SecDev:

- Use TypeScript everywhere.
- Prefer named exports.
- Keep React components focused on rendering.
- Use App Router conventions in `app/`.
- Put business logic in `lib/` and reusable UI in `components/`.
- Keep route handlers in `app/api/` thin: validate inputs first, then call shared logic.
- Return consistent API errors in the project shape used by the codebase.
- Use `async` / `await` for I/O.
- Avoid `console.log` in production code.
- Keep secrets in environment variables and read them with `process.env`.
- Prefer Tailwind utility classes over inline styles.
- Respect the security model: parameterized queries only, no raw untrusted SQL, and no leaking stack traces to clients.

If you touch deployment, sandbox, or testing flows, keep the E2B and Inngest interactions isolated and explicit.

## Pull Request Process

1. Open an issue first, or comment on an existing issue before you start.
2. Ask to be assigned before you begin work, especially for GSSoC issues.
3. Create a branch from your fork using the naming format above.
4. Make one focused change per PR when possible.
5. Include a clear summary of what changed and why.
6. Add screenshots or short screen recordings for UI changes when useful.
7. Mention any environment variables, migrations, or manual verification steps.
8. Link the issue in the PR description using `Fixes #<issue-number>` when appropriate.
9. Keep your branch up to date with the upstream default branch before requesting review.

## Verification

This repository does not currently ship with a dedicated automated test script. Before opening a PR, run the checks that apply to your change:

- `pnpm lint`
- Manual verification of the touched page, API route, or sandbox workflow
- For UI changes, confirm the console view in both desktop and mobile widths when relevant

If your contribution introduces a new test workflow later, document the exact command in the same PR and update this section.

## GSSoC Contributors

GSSoC contributors, especially first-time open source contributors, are welcome here. If you are unsure where to start, pick a `good first issue`, comment that you want to work on it, and wait for assignment before coding.

Maintainers will help you with scope, review feedback, and project-specific questions. Please keep communication in the issue thread so everyone can follow progress.
