import type { Metadata } from 'next'
import './globals.css'

const accessibilityPreferencesScript = `
(() => {
  try {
    const root = document.documentElement;
    const savedMode = localStorage.getItem('inqbeta-color-mode');
    const savedScale = Number(localStorage.getItem('inqbeta-text-scale'));
    const scale = Number.isFinite(savedScale) && savedScale >= 90 && savedScale <= 150
      ? savedScale
      : 100;

    root.classList.toggle('dark', savedMode === 'dark');
    root.style.setProperty('--user-font-scale', String(scale / 100));
  } catch {
    // Keep the server-rendered light theme and default text size.
  }
})();
`

export const metadata: Metadata = {
  title: 'Workhouse Festival',
  description: 'Join the inQbeta network and enter the Workhouse Festival exchange experience.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="inQbetaaccessible" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accessibilityPreferencesScript }} />
      </head>
      <body className="bg-surface-50-950 text-surface-950-50 antialiased">
        {children}
      </body>
    </html>
  )
}
