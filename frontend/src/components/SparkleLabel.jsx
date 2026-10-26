import { Sparkles } from 'lucide-react'

export default function SparkleLabel({ children }) {
  return (
    <span className="sparkle-label">
      <Sparkles size={13} strokeWidth={2.4} />
      {children}
    </span>
  )
}
