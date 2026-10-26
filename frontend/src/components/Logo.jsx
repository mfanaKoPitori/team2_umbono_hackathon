import { Eye } from 'lucide-react'

export default function Logo({ subtitle }) {
  return (
    <div className="logo">
      <span className="logo__mark">
        <Eye size={20} strokeWidth={2.6} />
      </span>
      <div className="logo__text">
        <span className="logo__name">Siyabona</span>
        {subtitle && <span className="logo__subtitle">{subtitle}</span>}
      </div>
    </div>
  )
}
