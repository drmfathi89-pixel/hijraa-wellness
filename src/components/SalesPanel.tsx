import { sql } from '@/lib/db'
import { TZ } from '@/lib/utils'
import { rm } from '@/lib/types'

type Day = { d: string; amt: number; visits: number }

/** Sales = charges on completed encounters, by visit date in clinic time. */
export default async function SalesPanel() {
  const [[tot], days, top] = await Promise.all([
    sql<{ today: number; month: number; month_visits: number }[]>`
      with lines as (
        select e.id, (e.encounter_at at time zone ${TZ})::date as d, (c->>'qty')::numeric * (c->>'price')::numeric as amt
        from encounters e cross join lateral jsonb_array_elements(e.charges) c where e.status = 'closed')
      select coalesce(sum(amt) filter (where d = (now() at time zone ${TZ})::date), 0)::float as today,
             coalesce(sum(amt) filter (where date_trunc('month', d) = date_trunc('month', (now() at time zone ${TZ})::date)), 0)::float as month,
             count(distinct id) filter (where date_trunc('month', d) = date_trunc('month', (now() at time zone ${TZ})::date))::int as month_visits
      from lines`,
    sql<Day[]>`
      with days as (select generate_series((now() at time zone ${TZ})::date - 13, (now() at time zone ${TZ})::date, interval '1 day')::date as d),
      lines as (
        select e.id, (e.encounter_at at time zone ${TZ})::date as d, (c->>'qty')::numeric * (c->>'price')::numeric as amt
        from encounters e cross join lateral jsonb_array_elements(e.charges) c where e.status = 'closed')
      select to_char(days.d, 'YYYY-MM-DD') as d, coalesce(sum(lines.amt), 0)::float as amt, count(distinct lines.id)::int as visits
      from days left join lines on lines.d = days.d group by days.d order by days.d`,
    sql<{ item: string; qty: number; amt: number }[]>`
      select c->>'item' as item, sum((c->>'qty')::numeric)::float as qty, sum((c->>'qty')::numeric * (c->>'price')::numeric)::float as amt
      from encounters e cross join lateral jsonb_array_elements(e.charges) c
      where e.status = 'closed' and date_trunc('month', (e.encounter_at at time zone ${TZ})::date) = date_trunc('month', (now() at time zone ${TZ})::date)
      group by 1 order by amt desc limit 5`,
  ])
  const max = Math.max(...days.map((d) => d.amt), 0)
  const peak = max > 0 ? days.findIndex((d) => d.amt === max) : -1
  const label = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' })
  const monthName = new Date().toLocaleDateString('en-GB', { month: 'long', timeZone: TZ })

  return (
    <section className="card card-pad mb-5" aria-labelledby="sales-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <h2 id="sales-h" className="h-section">Sales</h2>
        <p className="text-xs text-slate-400">Charges on completed encounters</p>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-brand-50 p-3">
          <div className="text-xs font-semibold text-slate-500">Today</div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{rm(tot.today)}</div>
        </div>
        <div className="rounded-xl bg-brand-50 p-3">
          <div className="text-xs font-semibold text-slate-500">{monthName}</div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{rm(tot.month)}</div>
          <div className="text-xs text-slate-500">{tot.month_visits} billed visit{tot.month_visits === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <figure className="lg:col-span-2">
          <figcaption className="mb-2 text-sm font-semibold text-slate-700">Daily sales, last 14 days</figcaption>
          <div className="relative mt-5 h-40">
            {/* recessive grid: baseline + midline */}
            <div className="absolute inset-x-0 bottom-6 border-t border-slate-200" />
            {max > 0 && <div className="absolute inset-x-0 border-t border-dashed border-slate-100" style={{ bottom: `calc(1.5rem + (100% - 1.5rem) / 2)` }} />}
            <ol className="absolute inset-0 flex items-end gap-[2px]">
              {days.map((d, i) => (
                <li key={d.d} className="group relative flex h-full flex-1 flex-col justify-end" tabIndex={0} aria-label={`${label(d.d, { day: 'numeric', month: 'short' })}: ${rm(d.amt)}`}>
                  <div className="relative mx-auto flex w-full max-w-7 flex-1 items-end">
                    {i === peak && <span className="absolute inset-x-0 -top-1 text-center text-[10px] font-semibold text-slate-600" style={{ bottom: `${(d.amt / max) * 100}%`, top: 'auto', marginBottom: 2 }}>{Math.round(d.amt)}</span>}
                    <div className={`w-full rounded-t-[4px] ${d.amt > 0 ? 'bg-brand-600 group-hover:bg-brand-800 group-focus:bg-brand-800' : ''}`} style={{ height: max > 0 ? `${(d.amt / max) * 100}%` : 0, minHeight: d.amt > 0 ? 2 : 0 }} />
                  </div>
                  <span className={`mt-1 h-5 text-center text-[10px] ${i === days.length - 1 ? 'font-bold text-slate-700' : 'text-slate-400'}`}>{label(d.d, { day: 'numeric' })}</span>
                  {/* hover / focus tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block group-focus:block">
                    <div className="font-semibold">{label(d.d, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                    <div>{rm(d.amt)} · {d.visits} visit{d.visits === 1 ? '' : 's'}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {max === 0 && <p className="mt-1 text-xs text-slate-400">No sales in the last 14 days yet.</p>}
          <table className="sr-only">
            <caption>Daily sales, last 14 days</caption>
            <thead><tr><th>Date</th><th>Sales</th><th>Visits</th></tr></thead>
            <tbody>{days.map((d) => <tr key={d.d}><td>{d.d}</td><td>{rm(d.amt)}</td><td>{d.visits}</td></tr>)}</tbody>
          </table>
        </figure>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Top items this month</h3>
          {top.length === 0 ? <p className="text-sm text-slate-400">Nothing billed yet this month.</p> : (
            <ol className="space-y-1.5 text-sm">
              {top.map((t) => (
                <li key={t.item} className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-slate-800">{t.item} <span className="text-xs text-slate-400">× {t.qty}</span></span>
                  <span className="shrink-0 font-semibold text-slate-900">{rm(t.amt)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
