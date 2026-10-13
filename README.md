# FADE — barber booking web app

The web app (installable as a PWA) for [barber-booking-api](https://github.com/Gkony21/barber-booking-api).
Customers find a barber, pick a service, day and free time, and book; payment happens in the shop.

Stack: React 19 + TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, i18next (Greek, ready for English), Vitest.

## Run locally

1. Start the API (see its README) on `http://localhost:8080`, with Docker running for Mailpit.
2. Install and start the web app:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:5173. Emails (verification, bookings) arrive in Mailpit at http://localhost:8025.

To point at a different API, copy `.env.example` to `.env.local` and change `VITE_API_URL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit and component tests |
| `npm run lint` | Lint with oxlint |
| `npm run build` | Type-check and production build (`dist/`) |
| `npm run generate-icons` | Regenerate the PNG app icons from `public/favicon.svg` |

## Structure

```
src/
  api/        API client (errors as ApiError/NetworkError) and typed endpoints
  auth/       Session from the JWT, AuthProvider/useAuth
  components/ Shared UI (buttons, fields, app shell)
  i18n/       UI copy — el.ts; add en.ts with the same keys for English
  lib/        Formatting (Athens time, euro) and helpers
  pages/      One file per screen
  test/       Test setup and helpers
```

Design: direction "B · FADE" — charcoal ground, amber accent `#E8B04B`, Fira Sans Condensed for display type. Tokens live in `src/index.css`.
