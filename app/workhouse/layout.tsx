import '../globals.css'
import './semantic-identity.css'

export const metadata = {
  title: 'Workhouse Festival',
  description: 'Join the inQbeta network and enter the Workhouse Festival exchange experience.',
}

export default function WorkhouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="workhouse-surface min-h-dvh bg-surface-50-950 text-surface-950-50">
      {children}
    </div>
  )
}
