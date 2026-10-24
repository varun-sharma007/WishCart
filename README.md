# Wishcart

Wishcart is a curated product-discovery site. It helps visitors find deals and recommendations, then sends them to a trusted merchant to buy. It intentionally has no cart, checkout, customer accounts, or payment handling.

## What is included

- `frontend/` — Next.js App Router storefront: deals, best items, explore filters, detail pages, suggestion form, and explicit outgoing-link confirmation.
- `backend/` — Spring Boot modular-monolith API with versioned public endpoints, protected admin API boundary, validation, JWT resource-server configuration, Flyway migrations, and click recording.
- `docker-compose.yml` — local development wiring (provide your Supabase Postgres settings in `.env`).

## Start locally

1. The Supabase URL and publishable key are already configured in [`.env`](./.env). Add only `DATABASE_PASSWORD` from Supabase Dashboard → **Connect** before starting the Spring API. Do not commit real secrets.
2. Start the API: `cd backend; ./mvnw spring-boot:run` (or `mvn spring-boot:run`).
3. Start the storefront: `cd frontend; npm install; npm run dev`.

The frontend includes useful demo data only when `NEXT_PUBLIC_API_URL` is left at the local default and the API is unavailable. Once the API has data, it is the source of truth.

## Production notes

Deploy the frontend and API independently. Supply every `.env` value through your host's secret manager and configure Supabase Auth for admins. The database already contains the baseline Wishcart schema, has RLS enabled, and includes four starter products.

