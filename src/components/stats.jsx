import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Efferd dashboard-4 metric cards adapted to the app's monitoring data.
export function DashboardStat({ title, value, sub, icon: Icon, trend, trendUp, color, hint }) {
  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight
  const customColor = color?.startsWith('#')

  return (
    <Card className="min-w-0 gap-2">
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle className="font-normal text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />}
      </CardHeader>
      <CardContent>
        <p
          className={cn('text-2xl font-semibold tracking-tight break-words tabular-nums', !customColor && color)}
          style={customColor ? { color } : undefined}
          title={hint}
        >
          {value}
        </p>
      </CardContent>
      {(sub || typeof trend === 'number') && (
        <CardFooter className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {sub && <span>{sub}</span>}
          {typeof trend === 'number' && (
            <span className="inline-flex items-center gap-1">
              <TrendIcon className="size-3.5" aria-hidden="true" /> Trend {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
