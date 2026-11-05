import Link from 'next/link'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { TZ } from '@/lib/utils'
import { PageHeader } from '@/components/ui'
import { BarList, Columns } from '@/components/charts'

export const metadata = { title: 'Analytics' }

const PERIODS = [['30', 'Last 30 days'], ['90', 'Last 3 months'], ['365', 'Last 12 months'], ['all', 'All time']] as const

export default async function Analytics({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const me = await requireUser()
  if (!me.roles.some((r) => r === 'admin' || r === 'doctor')) redirect('/')
  const { p = '90' } = await searchParams
  const period = PERIODS.some(([k]) => k === p) ? p : '90'
  const since = period === 'all' ? null : Number(period)
  const inPeriod = since ? sql`and e.encounter_at >= now() - make_interval(days => ${since})` : sql``

  const [[tot], gender, ages, monthly, postcodes, dx, [dxMeta]] = await Promise.all([
    sql<{ patients: number; with_dob: number }[]>`select count(*)::int as patients, count(dob)::int as with_dob from patients`,
    sql<{ label: string; value: number }[]>`select coalesce(gender, 'Not recorded') as label, count(*)::int as value from patients group by 1 order by 2 desc`,
    sql<{ label: string; value: number }[]>`
      with a as (select date_part('year', age(dob))::int as y from patients where dob is not null)
      select g.label, count(a.y)::int as value from (values (0,'0-4',0,4),(1,'5-12',5,12),(2,'13-17',13,17),(3,'18-29',18,29),(4,'30-39',30,39),(5,'40-49',40,49),(6,'50-59',50,59),(7,'60-69',60,69),(8,'70+',70,200)) g(o,label,lo,hi)
      left join a on a.y between g.lo and g.hi group by g.o, g.label order by g.o`,
    sql<{ m: string; label: string; value: number }[]>`
      with months as (select generate_series(date_trunc('month', (now() at time zone ${TZ})) - interval '11 months', date_trunc('month', (now() at time zone ${TZ})), interval '1 month') as m)
      select to_char(months.m, 'YYYY-MM') as m, to_char(months.m, 'Mon') as label, count(p.id)::int as value
      from months left join patients p on date_trunc('month', p.created_at at time zone ${TZ}) = months.m group by months.m order by months.m`,
    sql<{ label: string; value: number }[]>`
      select substring(address from '(\\d{5})') as label, count(*)::int as value from patients
      where substring(address from '(\\d{5})') is not null group by 1 order by 2 desc limit 8`,
    sql<{ label: string; value: number; patients: number }[]>`
      with lines as (
        select e.patient_id, lower(trim(l)) as dx from encounters e cross join lateral unnest(string_to_array(coalesce(e.diagnosis_notes, ''), E'\\n')) l
        where e.status = 'closed' and not e.diagnosis_sensitive ${inPeriod} and trim(l) <> '')
      select dx as label, count(*)::int as value, count(distinct patient_id)::int as patients from lines group by dx order by value desc, dx limit 15`,
    sql<{ total: number; sensitive: number; notifiable: number }[]>`
      select count(*)::int as total, count(*) filter (where e.diagnosis_sensitive)::int as sensitive, count(*) filter (where e.diagnosis_notifiable)::int as notifiable
      from encounters e where e.status = 'closed' ${inPeriod}`,
  ])
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <>
      <PageHeader title="Analytics" subtitle="Patient demography and diagnoses" />

      <h2 className="h-section mb-3">Patient demography</h2>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="card card-pad">
          <div className="mb-3 flex items-baseline justify-between"><h3 className="font-semibold text-slate-800">Gender</h3><span className="text-sm text-slate-500">{tot.patients} patients</span></div>
          <BarList rows={gender.map((g) => ({ label: g.label, value: g.value, sub: tot.patients ? `${Math.round((g.value / tot.patients) * 100)}%` : '' }))} empty="No patients yet." />
        </section>
        <section className="card card-pad">
          <div className="mb-3 flex items-baseline justify-between"><h3 className="font-semibold text-slate-800">Age group</h3><span className="text-xs text-slate-400">{tot.patients - tot.with_dob ? `${tot.patients - tot.with_dob} without date of birth` : ''}</span></div>
          <BarList rows={ages} empty="No dates of birth recorded yet." />
        </section>
        <section className="card card-pad">
          <h3 className="font-semibold text-slate-800">New patients per month</h3>
          <Columns caption="New patients per month, last 12 months" rows={monthly.map((m) => ({ label: m.label, value: m.value, tip: `${m.label} ${m.m.slice(0, 4)}: ${m.value} new` }))} />
        </section>
        <section className="card card-pad">
          <h3 className="mb-3 font-semibold text-slate-800">Top postcodes <span className="text-xs font-normal text-slate-400">(from address)</span></h3>
          <BarList rows={postcodes} empty="No postcodes found in addresses yet." />
        </section>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="h-section">Diagnoses</h2>
        <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          {PERIODS.map(([k, l]) => <Link key={k} href={`/analytics?p=${k}`} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${period === k ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</Link>)}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card card-pad lg:col-span-2">
          <h3 className="mb-3 font-semibold text-slate-800">Top diagnoses <span className="text-xs font-normal text-slate-400">(completed encounters)</span></h3>
          <BarList rows={dx.map((d) => ({ label: cap(d.label), value: d.value, sub: `${d.patients} patient${d.patients === 1 ? '' : 's'}` }))} empty="No diagnoses in this period." />
        </section>
        <section className="card card-pad space-y-3">
          <div><div className="text-xs font-semibold text-slate-500">Completed encounters</div><div className="text-2xl font-extrabold">{dxMeta.total}</div></div>
          <div><div className="text-xs font-semibold text-slate-500">Notifiable to Ministry of Health</div><div className="text-2xl font-extrabold">{dxMeta.notifiable}</div></div>
          <div><div className="text-xs font-semibold text-slate-500">Sensitive diagnoses</div><div className="text-2xl font-extrabold">{dxMeta.sensitive}</div><p className="text-xs text-slate-400">Counted here, but never listed by name.</p></div>
        </section>
      </div>
    </>
  )
}
