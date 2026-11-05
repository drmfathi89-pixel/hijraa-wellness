import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SWRegister from '@/components/SWRegister'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'HIJRAA WELLNESS', template: '%s · HIJRAA WELLNESS' },
  description: 'Clinic management system for HIJRAA WELLNESS',
  applicationName: 'HIJRAA WELLNESS',
  appleWebApp: { capable: true, title: 'HIJRAA', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0b8a6e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <SWRegister />
      </body>
    </html>
  )
}
