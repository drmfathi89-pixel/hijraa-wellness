// Small, dependency-free charts. Single series -> one brand colour, values in text ink.

export function BarList({ rows, unit = '', empty = 'No data yet.' }: { rows: { label: string; value: number; sub?: string }[]; unit?: string; empty?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value))
  if (rows.length === 0 || max === 0) return <p className="text-sm text-slate-400">{empty}</p>
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="mb-0.5 flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-slate-800">{r.label}{r.sub && <span className="ml-1 text-xs text-slate-400">{r.sub}</span>}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{r.value.toLocaleString()}{unit}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: r.value ? `${Math.max(2, (r.value / max) * 100)}%` : 0 }} /></div>
        </li>
      ))}
    </ul>
  )
}

export function Columns({ rows, caption }: { rows: { label: string; value: number; tip: string }[]; caption: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value))
  return (
    <figure>
      <div className="relative mt-5 h-36">
        <div className="absolute inset-x-0 bottom-5 border-t border-slate-200" />
        <ol className="absolute inset-0 flex items-end gap-[2px]">
          {rows.map((r) => (
            <li key={r.label} tabIndex={0} aria-label={r.tip} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="mx-auto flex w-full max-w-8 flex-1 items-end">
                <div className={`w-full rounded-t-[4px] ${r.value ? 'bg-brand-600 group-hover:bg-brand-800 group-focus:bg-brand-800' : ''}`} style={{ height: max ? `${(r.value / max) * 100}%` : 0, minHeight: r.value ? 2 : 0 }} />
              </div>
              <span className="mt-1 h-4 text-center text-[10px] text-slate-400">{r.label}</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block group-focus:block">{r.tip}</div>
            </li>
          ))}
        </ol>
      </div>
      <table className="sr-only"><caption>{caption}</caption><tbody>{rows.map((r) => <tr key={r.label}><td>{r.tip}</td></tr>)}</tbody></table>
    </figure>
  )
}
