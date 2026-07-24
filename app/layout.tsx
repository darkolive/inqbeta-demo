import type { Metadata } from 'next'
import './globals.css'

const accessibilityPreferencesScript = `
(() => {
  try {
    const root = document.documentElement;
    const savedMode = localStorage.getItem('inqbeta-color-mode');

    root.classList.toggle('dark', savedMode === 'dark');
    root.style.removeProperty('--user-font-scale');
    localStorage.removeItem('inqbeta-text-scale');
  } catch {
    // Keep the server-rendered light theme.
  }
})();
`

export const metadata: Metadata = {
  title: 'inQbeta: Landed Exchange Experiment',
  description: 'Try inQbeta — a simple, people-led exchange experiment for Landed Festival.',
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
