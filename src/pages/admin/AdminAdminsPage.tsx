import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'
import { useAuth } from '../../hooks/useAuth'
import { Loader } from '../../components/ui/Loader'
import {
  deactivateAdmin,
  promoteUserToAdmin,
  reactivateAdmin,
  searchProfilesByEmail,
  updateAdminTitle,
} from '../../lib/adminUsers'

type Row = {
  id: string
  is_verified: boolean
  is_active: boolean
  title: string | null
  profiles: { full_name: string; email: string | null; role: string }
}

export function AdminAdminsPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const client = useQueryClient()
  const isMainAdmin = profile?.role === 'main_admin'

  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('id, is_verified, is_active, title, profiles ( full_name, email, role )')
      if (error) throw error
      return data as unknown as Row[]
    },
  })

  const { data: searchResults = [] } = useQuery({
    queryKey: ['profile-search', search],
    queryFn: () => searchProfilesByEmail(search),
    enabled: isMainAdmin && search.trim().length >= 3,
  })

  const refresh = () => void client.invalidateQueries({ queryKey: ['admins'] })

  const promote = useMutation({
    mutationFn: () => promoteUserToAdmin(email, title || t('admin.adminDefaultTitle')),
    onSuccess: () => {
      setEmail('')
      setTitle('')
      setFormError(null)
      refresh()
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : t('admin.adminPromoteError')),
  })

  async function toggleVerify(id: string, next: boolean) {
    if (!supabase || !isMainAdmin) return
    await supabase.from('admin_profiles').update({ is_verified: next }).eq('id', id)
    refresh()
  }

  async function onSaveTitle(id: string, nextTitle: string) {
    if (!isMainAdmin) return
    await updateAdminTitle(id, nextTitle)
    refresh()
  }

  const deactivate = useMutation({
    mutationFn: deactivateAdmin,
    onSuccess: refresh,
  })

  const reactivate = useMutation({
    mutationFn: ({ id, adminTitle }: { id: string; adminTitle: string }) => reactivateAdmin(id, adminTitle),
    onSuccess: refresh,
  })

  function onPromote(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    promote.mutate()
  }

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{t('admin.admins')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.admins')}</h1>
      <p className="mt-2 max-w-2xl text-base theme-muted">{t('admin.adminsLead')}</p>

      {isMainAdmin ? (
        <form className="surface-light mt-8 grid max-w-xl gap-4 border border-line p-6" onSubmit={onPromote}>
          <h2 className="font-display text-2xl">{t('admin.adminAdd')}</h2>
          <p className="text-sm text-[var(--surface-muted)]">{t('admin.adminAddHint')}</p>
          <div>
            <Label>{t('admin.adminEmail')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              required
            />
          </div>
          <div>
            <Label>{t('admin.adminTitleLabel')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('admin.adminDefaultTitle')}
            />
          </div>
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <Button type="submit" disabled={promote.isPending}>
            {t('admin.adminPromote')}
          </Button>
        </form>
      ) : (
        <p className="mt-6 text-sm theme-muted">{t('admin.adminMainOnly')}</p>
      )}

      {isMainAdmin ? (
        <div className="surface-light mt-6 max-w-xl border border-line p-4">
          <Label>{t('admin.adminSearch')}</Label>
          <Input className="mt-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="email@..." />
          {search.trim().length >= 3 && searchResults.length > 0 ? (
            <ul className="mt-3 divide-y divide-line text-sm">
              {searchResults.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span>
                    {p.full_name || p.email} — <span className="text-muted">{p.role}</span>
                  </span>
                  {p.role === 'customer' ? (
                    <button
                      type="button"
                      className="text-xs uppercase tracking-wider text-gold"
                      onClick={() => {
                        setEmail(p.email ?? '')
                        setTitle(p.full_name || '')
                      }}
                    >
                      {t('admin.adminUseEmail')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : search.trim().length >= 3 ? (
            <p className="mt-2 text-sm text-muted">{t('admin.adminSearchEmpty')}</p>
          ) : null}
        </div>
      ) : null}

      <ul className="surface-light mt-8 divide-y divide-line border border-line">
        {isLoading ? (
          <li className="px-4"><Loader size="sm" /></li>
        ) : data.length === 0 ? (
          <li className="px-4 py-6 text-muted">{t('admin.adminListEmpty')}</li>
        ) : (
          data.map((row) => (
            <li key={row.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.profiles.full_name || row.profiles.email}</span>
                {row.is_verified ? <VerifiedBadge /> : null}
                {!row.is_active ? (
                  <span className="text-xs uppercase tracking-wider text-red-600">{t('admin.adminInactive')}</span>
                ) : null}
                <span className="text-xs text-muted">{row.profiles.role}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {isMainAdmin && row.profiles.role !== 'main_admin' ? (
                  <Input
                    className="max-w-[200px] text-sm"
                    defaultValue={row.title ?? ''}
                    placeholder={t('admin.adminTitleLabel')}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (row.title ?? '')) {
                        void onSaveTitle(row.id, e.target.value)
                      }
                    }}
                  />
                ) : (
                  <span className="text-sm text-muted">{row.title}</span>
                )}
                {isMainAdmin ? (
                  <>
                    <button
                      type="button"
                      className="text-xs uppercase tracking-wider text-gold"
                      onClick={() => void toggleVerify(row.id, !row.is_verified)}
                    >
                      {row.is_verified ? t('admin.adminUnverify') : t('admin.verified')}
                    </button>
                    {row.profiles.role !== 'main_admin' ? (
                      row.is_active ? (
                        <button
                          type="button"
                          className="text-xs uppercase tracking-wider text-red-700"
                          onClick={() => deactivate.mutate(row.id)}
                          disabled={deactivate.isPending}
                        >
                          {t('admin.adminDeactivate')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-xs uppercase tracking-wider text-gold"
                          onClick={() => reactivate.mutate({ id: row.id, adminTitle: row.title ?? '' })}
                          disabled={reactivate.isPending}
                        >
                          {t('admin.adminReactivate')}
                        </button>
                      )
                    ) : null}
                  </>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
