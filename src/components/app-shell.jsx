import { WifiOff } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { AppSidebar } from '@/components/app-sidebar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppShell({ children, page, pathname, user, isAdmin, isOnline, onLogout }) {
  const defaultOpen = typeof document === 'undefined' || !document.cookie.split('; ').includes('sidebar_state=false')

  return (
    <TooltipProvider delayDuration={160}>
      <SidebarProvider
        defaultOpen={defaultOpen}
        className="monitoring-shell bg-background"
        style={{ '--sidebar-width': '15.5rem' }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <AppSidebar pathname={pathname} isAdmin={isAdmin} />
        <SidebarInset className="min-w-0 md:m-2 md:ml-0 md:rounded-lg md:border md:border-border">
          <AppHeader page={page} user={user} isAdmin={isAdmin} onLogout={onLogout} />
          <div id="main-content" tabIndex={-1} className="dashboard-workspace mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-4 p-4 md:p-6">
            {!isOnline && (
              <Alert role="status">
                <WifiOff aria-hidden="true" />
                <AlertDescription>
                  You are offline. Refresh, predictions, and updates resume when you reconnect. Saved readings show their last update time.
                </AlertDescription>
              </Alert>
            )}
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
