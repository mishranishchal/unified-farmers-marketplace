# AgriAssist Backend API Documentation

Base URL: `http://localhost:8080/api`

All responses follow:

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

## Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Users
- `GET /users` (admin)
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/wallet`
- `POST /users/wallet/topup`

## Products
- `GET /products`
- `GET /products/:id`
- `POST /products` (farmer/admin)
- `PATCH /products/:id` (farmer/admin)
- `POST /products/:id/analyze` (farmer/admin)

## Price Discovery
- `GET /prices`
- `POST /prices/suggest`

Formula:
`Psuggested = Pbase × (1 + αDlocal − βSlocal)`

Configurable env params: `PRICE_ALPHA`, `PRICE_BETA`.

## Orders
- `POST /orders` (buyer/admin)
- `GET /orders/my` (buyer/admin)
- `GET /orders/:id`
- `PATCH /orders/:id/status` (admin)
- `PATCH /orders/:id/cancel`

Lifecycle:
- `created -> paid -> shipped -> delivered`
- Cancellation allowed only for `created` and `paid`.

## Reviews
- `POST /reviews` (buyer/admin)
- `GET /reviews/product/:productId`

## Payments (Razorpay)
- `POST /payments/create-order`
- `POST /payments/verify`
- `POST /payments/webhook`

## Agri-Trust KYC
- `POST /kyc/upload` (farmer)
- `GET /kyc/pending` (admin)
- `POST /kyc/review` (admin)

## Admin Analytics
- `GET /admin/analytics` (admin)

Includes:
- Total revenue
- Active users
- Orders per day
- Farmer earnings
- Top products
- Subscription metrics
- Commission collected

## Security and Production Hardening
- JWT access + refresh tokens
- Secure cookie support
- Role-based middleware
- Rate limiting
- Helmet headers
- CORS whitelist
- XSS + NoSQL injection mitigation
- HPP
- Winston logging
- Centralized error handling

## Environment Setup
1. Copy `backend/.env.example` to `backend/.env` and set secrets.
2. Copy `ai-service/.env.example` to `ai-service/.env`.
3. Run `docker compose up --build`.
4. Optional but recommended: open Mongo Express at `http://localhost:8081` to inspect collections.

See `backend/docs/DATABASE_MODEL.md` for the collection map and role-specific data layout.

## Testing
- `npm test` inside `backend/` runs:
  - Auth tests
  - Order lifecycle tests
  - Payment tests
