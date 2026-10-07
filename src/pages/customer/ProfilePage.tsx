import { useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export function ProfilePage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [cni, setCni] = useState(profile?.cni ?? '')
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !profile) return
    await supabase.from('profiles').update({ full_name: fullName, phone, cni }).eq('id', profile.id)
    setSaved(true)
  }

  return (
    <div className="max-w-md">
      <Helmet>
        <title>{t('account.profile')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('account.profile')}</h1>
      <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <Label>{t('auth.name')}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label>{t('auth.phone')}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>{t('account.cni')}</Label>
          <Input value={cni} onChange={(e) => setCni(e.target.value)} />
        </div>
        <div>
          <Label>{t('auth.email')}</Label>
          <Input value={profile?.email ?? ''} disabled />
        </div>
        <Button type="submit">{t('account.save')}</Button>
        {saved ? <p className="text-sm text-[#d4af6a]">Saved</p> : null}
      </form>
    </div>
  )
}
