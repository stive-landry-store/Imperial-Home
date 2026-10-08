import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmPayment, rejectPayment } from '../lib/data'
import { supabase } from '../lib/supabase'

async function afterDecision(client: ReturnType<typeof useQueryClient>, id: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ['reservation', id] }),
    client.invalidateQueries({ queryKey: ['admin-reservations'] }),
    client.invalidateQueries({ queryKey: ['unavailable'] }),
  ])
}

async function generateDocs(id: string) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-documents`
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) return
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservation_id: id }),
  }).catch(() => undefined)
}

export function useAdminReservationActions() {
  const client = useQueryClient()

  const confirm = useMutation({
    mutationFn: async (id: string) => {
      const result = await confirmPayment(id)
      await generateDocs(id)
      return result
    },
    onSuccess: async (_data, id) => {
      await afterDecision(client, id)
    },
  })

  const reject = useMutation({
    mutationFn: (id: string) => rejectPayment(id, 'Rejected by administrator'),
    onSuccess: async (_data, id) => {
      await afterDecision(client, id)
    },
  })

  return { confirm, reject }
}

export function isPendingReservation(status: string) {
  return status === 'pending' || status === 'payment_processing'
}
