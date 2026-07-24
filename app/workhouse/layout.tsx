import '../globals.css'
import './semantic-identity.css'

export const metadata = {
  title: 'inQbeta: Landed Exchange Experiment',
  description: 'Try inQbeta — a simple, people-led exchange experiment for Landed Festival.',
}

export default function WorkhouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="workhouse-surface min-h-dvh bg-surface-50-950 text-surface-950-50">
      {children}
    </div>
  )
}
