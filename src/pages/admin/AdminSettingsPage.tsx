import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input, Label, Textarea } from '../../components/ui/Field'
import { fetchSiteConfig } from '../../lib/data'
import { invalidateSiteData } from '../../lib/queryCache'
import { uploadSiteImage } from '../../lib/siteAssets'
import { useAuth } from '../../hooks/useAuth'

export function AdminSettingsPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const client = useQueryClient()
  const heroFileRef = useRef<HTMLInputElement>(null)
  const ficheFileRef = useRef<HTMLInputElement>(null)

  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instructions, setInstructions] = useState('')

  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [heroPreview, setHeroPreview] = useState<string | null>(null)
  const [pendingHeroFile, setPendingHeroFile] = useState<File | null>(null)

  const [ficheImageUrl, setFicheImageUrl] = useState('')
  const [fichePreview, setFichePreview] = useState<string | null>(null)
  const [pendingFicheFile, setPendingFicheFile] = useState<File | null>(null)

  const [bootstrap, setBootstrap] = useState('imperialhome237@gmail.com, stivelandry16@gmail.com')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMainAdmin = profile?.role === 'main_admin'
  const canSave = Boolean(supabase && profile && (profile.role === 'admin' || isMainAdmin))

  useEffect(() => {
    void fetchSiteConfig().then((c) => {
      setPhone(c.phone)
      setEmail(c.email)
      setWhatsapp(c.whatsapp)
      setInstructions(c.payment_instructions_en)
      setHeroImageUrl(c.home_hero_image_url)
      if (c.home_hero_image_url) setHeroPreview(c.home_hero_image_url)
      setFicheImageUrl(c.home_fiche_image_url)
      if (c.home_fiche_image_url) setFichePreview(c.home_fiche_image_url)
    })
    if (!supabase) return
    void supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['bootstrap_admin_email', 'bootstrap_admin_emails'])
      .then(({ data }) => {
        const row = data?.find((r) => r.key === 'bootstrap_admin_email')
        const list = data?.find((r) => r.key === 'bootstrap_admin_emails')
        if (typeof row?.value === 'string') setBootstrap(row.value)
        else if (Array.isArray(list?.value)) setBootstrap((list?.value as string[]).join(', '))
      })
  }, [])

  useEffect(() => {
    return () => {
      if (heroPreview?.startsWith('blob:')) URL.revokeObjectURL(heroPreview)
      if (fichePreview?.startsWith('blob:')) URL.revokeObjectURL(fichePreview)
    }
  }, [heroPreview, fichePreview])

  function onPickHeroFile(file: File | null) {
    if (!file) return
    setPendingHeroFile(file)
    if (heroPreview?.startsWith('blob:')) URL.revokeObjectURL(heroPreview)
    setHeroPreview(URL.createObjectURL(file))
  }

  function onPickFicheFile(file: File | null) {
    if (!file) return
    setPendingFicheFile(file)
    if (fichePreview?.startsWith('blob:')) URL.revokeObjectURL(fichePreview)
    setFichePreview(URL.createObjectURL(file))
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !canSave) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      let heroUrl = heroImageUrl.trim()
      if (pendingHeroFile) {
        heroUrl = await uploadSiteImage(pendingHeroFile, 'site/hero-accueil')
        setHeroImageUrl(heroUrl)
        setPendingHeroFile(null)
      }

      let ficheUrl = ficheImageUrl.trim()
      if (pendingFicheFile) {
        ficheUrl = await uploadSiteImage(pendingFicheFile, 'site/fiche-accueil')
        setFicheImageUrl(ficheUrl)
        setPendingFicheFile(null)
      }

      const contentRows = [
        { key: 'phone', value: phone },
        { key: 'email', value: email },
        { key: 'whatsapp', value: whatsapp },
        { key: 'payment_instructions_en', value: instructions },
        { key: 'home_hero_image_url', value: heroUrl },
        { key: 'home_fiche_image_url', value: ficheUrl },
      ]
      for (const row of contentRows) {
        const { error: rowError } = await supabase.from('system_config').upsert({ key: row.key, value: row.value })
        if (rowError) throw rowError
      }

      if (isMainAdmin) {
        const emails = bootstrap
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
        const bootstrapRows = [
          { key: 'bootstrap_admin_email', value: emails.join(', ') },
          { key: 'bootstrap_admin_emails', value: emails },
        ]
        for (const row of bootstrapRows) {
          const { error: rowError } = await supabase.from('system_config').upsert({ key: row.key, value: row.value })
          if (rowError) throw rowError
        }
      }

      await invalidateSiteData(client)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.settingsSaveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{t('admin.settings')} | Impérial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.settings')}</h1>
      {!isSupabaseConfigured() ? (
        <p className="mt-4 rounded border border-amber-600/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t('admin.supabaseRequired')}</p>
      ) : null}

      <form className="surface-light mt-8 max-w-xl space-y-6 border border-line p-6" onSubmit={(e) => void save(e)}>
        <div>
          <Label>{t('admin.heroHomeImage')}</Label>
          <p className="mb-3 text-sm text-[var(--surface-muted)]">{t('admin.heroHomeImageHint')}</p>
          {heroPreview ? <img src={heroPreview} alt="" className="mb-3 h-40 w-full max-w-md rounded border border-line object-cover" /> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => heroFileRef.current?.click()}>
              {t('admin.heroHomeUpload')}
            </Button>
            {heroPreview ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setHeroImageUrl('')
                  setPendingHeroFile(null)
                  if (heroPreview?.startsWith('blob:')) URL.revokeObjectURL(heroPreview)
                  setHeroPreview(null)
                }}
              >
                {t('admin.heroHomeRemove')}
              </Button>
            ) : null}
          </div>
          <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickHeroFile(e.target.files?.[0] ?? null)} />
          <div className="mt-3">
            <Label>{t('admin.roomPhotoUrl')}</Label>
            <Input
              value={heroImageUrl}
              onChange={(e) => {
                setHeroImageUrl(e.target.value)
                if (e.target.value) setHeroPreview(e.target.value)
              }}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="border-t border-line pt-6">
          <Label>{t('admin.ficheHomeImage')}</Label>
          <p className="mb-3 text-sm text-[var(--surface-muted)]">{t('admin.ficheHomeImageHint')}</p>
          {fichePreview ? (
            <img src={fichePreview} alt="" className="mb-3 h-56 w-full max-w-xs rounded border border-line object-cover object-top" />
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => ficheFileRef.current?.click()}>
              {t('admin.ficheHomeUpload')}
            </Button>
            {fichePreview ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFicheImageUrl('')
                  setPendingFicheFile(null)
                  if (fichePreview?.startsWith('blob:')) URL.revokeObjectURL(fichePreview)
                  setFichePreview(null)
                }}
              >
                {t('admin.ficheHomeRemove')}
              </Button>
            ) : null}
          </div>
          <input ref={ficheFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFicheFile(e.target.files?.[0] ?? null)} />
          <div className="mt-3">
            <Label>{t('admin.roomPhotoUrl')}</Label>
            <Input
              value={ficheImageUrl}
              onChange={(e) => {
                setFicheImageUrl(e.target.value)
                if (e.target.value) setFichePreview(e.target.value)
              }}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <Label>{t('admin.settingsPhone')}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>{t('admin.settingsWhatsapp')}</Label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div>
          <Label>{t('admin.settingsEmail')}</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>{t('admin.settingsPayment')}</Label>
          <Textarea rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>
        {isMainAdmin ? (
          <div>
            <Label>{t('admin.settingsBootstrap')}</Label>
            <Input value={bootstrap} onChange={(e) => setBootstrap(e.target.value)} />
            <p className="mt-1 text-sm text-[var(--surface-muted)]">{t('admin.settingsBootstrapHint')}</p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {saved ? <p className="text-sm text-green-700">{t('admin.settingsSaved')}</p> : null}
        <Button type="submit" disabled={!canSave || saving}>
          {saving ? t('common.loading') : t('common.save')}
        </Button>
      </form>
    </div>
  )
}
