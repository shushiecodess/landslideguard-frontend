import { Menu, PanelLeft } from 'lucide-react'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

export function CustomSidebarTrigger() {
  const { isMobile, open, openMobile } = useSidebar()
  const expanded = isMobile ? openMobile : open
  const Icon = isMobile ? Menu : PanelLeft
  const label = isMobile ? 'Open navigation menu' : expanded ? 'Collapse navigation' : 'Expand navigation'

  return (
    <SidebarTrigger aria-expanded={expanded} aria-label={label} title={label}>
      <Icon aria-hidden="true" />
    </SidebarTrigger>
  )
}
