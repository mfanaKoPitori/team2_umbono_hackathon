import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Logo from './Logo'
import { useTick } from '../hooks/useTick'

export default function DashboardHeader({ lastUpdated }) {
  useTick(1000)
  const seconds = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : null

  return (
    <header className="dash-header">
      <Logo subtitle="Community Safety Command Centre" />
      <div className="dash-header__right">
        <span className="pill pill--live">
          <span className="pill__dot" />
          <span>Live</span>
          {seconds != null && <span className="pill--live__detail">{` · updated ${seconds}s ago`}</span>}
        </span>
        <Link to="/report" className="btn btn--primary">
          <Plus size={18} strokeWidth={2.6} />
          Report incident
        </Link>
      </div>
    </header>
  )
}
