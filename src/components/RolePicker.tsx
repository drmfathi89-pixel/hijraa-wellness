// Tick one or more roles; submitted as repeated "roles" fields.
const OPTIONS = [
  { value: 'superadmin', label: 'Superadmin', hint: 'delete patients, manage superadmins' },
  { value: 'admin', label: 'Admin', hint: 'users, price list, sales' },
  { value: 'doctor', label: 'Doctor', hint: 'clinical work' },
  { value: 'staff', label: 'Staff', hint: 'front desk' },
]

export default function RolePicker({ value = ['doctor'], canSuper = false }: { value?: string[]; canSuper?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.filter((o) => o.value !== 'superadmin' || canSuper).map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
          <input type="checkbox" name="roles" value={o.value} defaultChecked={value.includes(o.value)} />
          <span><span className="font-semibold">{o.label}</span> <span className="text-xs text-slate-400">{o.hint}</span></span>
        </label>
      ))}
    </div>
  )
}
