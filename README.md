# Personalized AI Context Engine

An explainable TypeScript MVP that gathers mock astrological context, selects the fields relevant to a question, and shows both a generated answer and the decision behind it.

## Local setup

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

Open `http://localhost:5173` and use `user_101`. The API runs at `http://localhost:3001`. The database is seeded automatically on server startup, so `npm run seed` is optional and useful when you want to reset the sample records.

## Commands

- `npm run dev` — run the Express API and Vite UI
- `npm run seed` — replace the SQLite demo records
- `npm run typecheck` — check browser and server TypeScript
- `npm run build` — type-check and create production client/server bundles
- `npm start` — run the built API after `npm run build`

## Environment

Copy `.env.example` for the full list. The main groups are:

- Server and UI: `PORT`, `WEB_ORIGIN`, `DATABASE_PATH`
- Upstreams: `UPSTREAM_BASE_URL` or the four service-specific URL overrides
- Resilience: timeout, attempt, backoff, cache TTL, and cache-capacity settings
- Personalization: `RESPONSE_MAX_WORDS` and `CONTEXT_MAX_CHARS`
- Generation: `GENERATION_MODE`, provider/model credentials, generation timeout, and output-token cap

## API

`POST /personalize` and `POST /debug/personalization` accept:

```json
{ "userId": "user_101", "question": "What should I focus on to grow in my career?" }
```

The debug endpoint runs the same context decision without generation. Mock service contracts are available at `GET /users/:userId`, `/kundli/:userId`, `/horoscope/:userId`, and `/panchang`. `/api/mock/*` aliases support the default internal service base. Set `UPSTREAM_BASE_URL` to replace their common base address or use the service-specific URL variables.

The weighted phrase configuration supports career, relationship, health, finance, and mixed-topic questions, with a general fallback. Matching is deterministic: ties use the documented intent order, and mixed matches union fields before applying the primary-first `CONTEXT_MAX_CHARS` budget. Add phrases in `server/personalization/intent.ts`, fields in the centralized catalog, and mappings in `server/personalization/rules.ts`.

Useful samples include “What should I focus on to grow in my career?”, “How can I bring more patience to my relationship?”, “What routines could support my health and energy?”, “How should I approach my financial priorities?”, “How can I balance career growth with my relationship?”, and the general “What themes should I keep in mind right now?”.

Profile language and tone are normalized to supported values, falling back to English and supportive. The phrase classifier is intentionally limited with unusual wording and multilingual questions; response language preferences do not make classification multilingual. Confidence means coverage of expected context, including budget omissions. Sources identify context supplied to generation, rather than claims cited in the prose. Birth details, subscription behavior, conversation history, precise timeframe matching, and guaranteed predictions are outside this MVP.

## Resilience and cache

All four upstream reads start concurrently. Each uses `UPSTREAM_TIMEOUT_MS`, `UPSTREAM_MAX_ATTEMPTS`, and `UPSTREAM_RETRY_BACKOFF_MS`; network errors, rate limits, and server errors are retried, while permanent client errors and malformed payloads are not. Successful validated payloads enter a bounded in-memory LRU cache for `CACHE_TTL_MS`. User-specific keys include the service and user ID; Panchang has one global key. Failures are never cached as successes.

To demonstrate partial failure locally, stop the server and restart it with one explicit service URL unavailable, such as `HOROSCOPE_SERVICE_URL=http://127.0.0.1:9 npm run dev:server`. Set both horoscope and Kundli URLs to that address to demonstrate an all-relevant-source failure for a career request. Use a fresh process so previous cache entries cannot satisfy the read. Repeating a successful request shows `cache: "hit"` events in the structured server logs.

## Answer generation

`GENERATION_MODE=mock` is the credential-free default and is visibly disclosed in every answer. Its deterministic prose is useful for demonstrating selection, not evaluating answer quality. For real generation, set `GENERATION_MODE=real`, `AI_PROVIDER=openai`, `AI_MODEL`, and `OPENAI_API_KEY`. `OPENAI_BASE_URL` can point the OpenAI provider adapter at a compatible endpoint. Provider choice and SDK details remain confined to `server/generation`; personalization rules do not depend on them.

Generation uses a separate `GENERATION_MAX_OUTPUT_TOKENS` safety cap and `GENERATION_TIMEOUT_MS`; the configured response word target remains a user-facing instruction rather than a token limit. A configured real request never falls back to mock output when configuration or provider calls fail. Those failures return a safe `GENERATION_UNAVAILABLE` response with the request ID. Structured logs record prompt size, latency, estimated input tokens in mock mode, and measured provider usage when available, without recording questions, prompts, credentials, or birth data.
