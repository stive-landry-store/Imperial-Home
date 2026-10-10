import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchAllReservations } from '../../lib/data'
import { Button } from '../../components/ui/Button'
import { haptic } from '../../lib/haptics'

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (options: { formats: string[] }) => Detector

export function AdminScanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const { data: reservations = [] } = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (!supported) return
    let stream: MediaStream | null = null
    let timer = 0
    let stopped = false
    const Detector = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector
    const detector = new Detector({ formats: ['qr_code'] })

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (!video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const tick = async () => {
          if (stopped || !video.current) return
          try {
            const found = await detector.detect(video.current)
            const value = found[0]?.rawValue
            if (value) {
              const path = value.startsWith('http') ? new URL(value).pathname : value
              if (path.startsWith('/admin/reservations/')) {
                haptic(30)
                navigate(path)
                return
              }
            }
          } catch {
            /* keep scanning */
          }
          timer = window.setTimeout(() => void tick(), 350)
        }
        void tick()
      } catch {
        setError(t('app.scanDenied'))
      }
    }
    void start()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [supported, navigate, t])

  function lookup() {
    const wanted = code.trim().toUpperCase()
    const found = reservations.find((r) => r.public_code.toUpperCase() === wanted)
    if (found) navigate(`/admin/reservations/${found.id}`)
    else setError(t('app.scanNotFound'))
  }

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('app.scanTitle')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-3xl md:text-4xl">{t('app.scanTitle')}</h1>
      <p className="mt-2 text-sm text-muted">{t('app.scanLead')}</p>
      {supported ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#d4af6a]/60 bg-black">
          <video ref={video} playsInline muted className="aspect-square w-full max-w-md object-cover" />
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-[#d4af6a]/40 p-4 text-sm">{t('app.scanUnsupported')}</p>
      )}
      <div className="mt-5 flex max-w-md gap-2">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setError(null)
          }}
          placeholder="IH-XXXXXXXX"
          className="min-h-11 flex-1 border border-line bg-transparent px-3"
        />
        <Button onClick={lookup}>{t('app.scanSearch')}</Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
