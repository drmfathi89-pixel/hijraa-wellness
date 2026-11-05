/* eslint-disable @next/next/no-img-element */
// HIJRAA WELLNESS logo (vector, traced from the clinic logo; see public/brand/).
export function Logo({ className = 'h-11 w-auto' }: { className?: string }) {
  return <img src="/brand/hijraa-wellness-logo.svg" alt="Hijraa Wellness" className={className} width={202} height={152} />
}

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return <img src="/brand/hijraa-hearts.svg" alt="" aria-hidden className={className} width={96} height={84} />
}
