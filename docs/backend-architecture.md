# Backend Architecture

## Runtime
- Framework: Next.js App Router route handlers (`src/app/api/**/route.ts`)
- Language: TypeScript
- Session auth: Signed HTTP-only cookie (`fm_session`)
- AI runtime: Genkit (`src/ai/flows/*.ts`)

## Persistent Database
- Current implementation: File-backed JSON database at `data/platform-db.json`
- Storage service: `src/lib/server/store.ts`
- Concurrency: serialized write queue + atomic temp-file rename

## Auth and Security
- Password hashing: `crypto.scryptSync` with per-user salt
- Session tokens: HMAC-SHA256 signed payload with expiration
- Secret source: `APP_SECRET` env var

## API Endpoints
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/users`
- `PATCH /api/users`
- `GET /api/marketplace/products`
- `POST /api/marketplace/products`
- `GET /api/marketplace/listings`
- `POST /api/marketplace/listings`
- `GET /api/buyers`
- `GET /api/prices`
- `POST /api/prices`
- `GET /api/community/posts`
- `POST /api/community/posts`

## AI Flows
- Price trend prediction: `src/ai/flows/predict-price-trends.ts`
- Pest/disease identification: `src/ai/flows/identify-pest-disease.ts`
- Crop detection: `src/ai/flows/detect-crop-type.ts`
- Soil quality prediction: `src/ai/flows/predict-soil-quality.ts`

## Deployment Notes
1. Set env vars (`APP_SECRET`, `GOOGLE_API_KEY`) on host.
2. Ensure host has writable persistent volume for `data/platform-db.json`.
3. For multi-instance production, migrate from file DB to managed DB (PostgreSQL/Firestore) using same service interfaces.
