# Manual verification record

This file records checks run for the MVP handoff. Update results when behavior or environment changes.

Last run: 2026-09-09, local Node.js 24 environment.

## Required commands

- `npm run typecheck`
- `npm run build`

Both passed. The Vite client and bundled Express server production artifacts were created successfully.

On 2026-09-09, a fresh mock-mode production server returned HIGH-confidence mixed career/relationship debug output, a deterministic finance answer, and `INVALID_REQUEST` for an empty question. A repeated debug request showed the expected cache hit behavior. A fresh Horoscope outage retried twice and returned qualified MEDIUM-confidence career context; disabling Horoscope, Kundli, and Panchang returned `CONTEXT_UNAVAILABLE` without a generation event. Structured logs retained only operational metadata and did not emit raw gathered profile or astrology payloads.

For the in-code fixture replacement on 2026-09-09, all eight public mock URLs returned 200. Each canonical route matched its `/api/mock/*` alias exactly for User Profile, Kundli, Horoscope, and Panchang. All six user-specific URL variants returned `404 NOT_FOUND` for an unknown ID, and every response contained a request ID matching its response header.

`POST /api/debug/personalization` for `user_101` returned the expected career decision with HIGH confidence. `POST /api/personalize` with an explicit `mock / deterministic` selection returned 200 with authoritative mock metadata. In a fresh process, the first debug request logged four cache misses and the repeated request logged four cache hits, covering profile, Kundli, Horoscope, and Panchang. No database initialization, seed command, or database configuration was used.

## Endpoint matrix

- Generation options discovery through both route aliases, with only `mock / deterministic` exposed in the credential-free environment
- `.env` is loaded by the server before generation configuration is evaluated; the UI labels the credential-free state as “Mock only”
- With an OpenAI key and no `OPENAI_MODELS` override, options discovery exposes GPT-5 Nano, GPT-5.6 Luna, and GPT-5 Mini under OpenAI
- Omitted generation selection using the server default and explicit `mock / deterministic` selection
- Invalid and unavailable provider/model pairs returning `INVALID_GENERATION_SELECTION` before context gathering
- A configured OpenAI model pointed at an unreachable base URL returning `GENERATION_UNAVAILABLE` without mock fallback
- Career, relationship, health, finance, mixed, and general questions through `POST /personalize`
- An independent matching set through `POST /debug/personalization`
- Empty and oversized input validation with safe request-ID errors
- A repeated request showing cache miss then hit
- Profile-only failure with default preferences
- A valid profile payload carrying another user ID, rejected before selection or caching
- One relevant-source failure with qualified confidence and limitations
- All relevant sources unavailable with `CONTEXT_UNAVAILABLE` and no generation
- Real mode without credentials with `GENERATION_UNAVAILABLE`; debug remains usable
- Complete debug exclusions for birth details, ascendant, planet positions, and Panchang yoga

All supported answer and debug requests returned their expected intent, selected sources, confidence, mode, and request ID. On 2026-09-08, options discovery returned only the configured choices and no secrets; omitted and explicit mock requests returned authoritative `mock`, `deterministic`, and `mock` provider/model/mode metadata. An unavailable pair returned `INVALID_GENERATION_SELECTION` (400). A fake allowlisted OpenAI model using an unreachable loopback base URL returned `GENERATION_UNAVAILABLE` (503), with no mock response. Its generation log contained provider/model/mode, latency, and prompt size but not its key or base URL. The unchanged debug request returned its full independent context decision.

Earlier MVP checks remain applicable: empty input returned `INVALID_REQUEST`; malformed JSON returned `INVALID_JSON` (400), and a body over 16 KB returned `PAYLOAD_TOO_LARGE` (413), each with a request ID. A fresh-process Horoscope failure returned MEDIUM career guidance with explicit missing context; a finance request returned `CONTEXT_UNAVAILABLE` because no relevant context survived. A repeated mixed request showed four misses followed by four hits with correlated request IDs. A malformed upstream JSON response was marked unavailable after one attempt. User-specific URL templates containing `{userId}` successfully resolved all three per-user services. An otherwise valid profile for a different user was rejected as an invalid upstream payload; the decision used default preferences and reported the profile source unavailable. Debug output listed all non-selected source fields with reasons, including sensitive astrological and birth fields.

## Browser matrix

- Keyboard navigation and visible focus for user ID, question, samples, and both actions
- Loading skeleton, answer, independent debug, and recoverable error states
- Desktop and 375-pixel narrow viewport with no horizontal overflow
- Real/mock mode, context coverage, supplied sources, missing context, and separate debug evaluation labels

The current implementation defines the desktop shell and a structural breakpoint at 760px, including mobile navigation and inspector sheets, one-column samples, constrained controls, and a composer fixed within the viewport. Controls have programmatic labels, sheets have required titles/descriptions, focus styling is visible, and reduced-motion overrides cover all transitions and animation.

Live desktop and 375×812 visual inspection could not be rerun on 2026-09-08 because the available browser bridge blocked both localhost and 127.0.0.1 URLs. Enter/Shift+Enter, provider-to-model filtering, retry, drawer focus behavior, contrast, and horizontal overflow therefore remain code-reviewed but not visually reconfirmed in this run. The Impeccable static UI detector returned no findings after the final font/style pass.

`npx shadcn@latest info --json` detected the Vite/Tailwind v4 project and its Button, Card, Input, and Textarea components. The Impeccable static UI detector reported no findings after the final style pass.

Real-provider semantics and measured provider token usage were not evaluated as part of the fixture-replacement verification. OpenAI, Anthropic, and Google behavior remains outside this scoped check.
