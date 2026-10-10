import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PhotoViewer({ src, round, onClose, onChange }: { src: string; round?: boolean; onClose: () => void; onChange: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-black/90 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" aria-label={t('common.close')} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white" onClick={onClose}>
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt=""
        onClick={(event) => event.stopPropagation()}
        className={`max-h-[75vh] max-w-full object-contain ${round ? 'aspect-square w-[min(80vw,420px)] rounded-full object-cover ring-[3px] ring-[#d4af6a]' : 'rounded-lg'}`}
      />
      <button
        type="button"
        className="min-h-11 rounded-full bg-gradient-to-r from-[#b8893b] to-[#ecd08a] px-6 text-sm font-semibold text-[#17110a]"
        onClick={(event) => {
          event.stopPropagation()
          onChange()
        }}
      >
        {t('common.changePhoto')}
      </button>
    </div>
  )
}
