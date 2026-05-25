# Good First Issues for SecDev

These starter issues are tailored to SecDev's current codebase and its Next.js, TypeScript, E2B, Neon, and Inngest architecture. They are intentionally scoped so a new contributor can learn the project without needing to change the entire system.

## 1. Improve the SecDev Placeholder Screen

**Problem**: Several console surfaces still rely on the shared placeholder UI, and the current message is generic.

**Expected outcome**: Make the placeholder more informative for SecDev by adding context-specific copy and a clearer call to action for each page that uses it.

**Skills needed**: React components, Tailwind CSS, basic Next.js App Router structure.

**Difficulty**: Easy

**Relevant files or folders**:

- `components/console/not-implemented.tsx`
- `app/console/*/page.tsx`

## 2. Make the Console Sidebar More Accessible

**Problem**: The console sidebar is functional, but the collapse and group-toggle interactions can be improved for keyboard and screen-reader users.

**Expected outcome**: Add better accessibility labels, clearer focus behavior, and more descriptive toggle states while keeping the current design.

**Skills needed**: React event handling, accessibility basics, Lucide icons, Tailwind CSS.

**Difficulty**: Easy

**Relevant files or folders**:

- `components/console/sidebar.tsx`
- `app/console/layout.tsx`

## 3. Remove Direct Console Logging from the Email Service

**Problem**: The email service still emits an info-level `console.log` path, which does not match the project's production logging expectations.

**Expected outcome**: Replace direct console logging with the project's structured logging approach so email events are handled consistently.

**Skills needed**: TypeScript, async/await, service-layer refactoring, logging hygiene.

**Difficulty**: Easy

**Relevant files or folders**:

- `lib/email/mail-service.ts`
- `lib/email/brevo.ts`
- `lib/email/notifications.ts`

## 4. Add Better Empty-State Copy to the Logs Page

**Problem**: The console logs view should guide users more clearly when no sandbox is selected or no log lines are available yet.

**Expected outcome**: Show helpful empty and error states so contributors can understand what to do next instead of seeing a blank or confusing view.

**Skills needed**: React state rendering, conditional UI, Next.js data fetching.

**Difficulty**: Easy

**Relevant files or folders**:

- `app/console/logs/page.tsx`
- `components/console/*`

## 5. Improve Repository Browser Copy and CTA Clarity

**Problem**: The repository browser is one of the first user-facing flows in SecDev, and its cards/tables can explain the deploy action more clearly.

**Expected outcome**: Refine the copy in the repository browser so users immediately understand what each repository state means and what happens when they click deploy.

**Skills needed**: React components, UX copywriting, conditional rendering, TypeScript.

**Difficulty**: Medium

**Relevant files or folders**:

- `components/console/repository-card.tsx`
- `components/console/repository-table.tsx`
- `components/console/repository-list.tsx`
- `app/console/projects/page.tsx`
