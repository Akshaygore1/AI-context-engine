# Agent instructions

Follow the shared shell instructions in `/Users/akshay/.codex/RTK.md`.

## Verification policy

Don't write tests. Do not add test files, test suites, test frameworks, or test scripts. This is an explicit user requirement for this MVP and overrides skill defaults that request tests or test planning.

Verify implementation using TypeScript checks, production builds, and manual endpoint/UI smoke checks. Report what was actually checked and any limitations.

## Project direction

Build the Personalized AI Context Engine in TypeScript using Express, typed in-code mock fixtures, React, shadcn/ui, and Vercel AI SDK. Follow the published MVP spec. Keep personalization configuration-driven. No subscription tiers or timeframe matching in this MVP.

## Agent skills

### Issue tracker

Use GitHub Issues in `Akshaygore1/AI-context-engine`. External PRs are not a triage request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the standard five triage role names. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout. See `docs/agents/domain.md`.
