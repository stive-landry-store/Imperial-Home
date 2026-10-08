import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmPayment, rejectPayment } from '../lib/data'
import { supabase } from '../lib/supabase'
import type { Reservation } from '../types/database'

async function afterDecision(client: ReturnType<typeof useQueryClient>, id: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ['reservation', id] }),
    client.invalidateQueries({ queryKey: ['admin-reservations'] }),
    client.invalidateQueries({ queryKey: ['my-reservations'] }),
    client.invalidateQueries({ queryKey: ['unavailable'] }),
    client.invalidateQueries({ queryKey: ['notifications'] }),
  ])
}

function patchReservationStatus(list: Reservation[] | undefined, id: string, status: Reservation['status']) {
  return (list ?? []).map((row) => (row.id === id ? { ...row, status } : row))
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
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: ['admin-reservations'] })
      const previous = client.getQueryData<Reservation[]>(['admin-reservations'])
      client.setQueryData(['admin-reservations'], patchReservationStatus(previous, id, 'confirmed'))
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) client.setQueryData(['admin-reservations'], ctx.previous)
    },
    onSettled: async (_data, _err, id) => {
      await afterDecision(client, id)
    },
  })

  const reject = useMutation({
    mutationFn: (id: string) => rejectPayment(id, 'Rejected by administrator'),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: ['admin-reservations'] })
      const previous = client.getQueryData<Reservation[]>(['admin-reservations'])
      client.setQueryData(['admin-reservations'], patchReservationStatus(previous, id, 'cancelled'))
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) client.setQueryData(['admin-reservations'], ctx.previous)
    },
    onSettled: async (_data, _err, id) => {
      await afterDecision(client, id)
    },
  })

  return { confirm, reject }
}

export function isPendingReservation(status: string) {
  return status === 'pending' || status === 'payment_processing'
}

export function decisionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    if (message.trim()) return message
  }
  return fallback
}
