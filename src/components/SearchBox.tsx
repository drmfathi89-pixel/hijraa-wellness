'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

export default function SearchBox({ placeholder = 'Search name, IC or phone…' }: { placeholder?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') === q) return
      router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname)
    }, 300)
    return () => clearTimeout(t)
  }, [q, params, pathname, router])
  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="input pl-10" type="search" />
    </div>
  )
}
