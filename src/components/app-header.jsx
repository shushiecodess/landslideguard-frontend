import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppBreadcrumbs } from '@/components/app-breadcrumbs'
import { CustomSidebarTrigger } from '@/components/custom-sidebar-trigger'
import { NavUser } from '@/components/nav-user'
import ConnectionStatus from '@/components/ConnectionStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function AppHeader({ page, user, isAdmin, onLogout }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <CustomSidebarTrigger />
        <Separator orientation="vertical" className="!h-4 self-center" />
        <AppBreadcrumbs page={page} />
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <Badge variant="outline" title="Model trained on synthetic data" className="hidden md:inline-flex">
          Demo model
        </Badge>
        <ConnectionStatus />
        <Button asChild size="icon" variant="ghost">
          <Link to="/alerts" aria-label="Open alerts" title="Alerts"><Bell aria-hidden="true" /></Link>
        </Button>
        <Separator orientation="vertical" className="!h-4 self-center" />
        <NavUser user={user} isAdmin={isAdmin} onLogout={onLogout} />
      </div>
    </header>
  )
}
