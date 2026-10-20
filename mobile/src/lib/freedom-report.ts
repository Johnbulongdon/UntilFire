import * as Print from 'expo-print'
import { TAX_ESTIMATES_AVAILABLE } from "@engine/release-gates.ts";

import * as Sharing from 'expo-sharing'

import { compactMoney, money } from '@/lib/format'
import { calcProjection } from '@/lib/projection'
import { project, type Freedom } from '@/state/freedom'

type Inputs = Parameters<typeof calcProjection>[0]

// The printed page keeps the light palette in both themes, as the website's report does.
const C = { card: '#FFFDFA', s2: '#F3EBDF', b: '#EADCC8', ink: '#2A2117', ink2: '#6B5C48', ink3: '#76674F', green: '#12856A', teal: '#0E9C86', pos: '#DDF1EA' }
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const pct = (g: number) => `${+(g * 100).toFixed(1)}%`

/** Invested money by age (or year) against the target, as the website report's chart. */
function chart(f: Freedom, age: number | null): string {
  const pts = f.series
  if (pts.length < 2) return ''
  const W = 470, H = 200, L = 52, R = 14, T = 14, B = 26
  const label = (i: number) => (age != null ? age + i : new Date().getFullYear() + i)
  const max = Math.max(f.target * 1.15, ...pts.map(p => p.invested))
  const x = (i: number) => L + (i / (pts.length - 1)) * (W - L - R)
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.invested).toFixed(1)}`).join(' ')
  const ty = y(f.target)
  const ticks = [0.25, 0.5, 0.75, 1].map(s => s * max)
  const ageTicks = [0, 0.25, 0.5, 0.75, 1].map(s => Math.round(s * (pts.length - 1)))
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${C.b}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="${C.ink3}">${esc(compactMoney(v))}</text>`).join('')}
    ${ageTicks.map(i => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="${C.ink3}">${label(i)}</text>`).join('')}
    <path d="M${x(0)},${y(0)} L${line.replace(/ /g, ' L')} L${x(pts.length - 1)},${y(0)} Z" fill="${C.teal}" opacity="0.14"/>
    <polyline points="${line}" fill="none" stroke="${C.teal}" stroke-width="2.5"/>
    <line x1="${L}" x2="${W - R}" y1="${ty}" y2="${ty}" stroke="${C.ink}" stroke-width="1.2" stroke-dasharray="5 4"/>
    <text x="${L + 4}" y="${ty - 6}" font-size="11" font-weight="700" fill="${C.ink}">Target ${esc(compactMoney(f.target))}</text>
  </svg>`
}

/**
 * The one-page freedom plan (the website's FreedomReport, D-60), as a PDF to
 * save or share: built only from the numbers entered, showing its working.
 */
export function reportHtml(f: Freedom, inputs: Inputs, opts: { age: number | null; place: string; branded: boolean; usTaxHome: boolean }): string {
  const wr = inputs.withdrawalRate ?? 0.04
  const growth = inputs.growthRate ?? 0.05
  const spend = f.target * wr
  const saving = Math.max(0, f.monthlyIncome - f.monthlySpending) * 12
  const share = f.target > 0 ? Math.min(1, f.invested / f.target) : 0
  const when = f.date ? f.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
  const prepared = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // How the answer moves with spending 10% either way and growth a point either way.
  const spends = [0.9, 1, 1.1], growths = [growth - 0.01, growth, growth + 0.01]
  const cell = (s: number, g: number) => {
    const r = project({ ...inputs, monthlyExpenses: inputs.monthlyExpenses * s, targetMonthlyExpenses: inputs.targetMonthlyExpenses ? inputs.targetMonthlyExpenses * s : undefined, growthRate: g }, opts.age)
    return opts.age != null ? (r.ageAtFreedom != null ? String(r.ageAtFreedom) : '—') : (r.years != null ? `${Math.ceil(r.years)} yrs` : '—')
  }
  const grid = spends.map((s, i) => `<tr${i ? ` style="border-top:1px solid ${C.b}"` : ''}><td style="text-align:left;font-weight:600;padding:6px 4px">Spend ${esc(money(spend * s))}</td>${growths.map((g, j) => {
    const v = cell(s, g)
    return `<td class="m" style="padding:6px 4px">${i === 1 && j === 1 ? `<span style="background:${C.pos};border-radius:8px;padding:4px 10px;font-weight:800;color:#0f6b56">${v}</span>` : v}</td>`
  }).join('')}</tr>`).join('')

  // The website's caveats, worded the same (app/dashboard/page.tsx report data).
  const conservative = [opts.usTaxHome ? 'No Social Security counted' : 'No state pension counted',
    ...((inputs.payGrowth ?? 0) > 0 ? [] : [`No raises: saving stays at ${money(saving)} a year`]),
    'Your home is not counted', `${pct(wr)} a year withdrawal, a common long-run rule`]
  const notIncluded = [...(TAX_ESTIMATES_AVAILABLE && inputs.taxEnabled ? [] : ['Tax on withdrawals in retirement']), ...(opts.usTaxHome ? ['Health insurance before 65'] : []), 'Year-to-year market swings']
  const kpi = (l: string, v: string) => `<div style="background:${C.s2};border-radius:12px;padding:10px 12px"><span style="display:block;font-size:11.5px;color:${C.ink2}">${l}</span><b class="m" style="font-size:18px">${v}</b></div>`
  const list = (items: string[]) => `<ul style="margin:0;padding:0;list-style:none">${items.map(t => `<li style="margin:3px 0">○ ${esc(t)}</li>`).join('')}</ul>`
  const row = (l: string, v: string, last = false) => `<tr><td style="padding:5px 0;${last ? '' : `border-bottom:1px solid ${C.b}`}">${l}</td><td class="m" style="padding:5px 0;text-align:right;${last ? '' : `border-bottom:1px solid ${C.b}`}">${v}</td></tr>`

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @page { margin: 28px }
  body { font: 13px/1.45 -apple-system, system-ui, sans-serif; color: ${C.ink}; background: ${C.card}; margin: 0 }
  .m { font-family: ui-monospace, Menlo, monospace; font-variant-numeric: tabular-nums }
  h1 { font: 600 34px/1.1 Georgia, serif; color: ${C.teal}; margin: 6px 0 8px }
  h2 { font: 600 16px Georgia, serif; margin: 0 0 8px }
  .sec { border-top: 1px solid ${C.b}; padding-top: 14px; margin-top: 18px }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px }
  .sub { color: ${C.ink3}; font-size: 11.5px; margin: 6px 0 0 }
  table { width: 100%; border-collapse: collapse }
</style></head><body>
  <div style="display:flex;justify-content:space-between;border-bottom:1px solid ${C.b};padding-bottom:12px">
    <b style="font-size:15px">${opts.branded ? 'UntilFire · Freedom plan' : 'Freedom plan'}</b>
    <span style="color:${C.ink3};font-size:12px">Prepared ${prepared} · built only from numbers entered</span>
  </div>
  <div style="margin:18px 0 6px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.ink3}">${[opts.age ? `Age ${opts.age}` : null, opts.place || null].filter(Boolean).map(s => esc(s!)).join(' · ')}</div>
    <h1>${when ? `Free in ${when}${f.ageAtFreedom != null ? `, <span style="color:${C.ink}">at ${f.ageAtFreedom}</span>` : ''}` : 'Not free within 65 years yet'}</h1>
    <p style="font-size:15px;color:${C.ink2};margin:0">When <b class="m">${esc(money(f.target))}</b> invested can pay <b class="m">${esc(money(spend))}</b> a year, for good.</p>
    <div style="height:10px;border-radius:99px;background:${C.s2};margin:14px 0 4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.max(1, share * 100)}%;background:${C.teal}"></i></div>
    <div class="m sub" style="margin:0">${esc(money(f.invested))} today · ${Math.round(share * 100)}% there</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px">
    ${kpi('Saving a year', esc(money(saving)))}
    ${kpi('Of take-home', f.monthlyIncome > 0 ? `${Math.round((saving / (f.monthlyIncome * 12)) * 100)}%` : '—')}
    ${kpi('Spending today', esc(money(f.monthlySpending * 12)))}
    ${kpi('Withdrawal rate', pct(wr))}
  </div>
  <div class="two">
    <div class="sec"><h2>How it's worked out</h2>
      <div class="m" style="background:${C.s2};border-radius:12px;padding:10px 14px;font-size:15px;margin:2px 0 10px">${esc(money(spend))} ÷ ${pct(wr)} = ${esc(money(f.target))}</div>
      ${chart(f, opts.age)}
    </div>
    <div class="sec"><h2>The numbers used</h2><table><tbody>
      ${row('Take-home a year', `${esc(money(f.monthlyIncome * 12))}`)}
      ${row('Saving a year', `${esc(money(saving))}`)}
      ${row('Invested now', esc(money(f.invested)))}
      ${row('Growth after inflation', pct(growth))}
      ${row('Spending once free', `${esc(money(spend))}/yr`, true)}
    </tbody></table></div>
  </div>
  <div class="two">
    <div class="sec"><h2>If things go differently</h2>
      <table style="text-align:center"><tbody>
        <tr><th></th>${growths.map((g, i) => `<th style="font-size:11.5px;color:${C.ink3};padding:6px 4px">${pct(g)}${i === 0 ? ' growth' : ''}</th>`).join('')}</tr>
        ${grid}
      </tbody></table>
      <p class="sub">${opts.age != null ? 'Age when free.' : 'Years to freedom.'} Growth is after inflation; US stocks averaged about 6–7% after inflation over the last century, with long bad stretches.</p>
    </div>
    <div class="sec"><h2>Kept conservative</h2>${list(conservative)}</div>
  </div>
  <div class="sec"><h2>Not included</h2>${list(notIncluded)}<p class="sub">Each can move the date.</p></div>
  <div style="display:flex;justify-content:space-between;border-top:1px solid ${C.b};margin-top:18px;padding-top:12px;color:${C.ink3};font-size:11.5px">
    <span>An estimate from the numbers entered, not financial advice.</span>
    ${opts.branded ? `<span>Make your own free at <b style="color:${C.green}">untilfire.com</b></span>` : ''}
  </div>
</body></html>`
}

/** Renders the page to a PDF on the phone and opens the share sheet. Nothing is uploaded. */
export async function shareReport(html: string) {
  const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 })
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Your freedom plan' })
}
