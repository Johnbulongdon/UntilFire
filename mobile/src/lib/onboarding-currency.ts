/**
 * The currency a city's people are paid in, from its tax key: the website's
 * stateToCurrency (app/HomeClient.tsx), so onboarding guesses the same way.
 * Anything not listed (including every US state) is dollars.
 */
const BY_STATE: Record<string, string> = {
  jp: 'JPY', cn: 'CNY', kr: 'KRW', tw: 'TWD', hk: 'HKD',
  sg: 'SGD', th: 'THB', my: 'MYR', vn: 'VND', id_idn: 'IDR',
  ph: 'PHP', in_ind: 'INR', il_isr: 'ILS', tr: 'TRY',
  ae: 'AED', sa: 'SAR', ng: 'NGN', za: 'ZAR',
  uk: 'GBP',
  au: 'AUD', nz: 'NZD',
  ch: 'CHF', se: 'SEK', dk: 'DKK', no: 'NOK',
  mx: 'MXN', br: 'BRL',
  fr: 'EUR', de: 'EUR', nl: 'EUR', es: 'EUR', pt: 'EUR',
  ie: 'EUR', fi: 'EUR', at: 'EUR', be: 'EUR', it: 'EUR',
  gr: 'EUR', hr: 'EUR', si: 'EUR', ee: 'EUR', lv: 'EUR', lt: 'EUR',
  cz: 'CZK', pl: 'PLN', hu: 'HUF',
}

export function currencyForState(state?: string | null): string {
  if (!state) return 'USD'
  if (state.startsWith('ca_')) return 'CAD'
  return BY_STATE[state] ?? 'USD'
}
