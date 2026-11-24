import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function ChartCard({
  title,
  description,
  isPending,
  error,
  isEmpty,
  emptyText = 'No data for this range yet.',
  className,
  children,
}: {
  title: string
  description?: string
  isPending: boolean
  error: Error | null
  isEmpty: boolean
  emptyText?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn('reveal min-w-0 bg-white/70', className)}>
      <CardHeader>
        <CardTitle className="font-heading text-2xl text-sea-deep">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="min-w-0">
        {isPending ? (
          <Skeleton className="h-64 w-full rounded-lg" aria-busy="true" />
        ) : error ? (
          <p role="alert" className="flex h-64 items-center justify-center text-sm text-bounty-red">
            {error.message}
          </p>
        ) : isEmpty ? (
          <p className="flex h-64 items-center justify-center rounded-lg border border-dashed border-ink/20 text-sm text-ink/60">
            {emptyText}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
