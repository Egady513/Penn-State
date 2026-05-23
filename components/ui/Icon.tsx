import {
  Home,
  LayoutGrid,
  Trophy,
  DollarSign,
  Flag,
  Users,
  Tag,
  Check,
  Plus,
  Minus,
  ChevronRight,
  ChevronLeft,
  Bell,
  Cloud,
  MessageCircle,
  Send,
  Pin,
  Target,
  Wind,
  Search,
  LogOut,
  Megaphone,
  Clock,
  QrCode,
  ArrowUp,
  CalendarDays,
  MapPin,
  Heart,
  ExternalLink,
  CheckCircle,
  ArrowRight,
  CloudOff,
  WifiOff,
  type LucideProps,
} from 'lucide-react'

const iconMap: Record<string, React.FC<LucideProps>> = {
  home: Home,
  grid: LayoutGrid,
  trophy: Trophy,
  dollar: DollarSign,
  flag: Flag,
  users: Users,
  tag: Tag,
  check: Check,
  plus: Plus,
  minus: Minus,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  bell: Bell,
  cloud: Cloud,
  message: MessageCircle,
  send: Send,
  pin: Pin,
  target: Target,
  wind: Wind,
  search: Search,
  logout: LogOut,
  megaphone: Megaphone,
  clock: Clock,
  qr: QrCode,
  'arrow-up': ArrowUp,
  calendar: CalendarDays,
  'map-pin': MapPin,
  heart: Heart,
  external: ExternalLink,
  'check-circle': CheckCircle,
  'arrow-right': ArrowRight,
  scorecard: LayoutGrid,
  leaderboard: Trophy,
  owe: DollarSign,
  'wifi-off': WifiOff,
  'cloud-check': CheckCircle,
}

interface IconProps {
  name: string
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

export function Icon({ name, size = 22, color = 'currentColor', strokeWidth = 1.75, className }: IconProps) {
  const Comp = iconMap[name]
  if (!Comp) return null
  return <Comp size={size} color={color} strokeWidth={strokeWidth} className={className} />
}
