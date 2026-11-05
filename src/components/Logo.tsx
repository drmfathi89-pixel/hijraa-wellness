export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="112" fill="#0b8a6e" />
      <g transform="translate(256 256) scale(.9) translate(-256 -256)">
        <path d="M256 412c-8 0-15-3-21-8C150 330 96 282 96 210c0-55 43-98 96-98 27 0 49 11 64 31 15-20 37-31 64-31 53 0 96 43 96 98 0 72-54 120-139 194-6 5-13 8-21 8z" fill="#fff" />
        <rect x="232" y="176" width="48" height="152" rx="10" fill="#0b8a6e" />
        <rect x="180" y="228" width="152" height="48" rx="10" fill="#0b8a6e" />
      </g>
    </svg>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold tracking-wide text-brand-800">HIJRAA</div>
        <div className="text-[10px] font-semibold tracking-[0.25em] text-brand-600">WELLNESS</div>
      </div>
    </div>
  )
}
