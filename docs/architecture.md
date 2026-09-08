# Architecture and reviewer handoff

## Request flow

Express validates a bounded `{ userId, question }` request and assigns a request ID. The upstream layer starts Profile, Kundli, Horoscope, and Panchang reads concurrently. Every client independently applies timeout, retry, payload validation, and success-cache behavior, so one unavailable source does not reject aggregation.

The deterministic detector scores configured phrases and returns every matching intent plus a stable primary intent. The selection pipeline resolves each intent against a centralized context catalog, unions and deduplicates fields, orders primary before secondary relevance, and applies the character budget. It separately reports deliberate exclusions, missing expected values, and budget omissions. Generation and standalone debug use this same result; debug stops before the generator boundary.

The backend calculates confidence and source labels. The generator receives only selected context, safe normalized preferences, the question, and missing-context notes. It returns answer text and operational usage metadata. It cannot redefine confidence or sources.

## Key trade-offs

All four services are fetched concurrently even though only selected fields reach the model. Concurrent gathering satisfies the integration contract and keeps latency close to the slowest service; selective generation keeps prompts focused, inspectable, and bounded. An intent-aware fetch plan could reduce upstream traffic, but would hide service behavior and violate this MVP's explicit requirement.

SQLite persists deterministic mock source records between runs. The separate in-memory LRU cache models short-lived upstream reuse without confusing source storage with cache policy. It is simple and safe for one process; production replicas would need an external cache if shared hit rates or invalidation mattered.

Phrase scoring is cheap, deterministic, explainable, and configuration-driven. It misses the ambiguity of unusual language and is not a multilingual classifier, even when the profile requests a supported output language. A future detector can implement the existing interface without changing selection or HTTP contracts.

The context character budget is deterministic and easy to inspect. It is only an approximation of model tokens. Generation therefore records a prompt token estimate in mock mode and measured provider tokens when available, while keeping the output token cap separate from the requested answer word target.

## Confidence rubric

- **HIGH:** profile and all expected selected-intent context survive selection and the budget.
- **MEDIUM:** at least one primary field survives, but profile, expected context, or budgeted context is missing.
- **LOW:** relevant secondary context survives but no primary context does.

Confidence describes context coverage. It does not express predictive truth, astrological certainty, or answer correctness. `sourcesUsed` means the context supplied to generation, not a claim that the answer cited every field.

## Operations and privacy

Structured logs correlate the request route/status/total latency with upstream attempts, latency, cache outcome, unavailable services, selected-context count, prompt size, generation latency, and token usage. Logs omit full questions, selected values, prompts, profile details, credentials, and secrets. SIGINT and SIGTERM stop accepting new connections, allow a five-second graceful close window, then close SQLite.

## Known failure cases manually

Use a fresh process for each scenario so prior in-memory cache entries cannot mask it:

```bash
# Profile failure: relevant career context survives with defaults and MEDIUM confidence
USER_SERVICE_URL=http://127.0.0.1:9 npm run dev:server

# Partial career failure: Kundli survives; missing Horoscope is disclosed
HOROSCOPE_SERVICE_URL=http://127.0.0.1:9 npm run dev:server

# Finance has no relevant source and returns CONTEXT_UNAVAILABLE
HOROSCOPE_SERVICE_URL=http://127.0.0.1:9 npm run dev:server
```

For a timeout rather than a refused connection, point a service URL at a deliberately slow local endpoint and lower `UPSTREAM_TIMEOUT_MS`. Repeat a successful request in one process to see the first `cache: "miss"` followed by `cache: "hit"`. `POST /debug/personalization` works in real mode without credentials because it never calls generation.

## Known MVP limits

The seeded records are demonstration data rather than production calculations. The app has no authentication, conversation history, deployment topology, subscription behavior, precise timeframe matching, or fault-injection UI. Generation does not guarantee an exact word count. Real-provider behavior must be checked in an environment with credentials. No automated tests exist by explicit project policy; verification uses TypeScript, production builds, endpoint smoke checks, and browser inspection.
