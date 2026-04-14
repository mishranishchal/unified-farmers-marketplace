# AgriAssist Database Model

## Goal
MongoDB is the primary system of record for the Express backend. The model set is split so admin, farmer, and buyer data are not forced into a single generic document.

## Core Collections

### Identity and access
- `users`: shared login identity, role, verification status, wallet balance, feature access, account status
- `refreshtokens`: refresh-session storage for JWT rotation
- `otpchallenges`: OTP delivery and verification state for login, signup, and password reset
- `adminprofiles`: admin-specific permissions, scopes, review preferences

### Farmer domain
- `farmerprofiles`: farm location, land holding, crop portfolio, soil profile, banking, KYC status
- `products`: farmer listings with pricing, location, quality metrics, analytics, AI analysis fields
- `loanapplications`: farmer credit requests, risk band, admin review, repayment metadata
- `predictionlogs`: AI requests and outputs for disease, soil, grading, and price predictions
- `pricealerts`: threshold and market alerts for commodities

### Buyer domain
- `buyerprofiles`: company, demand, procurement regions, verification, capacity, credit terms
- `orders`: buyer purchases and order lifecycle
- `reviews`: buyer product feedback
- `buyerinteractions`: negotiation and outreach records between buyers and farmers

### Shared platform operations
- `marketprices`: commodity pricing by market, district, trend, source, and observed price
- `transactions`: wallet, payment, payout, refund, and finance ledger entries
- `communityposts`: social/community feed for farmers, buyers, and admins
- `notifications`: in-app or email notification history
- `auditlogs`: admin and user action trail
- `platformconfigs`: singleton platform feature/config document

## Role Visibility

### Admin should query
- `users`
- `adminprofiles`
- `farmerprofiles`
- `buyerprofiles`
- `orders`
- `transactions`
- `loanapplications`
- `communityposts`
- `notifications`
- `auditlogs`
- `platformconfigs`

### Farmer should query
- own `users` record
- own `farmerprofiles` record
- own `products`
- own `loanapplications`
- own `predictionlogs`
- own `pricealerts`
- own `buyerinteractions`
- own `notifications`

### Buyer should query
- own `users` record
- own `buyerprofiles` record
- own `orders`
- own `reviews`
- own `buyerinteractions`
- own `pricealerts`
- own `notifications`

## Fresh Setup
1. Copy `backend/.env.example` to `backend/.env`.
2. Run `docker compose up -d mongo mongo-express`.
3. Open `http://localhost:8081`.
4. Sign in to Mongo Express with:
   - Username: `admin`
   - Password: `agriassist123`
5. Start the backend from `backend/` with `npm run dev` or `npm start`.
6. Seed sample data from `backend/` with `npm run seed`.
7. Refresh Mongo Express and open the `agriassist` database.

## Recommended First Queries
- Admin analytics data: inspect `orders`, `transactions`, `auditlogs`
- Farmer marketplace data: inspect `farmerprofiles`, `products`, `predictionlogs`
- Buyer procurement data: inspect `buyerprofiles`, `buyerinteractions`, `orders`

## Notes
- Mongo Express credentials are local-development defaults. Override them with `MONGO_EXPRESS_USERNAME` and `MONGO_EXPRESS_PASSWORD` before running Docker in any shared environment.
- `platformconfigs` is designed as a singleton document with `key = "platform"`.
- `otpchallenges` is transient data and should normally be short-lived.
