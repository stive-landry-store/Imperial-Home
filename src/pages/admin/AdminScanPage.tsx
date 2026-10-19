import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import jsQR from 'jsqr'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { haptic } from '../../lib/haptics'

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (options: { formats: string[] }) => Detector

export function readScan(raw: string) {
  const text = raw.trim()
  const path = text.match(/\/admin\/reservations\/([^/?#]+)/)
  if (path) return { id: decodeURIComponent(path[1]) }
  const code = text.match(/IH-[A-Z0-9]+/i)
  if (code) return { code: code[0].toUpperCase() }
  if (/^[A-Z0-9-]{4,}$/i.test(text)) return { code: text.toUpperCase() }
  return {}
}

export function AdminScanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const video = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!live || !video.current || !streamRef.current) return
    const el = video.current
    el.srcObject = streamRef.current
    el.setAttribute('playsinline', 'true')
    void el.play().catch(() => setError(t('app.scanDenied')))

    let stopped = false
    let timer = 0
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    let native: Detector | null = null
    try {
      if ('BarcodeDetector' in window) {
        native = new (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector({ formats: ['qr_code'] })
      }
    } catch {
      native = null
    }

    const go = (raw: string) => {
      if (stopped) return
      const found = readScan(raw)
      if (!found.id && !found.code) return
      stopped = true
      haptic(30)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (found.id) {
        navigate(`/admin/reservations/${found.id}`)
        return
      }
      void openByCode(found.code!)
    }

    async function openByCode(publicCode: string) {
      if (!supabase) {
        setError(t('app.scanNotFound'))
        return
      }
      const { data } = await supabase.from('reservations').select('id').eq('public_code', publicCode).maybeSingle()
      if (data?.id) navigate(`/admin/reservations/${data.id}`)
      else setError(t('app.scanNotFound'))
    }

    const tick = async () => {
      if (stopped || !el.videoWidth || !context) {
        timer = window.setTimeout(() => void tick(), 250)
        return
      }
      try {
        if (native) {
          const found = await native.detect(el)
          if (found[0]?.rawValue) {
            go(found[0].rawValue)
            return
          }
        }
      } catch {
        /* fall through to the picture reader */
      }
      canvas.width = el.videoWidth
      canvas.height = el.videoHeight
      context.drawImage(el, 0, 0)
      const frame = context.getImageData(0, 0, canvas.width, canvas.height)
      const qr = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })
      if (qr?.data) {
        go(qr.data)
        return
      }
      timer = window.setTimeout(() => void tick(), 280)
    }
    timer = window.setTimeout(() => void tick(), 400)

    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [live, navigate, t])

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('app.scanUnsupported'))
      return
    }
    setOpening(true)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      setLive(true)
    } catch {
      setError(t('app.scanDenied'))
    } finally {
      setOpening(false)
    }
  }

  async function lookup() {
    const wanted = code.trim().toUpperCase()
    if (!wanted || !supabase) return
    setError(null)
    const { data } = await supabase.from('reservations').select('id').eq('public_code', wanted).maybeSingle()
    if (data?.id) navigate(`/admin/reservations/${data.id}`)
    else setError(t('app.scanNotFound'))
  }

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{`${t('app.scanTitle')} | Imperial Home`}</title>
      </Helmet>
      <h1 className="font-display text-3xl break-words md:text-4xl">{t('app.scanTitle')}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">{t('app.scanLead')}</p>

      {live ? (
        <div className="relative mt-5 max-w-md overflow-hidden rounded-[1.35rem] border border-[#d4af6a]/60 bg-black">
          <video ref={video} playsInline muted autoPlay className="aspect-square w-full object-cover" />
          <p className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-center text-xs text-[#f4eee3]">{t('app.scanLive')}</p>
        </div>
      ) : (
        <Button className="mt-5 w-full max-w-md" onClick={() => void openCamera()} disabled={opening}>
          {opening ? t('common.loading') : t('app.scanOpenCamera')}
        </Button>
      )}

      <div className="mt-5 flex max-w-md gap-2">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setError(null)
          }}
          placeholder="IH-XXXXXXXX"
          className="min-h-11 min-w-0 flex-1 rounded-2xl border border-line bg-transparent px-3"
        />
        <Button onClick={() => void lookup()}>{t('app.scanSearch')}</Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
