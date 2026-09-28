import { US_CITY_COST_DATA_UPDATED } from '@/lib/fire-data'
import { statePages } from '@/lib/state-pages'

export const dynamic = 'force-static'

const CENSUS_SOURCE = 'https://api.census.gov/data/2024/acs/acs5/groups/B25113.html'

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function GET() {
  const header = [
    'state',
    'sampled_cities',
    'annual_baseline_usd',
    'fire_target_25x_usd',
    'lowest_sampled_city',
    'lowest_city_annual_usd',
    'highest_sampled_city',
    'highest_city_annual_usd',
    'state_income_tax_rate',
    'state_income_tax_note',
    'data_reviewed',
    'primary_source',
  ]

  const rows = [...statePages]
    .sort((a, b) => a.avgCityColAccross - b.avgCityColAccross)
    .map((state) => [
      state.stateName,
      state.cities.length,
      state.avgCityColAccross,
      state.fireTarget,
      state.cheapestCity.name,
      state.cheapestCity.col,
      state.mostExpensiveCity.name,
      state.mostExpensiveCity.col,
      state.taxRate,
      state.taxLabel,
      US_CITY_COST_DATA_UPDATED,
      CENSUS_SOURCE,
    ])

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="untilfire-fire-number-by-state.csv"',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
