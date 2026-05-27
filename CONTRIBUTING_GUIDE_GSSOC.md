# GSSoC Contribution Guide for SecDev

This guide is for GirlScript Summer of Code contributors working on SecDev. It explains how to claim an issue, get assigned, and work with maintainers in a way that keeps the project organized and reviewable.

## Before You Start

SecDev is a security-focused Next.js and TypeScript project. Please read the issue carefully before commenting, and choose tasks that match your current experience level.

If you are new to open source, start with a `good first issue` and ask questions early in the issue thread.

## How to Claim an Issue

1. Open the issue you want to work on.
2. Comment clearly that you want to work on it.
3. Mention that you are participating in GSSoC.
4. Wait for a maintainer to assign you before starting implementation.
5. If the issue is already assigned, pick another one instead of duplicating work.

Example comment:

`I would like to work on this issue for GSSoC. Please assign it to me if it is still available.`

## How Assignment Works

Do not start coding until the issue is assigned to you.

Maintainers may ask you to confirm:

- What part of the issue you plan to handle
- Whether you understand the scope and acceptance criteria
- Whether you need help with setup or architecture

If the maintainer asks for a smaller first step, follow that direction before expanding the change.

## Point System

The following point system is recommended for SecDev GSSoC work. Final allocation can be adjusted by the maintainers or GSSoC mentors based on actual complexity.

- Easy: 5 points
- Medium: 10 points
- Hard: 15 points

Use these labels consistently when you open or update issues so contributors can choose tasks that match their comfort level.

## Difficulty Expectations

### Easy

- Small UI or docs updates
- Minor cleanup in a single component or route
- Simple validation or empty-state improvements

### Medium

- Changes that touch more than one component or route
- Refactors that improve maintainability without changing the overall product direction
- Better error handling, accessibility, or structured state management

### Hard

- Larger feature work across UI, API, and shared logic
- Work that touches deployment, sandbox orchestration, or security pipeline behavior
- Changes that require careful testing of multiple flows

## Mentor Contact Expectations

Use the issue thread as the primary communication channel.

- Keep updates public in the issue so maintainers and other contributors can follow along.
- Ask for clarification before coding if the issue scope is unclear.
- Share progress when you begin, when you are blocked, and when you open a pull request.
- Do not DM mentors unless the repository explicitly provides a private support channel for that purpose.

If you are blocked for more than 24 to 48 hours, leave a polite follow-up comment in the issue thread and wait for a maintainer response.

## Good Working Practices

- Work on one issue per branch.
- Keep your changes aligned with the existing code style.
- Avoid scope creep; if you discover extra work, mention it in the issue instead of silently expanding the PR.
- Link the issue number in your pull request.

## What Makes a Good GSSoC Contribution Here

For SecDev, good contributions are usually small, clear, and useful to the platform's core flows:

- Console UX improvements
- Error and empty-state handling
- Accessibility fixes
- Security-safe refactors
- Documentation that helps new users understand deployment, testing, or sandbox behavior

## GSSoC Labels & Scoring (Project-specific)

Maintainers use the following labels and scoring rules to award points for merged PRs. Apply the `gssoc:approved` label once a contribution meets the project standards (tests, style, and review).

- **gssoc:approved** : +50 pts (base for every approved PR)

Difficulty (pick one):

- **level:beginner** : +20 pts
- **level:intermediate** : +35 pts
- **level:advanced** : +55 pts
- **level:critical** : +80 pts

Quality multiplier (optional):

- **quality:clean** : ×1.2
- **quality:exceptional** : ×1.5

Type bonus (optional, stackable):

- **type:docs** : +5
- **type:bug** : +10
- **type:feature** : +10
- **type:testing** : +10
- **type:design** : +10
- **type:refactor** : +10
- **type:accessibility** : +15
- **type:performance** : +15
- **type:devops** : +15
- **type:security** : +20

Formula (recommended):

```
50 + (difficulty × quality) + type bonus
```

Requirements to award points:

- PR must be **merged**
- At least **one review** approved
- PR must carry the **gssoc:approved** label (added by maintainers)

Maintainers may adjust final points based on actual impact and implementation quality.
