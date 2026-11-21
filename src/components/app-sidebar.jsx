import { Globe, Mountain } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NavGroup } from '@/components/nav-group'
import { navGroups } from '@/components/app-shared'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar'

export function AppSidebar({ pathname, isAdmin }) {
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="gap-3 p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="LandslideGuard AI">
              <Link to="/dashboard" onClick={() => setOpenMobile(false)} aria-label="LandslideGuard AI dashboard">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <Mountain className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate font-semibold">LandslideGuard AI</span>
                  <span className="block truncate text-xs text-muted-foreground">Northeast India</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <nav aria-label="Primary">
          {navGroups.map(({ label, items }) => (
            <NavGroup
              key={label}
              label={label}
              items={items.filter((item) => !item.adminOnly || isAdmin)}
              pathname={pathname}
            />
          ))}
        </nav>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Public site">
              <Link to="/" onClick={() => setOpenMobile(false)}>
                <Globe aria-hidden="true" />
                <span>Public site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
