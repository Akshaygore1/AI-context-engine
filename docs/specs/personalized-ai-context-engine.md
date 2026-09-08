# Personalized AI Context Engine — MVP

## Problem Statement

MyNaksh has structured User Profile, Kundli, Horoscope, and Panchang services, but an LLM needs a focused, personalized interpretation of those inputs to answer a user's question. Sending every field for every question wastes prompt space, hides the reasoning behind context selection, and makes failures difficult to handle consistently.

The assignment requires an intelligence layer between those services and an LLM. Reviewers must be able to understand its architecture, extend its rules, and inspect its decisions. The candidate needs a runnable TypeScript implementation and a small demonstration UI that make those trade-offs easy to explain.

## Solution

Build an Express backend in TypeScript with SQLite-backed mock upstream services, a configuration-driven personalization pipeline, and Vercel AI SDK for answer generation. Provide a simple React UI using shadcn/ui components for entering questions, displaying answers, and inspecting personalization decisions.

Fetch upstream context concurrently, detect one or more intents deterministically, select only configured relevant fields, apply the profile's language and tone, and construct a compact prompt. Compute confidence and source metadata in the backend. Support useful partial responses when relevant data is missing and a structured unavailable response when no relevant context remains.

The MVP prioritizes clear boundaries and explainable decisions. It does not include subscription behavior, precise timeframe matching, or automated tests.

## User Stories

1. As a demo user, I want to enter a user ID and question, so that I can request personalized guidance.
2. As a user, I want career questions to use career-related information, so that unrelated topics do not distract from the answer.
3. As a user, I want relationship questions to use relationship-related information, so that the answer addresses my concern.
4. As a user, I want health questions to use health-related information, so that the response stays relevant.
5. As a user, I want finance questions to use available finance guidance, so that the response does not invent missing financial context.
6. As a user, I want broad questions to receive a compact overview, so that I can get general guidance.
7. As a user, I want questions spanning multiple topics to include relevant context for each, so that the engine does not silently discard part of my question.
8. As a user, I want responses in my profile language and tone, so that guidance matches my preferences.
9. As a user, I want a consistent response length regardless of subscription, so that no premium behavior affects this MVP.
10. As a user, I want an answer when some relevant services fail, so that a partial outage does not unnecessarily block guidance.
11. As a user, I want limitations acknowledged when relevant information is missing, so that I understand the answer's basis.
12. As a user, I want a clear error when no relevant context is available, so that unsupported guidance is not presented as grounded.
13. As a user, I want confidence and sources alongside the answer, so that I can understand its context coverage.
14. As a reviewer, I want a debug endpoint that never calls the LLM, so that I can inspect personalization independently of generation.
15. As a reviewer, I want to see selected and excluded context with concise reasons, so that I can explain how the engine works.
16. As a reviewer, I want a simple UI with an inspectable context breakdown, so that I can demonstrate the intelligence layer visually.
17. As a reviewer, I want sample questions covering the supported intents, so that I can explore behavior quickly.
18. As a developer, I want intent and selection rules expressed as configuration, so that adding a topic does not require a large conditional chain.
19. As a developer, I want the intent detector replaceable, so that a future classifier can improve language understanding without rewriting orchestration.
20. As a developer, I want a swappable LLM integration through Vercel AI SDK, so that a provider change does not affect personalization rules.
21. As a developer, I want a clearly identified mock generation mode, so that the app can run without an API key.
22. As a developer, I want concurrent upstream fetching with bounded retries and timeouts, so that slow dependencies have controlled impact.
23. As a developer, I want successful upstream reads cached in memory, so that repeated requests avoid unnecessary work.
24. As an operator, I want request, latency, cache, failure, and prompt-size logging, so that I can understand performance and degradation.
25. As a developer, I want SQLite-backed seed data and documented startup commands, so that the demonstration is reproducible locally.
26. As a maintainer, I want a written prohibition on tests, so that future agents respect the agreed MVP constraint.
27. As a candidate, I want architecture and trade-offs documented, so that I can defend the implementation in the follow-up discussion.

## Implementation Decisions

### Stack and boundaries

- Use TypeScript throughout, Express for HTTP, SQLite for local mock data, React for the UI, and shadcn/ui for interface components. Express is selected over NestJS to keep this small service straightforward.
- Separate HTTP validation/error mapping, upstream clients, cache/retry policy, intent detection, context-selection configuration, personalization, prompt construction, LLM generation, and logging.
- SQLite stores seeded mock service data, not the required upstream cache. Do not introduce conversation persistence or user management.
- Serve mock User, Kundli, Horoscope, and Panchang endpoints over HTTP so the upstream client behavior is demonstrable. Keep upstream addresses configurable for replacement with real services.

### API contracts

- `POST /personalize` accepts `userId` and `question` as nonempty strings with reasonable size limits. It returns `answer`, `confidence` (`HIGH`, `MEDIUM`, or `LOW`), and `sourcesUsed` as human-readable labels.
- `POST /debug/personalization` accepts the same request and runs the same gathering and personalization pipeline without invoking an LLM. Return the primary `intent`, all matched `intents`, selected and excluded context labels, language, tone, shared word limit, and concise selection or availability reasons.
- Backend source metadata denotes context supplied to generation; it is not a claim that every field was cited in the answer. Explain this meaning in the UI and documentation.
- Use consistent structured errors with a stable code, safe message, and request ID. Invalid input is a client error; no relevant context or unavailable generation is a service-unavailable error. Do not expose internal stack traces or credentials.
- Provide the supplied mock contracts: `GET /users/{userId}`, `GET /kundli/{userId}`, `GET /horoscope/{userId}`, and `GET /panchang`.
- Seed `user_101` using the assignment's supplied data and schemas. Do not add validity-date fields. A supplied subscription field may remain in the mock contract but has no effect anywhere in personalization or UI.

### Upstream resilience and caching

- Start all four upstream reads concurrently for every pipeline execution; cache hits may satisfy reads without a network call. Do not replace this explicit assignment requirement with intent-based fetching.
- Bound each network attempt with a timeout and limit retry attempts. Retry transient network errors, rate limits, and upstream server errors with short backoff; do not retry permanent client errors such as missing users.
- Treat each result independently so one failed service does not reject the entire aggregation. Validate upstream shapes before use and classify invalid payloads as unavailable.
- Cache successful results with configurable TTLs and bounded capacity. Include service and user ID in user-specific keys; Panchang uses its own global key. Do not cache failures as successful data.
- Keep missing data separate from deliberately excluded context so debug output explains both accurately.
- If the profile is unavailable but relevant astrological context exists, use documented defaults for language and tone and disclose degraded personalization.

### Intent detection and context rules

- Use a deterministic, configuration-driven weighted phrase detector with multiple matches and a general fallback. Return a stable primary intent for compatibility with the assignment's response shape.
- Document that phrase matching has limits with unusual wording and multilingual intent detection. Profile language personalization does not imply a multilingual classifier.
- Career: primary context is Career Horoscope and 10th House; secondary context is Current Dasha and Panchang.
- Relationship: primary context is Relationship Horoscope and 7th House; secondary context is Moon Sign and Current Dasha.
- Health: primary context is Health Horoscope and 6th House; secondary context is Moon Sign and Panchang.
- Finance: use Finance Horoscope as primary context. Do not invent finance houses absent from the supplied schema.
- General: include the four horoscope summaries plus compact Kundli and Panchang summaries, subject to the shared prompt budget.
- For multiple intents, combine and deduplicate their allowed fields, prioritizing primary context. A field relevant to one matched intent must not be excluded merely because it is irrelevant to another.
- Represent context with stable identifiers, readable labels, values, source identity, and relevance priority. Rules reference these identifiers rather than copying extraction logic.
- Exclude unrelated fields for specific intents. Keep birth details, subscription, and unused profile fields out of the generation prompt.
- Do not implement date validity or timeframe matching for phrases such as today, this month, or this year. Do not imply that the sample data proves precise timing predictions.

### Personalization, confidence, and generation

- Derive language and tone from the user profile, normalize them to supported safe values, and use documented defaults for missing or unsupported values.
- Use one configurable response word limit for all users. Subscription never affects context access, output length, or any other behavior.
- Select context deterministically and impose a configurable prompt/context budget. Keep primary fields ahead of secondary fields and record budget exclusions in debug output. Keep the model output token cap distinct from the word target.
- Build the prompt from the question, selected context, response preferences, and concise grounding instructions. Treat user questions and upstream strings as untrusted content, not instructions that can override system behavior.
- Use Vercel AI SDK behind a small generation boundary with configurable provider/model credentials and a bounded generation timeout. The LLM generates only the answer; the backend owns confidence and source labels.
- Provide an explicit mock implementation for credential-free demonstration. Clearly disclose mock mode and its limitations; do not silently substitute a mock answer after a configured real provider fails.
- Confidence describes selected-context coverage, never the truth or predictive certainty of astrology. Use a documented deterministic rubric: HIGH when expected relevant context and profile are available, MEDIUM when relevant primary context remains but expected context or profile is missing, LOW when only relevant secondary context remains. Calculate against the selected intents and account for budget omissions.
- With some relevant context available, return a qualified answer and lower confidence as appropriate. With no relevant astrological context, return a structured unavailable error instead of generating an answer from profile data alone.
- Ask generation to stay grounded, acknowledge missing relevant information, avoid invented astrological facts, and frame guidance without guaranteed predictions or medical/financial directives.

### Demo UI and operations

- Provide a user ID input, question input, sample-question shortcuts, submit action, loading state, and clear recoverable error feedback.
- Display the answer, backend-calculated confidence, source labels, and visible generation mode. Include an inspection panel for intent, selected/excluded context, preferences, and availability reasons.
- Provide a separate debug action that works without an API key and never triggers answer generation. If inspection and generation are separate requests, present the debug result as its own evaluation rather than implying an atomic shared snapshot.
- Use shadcn/ui components for the form and AI response presentation. Keep the layout responsive and inputs labeled; a full chatbot product or specialized third-party AI component package is not required.
- Log request IDs, routes, status, total latency, upstream latency, attempts, cache hit/miss, unavailable services, selected context count, and prompt size. Log actual provider token usage when available and distinguish estimates from measured token counts.
- Avoid logging full questions, birth details, prompts, or credentials by default. Implement graceful shutdown for the HTTP server and database connection.
- Document setup, environment variables, seed behavior, endpoints, mock versus real generation, configuration extension, confidence meaning, and known MVP limitations.
- Add a root agent instruction file explicitly stating: "Don't write tests."

## Testing Decisions

- The user's explicit instruction overrides earlier discussion of focused tests and the skill's default test-seam interview: do not write tests, test suites, test scripts, or install a test framework.
- No modules are scheduled for automated testing. There is no existing implementation or testing prior art in this repository; it currently contains only a README.
- Verify through TypeScript checking, production builds, and manual smoke checks at the public HTTP and browser boundaries. Assess observable behavior rather than internal implementation details.
- Manually exercise representative supported questions, debug-without-generation, invalid requests, cache reuse, partial upstream failure, complete relevant-context failure, and credential-free mock mode. Exercise real generation only when credentials are available.
- Check the UI's loading, error, answer, and debug states and a narrow viewport. Record actual verification results and unverified limitations in the implementation handoff.

## Out of Scope

- Automated tests, test frameworks, and test files.
- Subscription tiers, premium gating, or subscription-dependent response length.
- Precise timeframe detection, validity-date schema extensions, stale-data matching, and date-based astrological forecasting.
- Production astrology calculations or external production service implementations.
- LLM-based intent classification, embeddings, vector search, RAG infrastructure, or autonomous agent workflows.
- Authentication, account management, billing, conversation history, and a full chatbot product.
- Distributed caching, queues, microservice deployment infrastructure, and production hosting.
- Advanced multilingual classification and guaranteed word-count or prediction accuracy.

## Further Notes

The evaluator values architecture, maintainability, context optimization, and explainable trade-offs more than feature count. The UI is an agreed addition for demonstration; the backend personalization engine remains the core deliverable.

All-upstream concurrent gathering and selective LLM context are complementary: the former fulfills the service-fetching requirement, while the latter limits what reaches generation. SQLite persists the mock data, while in-memory caching reduces repeated upstream calls.

The final stack is Express rather than NestJS. Earlier proposals involving subscription-based length, timeframe validity, and automated tests were explicitly rejected and must not reappear during implementation.

Exact timeout, retry, cache TTL, prompt-budget, and shared response-length values are routine implementation defaults to centralize and document, not reasons to restart the design interview.
