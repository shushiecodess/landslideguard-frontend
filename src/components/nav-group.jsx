import { NavLink } from 'react-router-dom'
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar'

export function NavGroup({ label, items, pathname }) {
  const { setOpenMobile } = useSidebar()
  if (!items.length) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(({ path, title, icon: Icon }) => (
          <SidebarMenuItem key={path}>
            <SidebarMenuButton asChild isActive={pathname === path} tooltip={title}>
              <NavLink to={path} end onClick={() => setOpenMobile(false)}>
                <Icon aria-hidden="true" />
                <span>{title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
