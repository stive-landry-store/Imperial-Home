/** CFA franc is pegged to the euro. This is an indicative display, not a charge. */
const XAF_PER_EUR = 655.957

export function indicativeEur(xaf: number) {
  return Math.round((xaf / XAF_PER_EUR) * 100) / 100
}

export function formatEur(amount: number, locale = 'fr-FR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount)
}
