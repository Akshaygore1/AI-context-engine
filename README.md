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

## API

`POST /api/personalize` and `POST /api/debug/personalization` accept:

```json
{ "userId": "user_101", "question": "What should I focus on to grow in my career?" }
```

The debug endpoint runs the same context decision without generation. Mock service contracts are available at `GET /api/mock/users/:userId`, `/api/mock/kundli/:userId`, `/api/mock/horoscope/:userId`, and `/api/mock/panchang`. Set `UPSTREAM_BASE_URL` to replace their common base address.

The weighted phrase configuration supports career, relationship, health, finance, and mixed-topic questions, with a general fallback. Matching is deterministic: ties use the documented intent order, and mixed matches union fields before applying the primary-first `CONTEXT_MAX_CHARS` budget. Add phrases in `server/personalization/intent.ts`, fields in the centralized catalog, and mappings in `server/personalization/rules.ts`.

Profile language and tone are normalized to supported values, falling back to English and supportive. The phrase classifier is intentionally limited with unusual wording and multilingual questions; response language preferences do not make classification multilingual. Confidence means coverage of expected context, including budget omissions. Sources identify context supplied to generation, rather than claims cited in the prose. Birth details, subscription behavior, conversation history, precise timeframe matching, and guaranteed predictions are outside this MVP.
