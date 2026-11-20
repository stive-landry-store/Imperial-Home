// Scheduled functions accept the service-role key or CRON_SECRET in the Authorization header.
export function authorizedCron(req: Request): boolean {
  const auth = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cron = Deno.env.get('CRON_SECRET') ?? ''
  return Boolean(auth) && (auth === service || (cron.length > 0 && auth === cron))
}
