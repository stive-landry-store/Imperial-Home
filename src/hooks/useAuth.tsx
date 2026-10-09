import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { authRedirectUrl } from '../lib/authRedirect'
import { supabase } from '../lib/supabase'
import { fetchProfile } from '../lib/data'
import type { AdminProfile, PermissionKey, Profile } from '../types/database'

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  admin: AdminProfile | null
  permissions: PermissionKey[]
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    email: string
    password: string
    full_name: string
    phone?: string
  }) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  reloadProfile: () => Promise<void>
  hasPermission: (key: PermissionKey) => boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [permissions, setPermissions] = useState<PermissionKey[]>([])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const client = supabase
    void client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null)
      setAdmin(null)
      setPermissions([])
      setLoading(false)
      return
    }
    const userId = session.user.id
    let cancelled = false
    async function load() {
      setLoading(true)
      if (supabase) {
        try {
          await supabase.rpc('ensure_profile')
        } catch {
          /* profile may already exist */
        }
      }
      const nextProfile = await fetchProfile(userId)
      if (cancelled) return
      setProfile(nextProfile)
      if (nextProfile && (nextProfile.role === 'admin' || nextProfile.role === 'main_admin') && supabase) {
        const { data: adminRow } = await supabase.from('admin_profiles').select('*').eq('id', userId).maybeSingle()
        const { data: perms } = await supabase.from('admin_permissions').select('permission').eq('admin_id', userId)
        if (!cancelled) {
          setAdmin(adminRow as AdminProfile | null)
          setPermissions((perms ?? []).map((p) => p.permission as PermissionKey))
        }
      } else if (!cancelled) {
        setAdmin(null)
        setPermissions([])
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [session?.user.id])

  const reloadProfile = useCallback(async () => {
    if (!supabase || !session?.user.id) return
    setProfile(await fetchProfile(session.user.id))
  }, [session?.user.id])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      admin,
      permissions,
      isStaff: profile?.role === 'admin' || profile?.role === 'main_admin',
      hasPermission: (key) => profile?.role === 'main_admin' || permissions.includes(key),
      signIn: async (email, password) => {
        if (!supabase) throw new Error('Supabase is not configured')
        const client = supabase
        const normalized = email.trim().toLowerCase()
        const attempt = () => client.auth.signInWithPassword({ email: normalized, password })
        let { error } = await attempt()
        const unconfirmed = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase().includes('not confirmed')
        if (unconfirmed) {
          const base = import.meta.env.VITE_SUPABASE_URL as string
          const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
          await fetch(`${base}/functions/v1/confirm-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: anon,
              Authorization: `Bearer ${anon}`,
            },
            body: JSON.stringify({ email: normalized }),
          })
          const retry = await attempt()
          error = retry.error
        }
        if (error) throw error
        await client.rpc('ensure_profile')
      },
      signUp: async ({ email, password, full_name, phone }) => {
        if (!supabase) throw new Error('Supabase is not configured')
        const base = import.meta.env.VITE_SUPABASE_URL as string
        const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
        const response = await fetch(`${base}/functions/v1/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anon,
            Authorization: `Bearer ${anon}`,
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            full_name: full_name.trim(),
            phone: phone?.trim() ?? '',
          }),
        })
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        if (!response.ok) throw new Error(payload?.error || 'Could not create the account')
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw error
        await supabase.rpc('ensure_profile')
        return { needsEmailConfirmation: false }
      },
      signOut: async () => {
        await supabase?.auth.signOut()
      },
      resetPassword: async (email) => {
        if (!supabase) throw new Error('Supabase is not configured')
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: authRedirectUrl('/reset-password'),
        })
        if (error) throw error
      },
      updatePassword: async (password) => {
        if (!supabase) throw new Error('Supabase is not configured')
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      },
      reloadProfile,
    }),
    [admin, loading, permissions, profile, reloadProfile, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
