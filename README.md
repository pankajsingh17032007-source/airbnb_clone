Here is your updated `README.md` optimized specifically for deploying **Roam Stays** on **Render**, including exact service configuration details for both frontend/backend separation or a combined monolithic setup.

---

# Roam Stays 🌍🏡

> A full-stack short-stay booking and management platform featuring interactive MapLibre maps, per-unit inventory management, 5-minute MongoDB cart holds, and transactional checkouts.

---

## 🚀 Key Features

* **Interactive Globe Discovery:** Built with **MapLibre GL** and **OpenStreetMap** tiles to explore listings across 38 Indian destinations.
* **Per-Room & Service Inventory:** Independent photos, guest capacity, pricing, and available date windows for each unit.
* **Smart Cart & Hold System:** 5-minute inventory holds backed by MongoDB TTL indexes to prevent concurrent booking conflicts.
* **Transactional Checkout:** Atomic checkout operations ensuring zero double-bookings (requires MongoDB Atlas transactions).
* **Role-Based Authentication:** Secure JWT sessions with bcrypt hashing and distinct host/guest roles.
* **Verified Reviews:** Post-stay reviews restricted strictly to guests with completed bookings.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, Vite, MapLibre GL
* **Backend:** Node.js, Express 4
* **Database & ODM:** MongoDB Atlas, Mongoose
* **Authentication:** JSON Web Tokens (JWT), bcrypt

---

## ☁️ Deployment Guide (Render)

Because **Roam Stays** uses a React frontend (Vite) and an Express backend, you can deploy it on Render either as a **Single Monolithic Web Service** (where Express serves the built React static files) or as **Two Separate Services**.

Below are instructions for the recommended **Monolithic Web Service** setup on Render:

### Step 1: Prepare your `package.json` scripts

Ensure your root `package.json` has scripts configured to build both the frontend and backend for production:

```json
"scripts": {
  "build": "npm install && npm --prefix client install && npm --prefix client run build",
  "start": "node server.js"
}

```

*(Adjust `client` and `server.js` paths to match your actual folder structure if they differ).*

### Step 2: Create a New Web Service on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the project.
4. Configure the service settings as follows:

| Setting | Value |
| --- | --- |
| **Name** | `roam-stays` (or your preferred name) |
| **Environment** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free / Starter |

### Step 3: Configure Environment Variables on Render

In your Render service dashboard, go to the **Environment** tab and add the following variables:

* `NODE_ENV` = `production`
* `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster.mongodb.net/roam-stays?retryWrites=true&w=majority` *(Must be a MongoDB Atlas URI or replica set supporting transactions)*
* `JWT_SECRET` = `your_long_random_secret_string_here`
* `PORT` = `4000` (Render will also automatically assign a port via `process.env.PORT`)

Click **Save Changes**, and Render will automatically build and deploy your application.

---

## ⚙️ Running Locally

> **⚠️ Important Note on Transactions:** This application uses MongoDB transactions for booking checkouts. A standalone local MongoDB server will **not** work; you must use **MongoDB Atlas** or a local MongoDB replica set.

### 1. Prerequisites

* Node.js (v18 or later)
* MongoDB Atlas connection string

### 2. Clone and Install

```bash
git clone https://github.com/your-username/roam-stays.git
cd roam-stays
npm install

```

### 3. Environment Variables

Copy `.env.example` to `.env` in your root directory and configure it:

```env
PORT=4000
MONGODB_URI=mongodb+srv://your_cluster_uri
JWT_SECRET=your_jwt_secret
CLIENT_ORIGIN=http://localhost:5173
SEED_HOST_EMAIL=host@example.com
SEED_HOST_PASSWORD=yoursecurepassword

```

### 4. Seed Demo Data (Optional)

```bash
npm run seed

```

### 5. Start Development Servers

```bash
npm run dev

```

* **Vite Frontend:** Runs on `http://localhost:5173` (proxies `/api` requests to Express).
* **Express Backend:** Runs on `http://localhost:4000`.

---

## 📁 API Overview

* **Auth:** `POST /api/auth/register`, `POST /api/auth/login`
* **Listings:** `GET /api/listings` (supports `q`, `type`, `guests`, `maxPrice`, `startDate`, `endDate`), `GET /api/listings/:id`
* **Host Management:** `POST /api/listings`, `PATCH /api/listings/:id`, `DELETE /api/listings/:id`, `GET /api/host/dashboard`
* **Cart & Booking:** `GET /api/cart/holds`, `POST /api/cart/holds`, `DELETE /api/cart/holds/:id`, `POST /api/bookings/checkout`, `GET /api/bookings/mine`, `PATCH /api/bookings/:id/cancel`
* **Reviews:** `GET /api/listings/:id/reviews`, `POST /api/listings/:id/reviews`
* **System:** `GET /api/health`

---

## 📝 Disclaimers

* **Assets:** Images use remote Unsplash URLs, and mapping utilizes OpenStreetMap's public tile service. Check their respective terms of service for production limits.
* **Payments:** Payment integration is intentionally omitted as part of the project scope.
