# Imperial Home

Furnished guest residences in Douala, Cameroon — public website, booking engine, customer portal, and administration. React (Vite) + Supabase, hosted on Vercel.

Brand: black, gold, white. Currency: XAF. WhatsApp: +237 674 09 22 63. Email: imperialhome237@gmail.com.

**Application conçue et développée par l'entreprise « stive landry store ».**
**Créateur : stive landry store — de son vrai nom NYAMI TCHOUPE STIVE LANDRY.**

## Preview without Supabase

```bash
npm install
npm run dev
```

The catalogue, home, contact, legal pages and WhatsApp button work with built-in sample residences. Accounts, live booking, payments, and admin require Supabase.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_SITE_URL`.
3. Apply the migrations, or run `supabase/manual/catch_up.sql` in the SQL editor:

```bash
npx supabase login
npx supabase link --project-ref YOUR_REF
npx supabase db push
npx supabase functions deploy
```

4. Edge Function secrets (`npx supabase secrets set NAME=value`):

| Secret | Use |
| --- | --- |
| `SITE_URL`, `ALLOWED_ORIGINS` | Public address(es) of the site; CORS is limited to them |
| `TURNSTILE_SECRET_KEY` | Captcha on sign-up (pair with `VITE_TURNSTILE_SITE_KEY`) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Reception assistant answered by Claude (default `claude-opus-5-5`) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `REPORT_EMAIL` | Sign-up confirmation, booking, J-1 and monthly report e-mails |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_CONFIRMED`, `WHATSAPP_TEMPLATE_REMINDER` | WhatsApp Business messages |
| `CRON_SECRET` | Lets the scheduled jobs call the functions |
| `PAYMENTS_WEBHOOK_SECRET` | Generic payment webhook |

5. Auth → URL Configuration: add your site URL and `/login?confirmed=1`. New accounts must confirm their e-mail; administrator rights from the bootstrap list are granted only to verified addresses.
6. Schedule the background jobs with `supabase/manual/schedule_jobs.sql` (expire holds, guest messages, iCal sync, monthly report).

## Vercel

Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server functions only), optional `VITE_SENTRY_DSN`, `VITE_TURNSTILE_SITE_KEY`, `VITE_SUPABASE_IMAGE_TRANSFORM=1` (when the Supabase plan includes image resizing). Enable Web Analytics and Speed Insights in the project.

## Features

- Booking engine with holds, promo codes, **season / weekend / long-stay pricing** (Admin → Prices & calendars)
- **Two-way iCal**: export links for Airbnb/Booking, and import of their calendars as blocked dates
- **Contactless check-in**: access code, times and arrival guide shown the day before arrival; J-1 e-mail + WhatsApp
- **Verified public reviews** (`/avis`) with rich results for search engines
- **Two-step sign-in (TOTP)** for administrators, optionally required for all (Admin → Security)
- Accounting export by month (Excel / PDF) and an e-mailed monthly report
- Server-rendered pages for Google and link previews; dynamic sitemap and robots
- Motion design across the site (respects "reduce motion")
- PWA, push notifications, 11 languages

## Payments

No live payment provider is wired. After a customer holds dates they receive official pay-via-WhatsApp instructions. An administrator confirms or rejects the payment (`confirm_payment` / `reject_payment`).

## Scripts

- `npm run dev` — local site
- `npm run check` — typecheck, lint, unit tests, build
- `npm run e2e` — Playwright end-to-end tests
- `npm run db:types` — regenerate Supabase types (after `db:link`)

CI runs on every push (`.github/workflows/ci.yml`); a weekly database backup runs when the `SUPABASE_DB_URL` secret is set (`.github/workflows/backup.yml`).

## Stack

Vite, React 19, TypeScript, Tailwind CSS, React Router, TanStack Query, Supabase (Auth, Postgres, Storage, Realtime, Edge Functions), Vercel, Sentry, Claude.

---

Copyright © 2026 **NYAMI TCHOUPE STIVE LANDRY** (stive landry store). All rights reserved. Proprietary software, used by Imperial Home under a non-exclusive license — see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
