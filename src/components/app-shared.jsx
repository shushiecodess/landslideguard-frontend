import { Bell, BrainCircuit, ChartNoAxesCombined, LayoutGrid, Map, MapPin, Radio, Settings, ShieldCheck, Sparkles, Volume2 } from 'lucide-react'

export const navGroups = [
  {
    label: 'Monitor',
    items: [
      { path: '/map', title: 'Risk Map', icon: Map },
      { path: '/dashboard', title: 'Dashboard', icon: LayoutGrid },
      { path: '/alerts', title: 'Alerts', icon: Bell },
      { path: '/voice-alerts', title: 'Voice Alerts', icon: Volume2 },
      { path: '/voice-alerts/send', title: 'Send Voice Alert', icon: Radio, adminOnly: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/prediction', title: 'Prediction', icon: BrainCircuit },
      { path: '/analytics', title: 'Analytics', icon: ChartNoAxesCombined },
      { path: '/ai-insights', title: 'AI Insights', icon: Sparkles },
    ],
  },
  {
    label: 'Manage',
    items: [
      { path: '/locations', title: 'Locations', icon: MapPin },
      { path: '/admin', title: 'Admin', icon: ShieldCheck, adminOnly: true },
      { path: '/settings', title: 'Settings', icon: Settings, adminOnly: true },
    ],
  },
]

export const navLinks = navGroups.flatMap(({ label, items }) => items.map((item) => ({ ...item, group: label })))
