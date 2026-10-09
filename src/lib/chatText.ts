import type { TFunction } from 'i18next'

export function visibleMessage(body: string, t: TFunction) {
  if (body.startsWith('[[assigned]]')) {
    return t('chat.assigned', { name: body.slice('[[assigned]]'.length) })
  }
  return body
}
