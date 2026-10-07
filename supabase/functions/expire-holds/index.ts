import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json, serviceClient } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  const { url, key } = serviceClient()
  const supabase = createClient(url, key)
  const { data, error } = await supabase.rpc('expire_holds')
  if (error) return json({ error: error.message }, 400)
  return json({ expired: data })
})
