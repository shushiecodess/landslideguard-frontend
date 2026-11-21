import { Bell, BrainCircuit, ChevronRight, Map } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'

const actions = [
  { title: 'Open risk map', to: '/map', icon: Map },
  { title: 'Run prediction', to: '/prediction', icon: BrainCircuit },
  { title: 'Review alerts', to: '/alerts', icon: Bell },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
      <CardContent>
        <ItemGroup className="gap-1">
          {actions.map(({ title, to, icon: Icon }) => (
            <Item asChild key={to} size="sm">
              <Link to={to}>
                <ItemMedia variant="icon"><Icon aria-hidden="true" /></ItemMedia>
                <ItemContent><ItemTitle>{title}</ItemTitle></ItemContent>
                <ItemActions><ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /></ItemActions>
              </Link>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
