import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Workhouse Festival',
  description: 'Join the inQbeta network and enter the Workhouse Festival exchange experience.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="legacy">
      <body className="bg-surface-50-950 text-surface-950-50 antialiased">
        {children}
      </body>
    </html>
  )
}
