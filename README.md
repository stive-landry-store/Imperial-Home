# Imperial Home

Furnished guest residences in Douala, Cameroon — public website, booking engine, customer portal, and administration. React (Vite) + Supabase.

Brand: black, gold, white. Currency: XAF. WhatsApp: +237 674 09 22 63. Email: imperialhome237@gmail.com.

## Preview without Supabase

```bash
npm install
npm run dev
```

The catalogue, home, contact, and WhatsApp button work with built-in sample residences. Accounts, live booking, payments, and admin require Supabase.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In the SQL editor, run the files in `supabase/migrations/` **in order**, or from the CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_REF
npx supabase db push
npx supabase functions deploy
```

4. Set Edge Function secrets:

- `PAYMENTS_WEBHOOK_SECRET` — shared secret for the generic payment webhook
- `OPENAI_API_KEY` — optional, for richer chat (still grounded on Imperial Home data)
- `SUPABASE_SERVICE_ROLE_KEY` is provided automatically on hosted functions

5. First admins: register `imperialhome237@gmail.com` (main admin) and `stivelandry16@gmail.com` (admin).

Schedule `expire-holds` (e.g. every 5 minutes) in the Supabase dashboard so unpaid holds release dates.

## Payments

No live payment provider is wired. After a customer holds dates they receive official pay-via-WhatsApp instructions. An administrator confirms or rejects the payment (`confirm_payment` / `reject_payment`). Confirmed bookings generate a Housing Sheet and Welcome Book PDF.

When you choose a processor, implement its signature check in `supabase/functions/payments-webhook` and call the existing `apply_payment_event` RPC. Do not mark bookings paid from the customer UI.

## Scripts

- `npm run dev` — local site
- `npm run build` — production bundle
- `npm test` — pricing, availability, and assistant tests

## Stack

Vite, React 19, TypeScript, Tailwind CSS, React Router, TanStack Query, Supabase (Auth, Postgres, Storage, Realtime, Edge Functions).
