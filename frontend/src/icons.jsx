import {
  Eye,
  Wallet,
  SprayCan,
  Car,
  Flame,
  HeartPulse,
  Volume2,
  Construction,
  CircleHelp,
} from 'lucide-react'

export const ICONS = {
  Eye,
  Wallet,
  SprayCan,
  Car,
  Flame,
  HeartPulse,
  Volume2,
  Construction,
  CircleHelp,
}

export function Icon({ name, ...props }) {
  const Cmp = ICONS[name] ?? CircleHelp
  return <Cmp {...props} />
}
