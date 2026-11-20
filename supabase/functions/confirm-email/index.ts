// Imperial Home — retired endpoint.
// It used to confirm any address without proof of ownership, which let anyone take an admin e-mail.
// Accounts are now confirmed only through the link sent to the inbox (see functions/register).
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { handleCors, json } from "../_shared/http.ts"

Deno.serve((req) => {
  const cors = handleCors(req)
  if (cors) return cors
  return json({ error: "Gone. Confirm your address with the link sent by e-mail." }, 410)
})
