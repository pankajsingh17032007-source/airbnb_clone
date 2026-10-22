# roam stays

A React + Express + MongoDB learning project for browsing short stays, requesting bookings, writing post-stay reviews, and managing host listings.

## Stack

- React 19 and Vite for the responsive client
- Express 4 and Mongoose for the REST API and MongoDB models
- JWT sessions with bcrypt password hashes and host/guest roles
- MapLibre GL globe and OpenStreetMap tiles for interactive listing discovery across 38 Indian destinations
- Per-room/service inventory with separate photos, guest capacity, prices, and availability dates
- Five-minute MongoDB cart holds and transactional checkout with overlap prevention

## Run locally

Requirements: Node.js 18 or later and MongoDB Atlas, or a local MongoDB replica set. Transactions are used when confirming a booking, so a standalone local MongoDB server is not sufficient.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long, random `JWT_SECRET`.
3. Start the app using `npm run dev`. Vite runs on port 5173 and proxies `/api` requests to Express on port 4000.
4. Seed optional demo listings and create one available demo unit per existing demo listing using `npm run seed`. Set `SEED_HOST_EMAIL` and `SEED_HOST_PASSWORD` in `.env` first. The demo host can sign in and open the host dashboard.

MongoDB Atlas connection strings use the `mongodb+srv://` format. Keep `.env` private and never commit database credentials or signing secrets.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/listings`, `GET /api/listings/:id`
- `POST /api/listings`, `PATCH /api/listings/:id`, `DELETE /api/listings/:id` (host-owned listings)
- `GET /api/cart/holds`, `POST /api/cart/holds`, `DELETE /api/cart/holds/:id`
- `POST /api/bookings/checkout`, `GET /api/bookings/mine`, `PATCH /api/bookings/:id/cancel`
- `GET /api/listings/:id/reviews`, `POST /api/listings/:id/reviews`
- `GET /api/host/dashboard`
- `GET /api/health`

Listing search accepts `q`, `type`, `guests`, `maxPrice`, `startDate`, and `endDate`; it returns only inventory units free for those dates. Each host listing contains one or more inventory units, each with its own image, price, guest limit, and date window. Adding one to a guest's cart creates a five-minute hold. Expired holds are ignored immediately and removed by MongoDB's TTL index. Checkout confirms the selected holds in one transaction so concurrent requests cannot double-book a unit. Reviews require the guest's completed booking.

## Deploy

The Express server serves the built Vite `dist/` directory when `NODE_ENV=production`. On a Node host such as Render, use `npm install` as the build command and `npm run build` as an additional build step (or `npm run build` as the build command), then `npm start` to launch. Configure `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN` in the host's environment settings. The database must support MongoDB transactions; MongoDB Atlas does.

Images are remote Unsplash URLs and the map uses OpenStreetMap's public tile service. Review their terms and usage limits before a public launch. Payments are intentionally not collected.