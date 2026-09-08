# Manual verification record

This file records checks run for the MVP handoff. Update results when behavior or environment changes.

Last run: 2026-09-08, local Node.js 24 environment.

## Required commands

- `npm run typecheck`
- `npm run build`

Both passed. The Vite client and bundled Express server production artifacts were created successfully.

## Endpoint matrix

- Career, relationship, health, finance, mixed, and general questions through `POST /personalize`
- An independent matching set through `POST /debug/personalization`
- Empty and oversized input validation with safe request-ID errors
- A repeated request showing cache miss then hit
- Profile-only failure with default preferences
- One relevant-source failure with qualified confidence and limitations
- All relevant sources unavailable with `CONTEXT_UNAVAILABLE` and no generation
- Real mode without credentials with `GENERATION_UNAVAILABLE`; debug remains usable

All supported answer and debug requests returned their expected intent, selected sources, confidence, mode, and request ID. Empty input returned `INVALID_REQUEST`; malformed JSON returned `INVALID_JSON` (400), and a body over 16 KB returned `PAYLOAD_TOO_LARGE` (413), each with a request ID. A fresh-process Horoscope failure returned MEDIUM career guidance with explicit missing context; a finance request returned `CONTEXT_UNAVAILABLE` because no relevant context survived. A repeated mixed request showed four misses followed by four hits with correlated request IDs. A malformed upstream JSON response was marked unavailable after one attempt. User-specific URL templates containing `{userId}` successfully resolved all three per-user services. Explicit real mode without a key returned `GENERATION_UNAVAILABLE`, while debug remained successful.

## Browser matrix

- Keyboard navigation and visible focus for user ID, question, samples, and both actions
- Loading skeleton, answer, independent debug, and recoverable error states
- Desktop and 375-pixel narrow viewport with no horizontal overflow
- Real/mock mode, context coverage, supplied sources, missing context, and separate debug evaluation labels

Chrome was inspected at its desktop viewport and at 375×812. The career answer, independent debug, and invalid-input error states were exercised through the visible controls. The narrow layout reflowed to one column without horizontal clipping. Keyboard semantics and accessible names were present in the browser accessibility tree; visible focus styling is defined for form controls, sample controls, and actions.

`npx shadcn@latest info --json` detected the Vite/Tailwind v4 project and its Button, Card, Input, and Textarea components. The Impeccable static UI detector reported no findings after the final style pass.

Real-provider generation was not called because no credential was available. Provider success behavior and measured provider token usage remain unverified in this environment.
