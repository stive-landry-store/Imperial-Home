export function whatsappUrl(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, '')
  const base = `https://wa.me/${digits}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}
