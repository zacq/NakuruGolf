# Nakuru Golf Club website

Next.js 16 + Postgres (Drizzle): events, rooms, dining, car wash, golf, shop, membership and partners in one M-Pesa cart, with a staff dashboard at `/admin`.

## Deploy to Netlify

1. Create a Postgres database (Supabase, Neon or similar) and copy its **pooled** connection string. For Supabase, end it with `?uselibpqcompat=true&sslmode=require`.
2. In Netlify, import this repository. Build settings come from `netlify.toml`.
3. Add the environment variables in **Project configuration > Environment variables** (see `.env.example`). Required: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `CRON_SECRET`.
4. Deploy. Production builds apply `migrations/*.sql`; the first visit loads starter content.
5. Give deploy previews their own `DATABASE_URL`, or none. Migrations run only for production.

Without M-Pesa and SMS credentials, checkout and account sign-in are unavailable. For a staging site only, `DEMO_MODE=true` enables simulated payments and on-screen login codes. Never set it on the live site: anyone could get a paid ticket or sign in as any phone number.

## Before going live

- Replace starter prices, rooms, menus, hole data, partners and photos with the club's own.
- Set the Daraja variables. `MPESA_CALLBACK_URL` is `https://<site>/api/mpesa/callback`; the app appends `MPESA_CALLBACK_SECRET`.
- Reminders run every 15 minutes from `netlify/functions/reminders.mts` and need `CRON_SECRET`.

## Tee-time draw and HowDidiDo

HowDidiDo has no M-Pesa payments and no public API. The website takes payment and runs the draw; HowDidiDo keeps scoring.

1. In **/admin > Tee-time draws**, staff create the tee times for an event, for example 50 tee times 8 minutes apart, 100 entries each, 4 players drawn and a KSh 200 fee.
2. Players pick a tee time on the event page and pay through an M-Pesa prompt. An entry exists only after Safaricom confirms the payment, so screenshots and typed receipts are never used.
3. A tee time closes when it is full or when staff close it. Closing creates a secret seed and publishes its fingerprint. Running the draw reveals the seed. The order is SHA-256 of `seed:entry id`, so anyone can check it at `/events/<slug>/draw`.
4. Winners and reserves receive an SMS. Staff download the start-sheet CSV (names, handicaps, HowDidiDo IDs, M-Pesa receipts) and enter or import it into the HowDidiDo competition.
5. Staff paste the HowDidiDo leaderboard into the same page. It shows beside the home page hero and at `/leaderboard`.

To present without Daraja credentials, deploy a separate staging site with `DEMO_MODE=true`, which simulates the M-Pesa prompt on screen.

## Develop

```
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

To change the schema, edit `src/db/schema.ts` and add a numbered SQL file to `migrations/`. Do not edit an applied one.

## Not built yet (PRD Phase 1)

Per-department staff roles and staff 2FA, paid shop delivery, in-page image and video upload (URLs are used), corporate room rates at checkout, editable About/Venue pages, QR camera scanning on iPhone (staff type the code), and WhatsApp sending (click-to-chat links only).
