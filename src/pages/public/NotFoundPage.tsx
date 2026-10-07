import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="theme-page px-6 pt-36 pb-24 text-center">
      <Helmet>
        <title>404 | Imperial Home</title>
      </Helmet>
      <p className="text-gold">404</p>
      <h1 className="mt-2 font-display text-4xl">Page not found</h1>
      <Button to="/" className="mt-8">
        {t('common.back')}
      </Button>
    </div>
  )
}
