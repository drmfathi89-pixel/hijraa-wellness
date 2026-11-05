'use client'
import { Printer } from 'lucide-react'
export default function PrintButton() {
  return <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}><Printer size={14} /> Print</button>
}
