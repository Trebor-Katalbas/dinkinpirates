'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartCard } from '@/components/admin/chart-card'
import { OccupancyHeatmap } from '@/components/admin/occupancy-heatmap'
import { RANGES, useMetric } from '@/components/admin/use-metric'
import { useCourts } from '@/components/booking/queries'
import { formatDateKey, formatMoney } from '@/components/booking/slot-utils'
import { ApiError } from '@/components/site/fetch-json'
import { signInHref } from '@/components/site/safe-callback'
import { TIERS } from '@/lib/tiers'
import type { MetricRange } from '@/types/metrics'

const shortDate = (key: string) => formatDateKey(key, { month: 'short', day: 'numeric' })

const weeklyConfig = {
  charter: { label: 'Private Charter', color: 'var(--chart-1)' },
  voyage: { label: 'Open Voyage', color: 'var(--chart-2)' },
} satisfies ChartConfig

const clicksConfig = {
  clicks: { label: 'Clicks', color: 'var(--chart-3)' },
  landing: { label: 'Dock' },
  messenger: { label: 'Messenger' },
  fb: { label: 'Facebook' },
  qr: { label: 'QR code' },
} satisfies ChartConfig

const TIER_COLORS = [
  'var(--chart-5)',
  'var(--chart-3)',
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-4)',
]
const tierConfig: ChartConfig = Object.fromEntries([
  ['count', { label: 'Crew' }],
  ...TIERS.map((t, i) => [t.tier, { label: t.label, color: TIER_COLORS[i] }]),
])

const revenueConfig = {
  revenue: { label: 'Revenue', color: 'var(--chart-2)' },
} satisfies ChartConfig

function AccessDenied({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="wanted-poster mx-auto max-w-md text-center">
      <Lock className="mx-auto size-10 text-bounty-red" aria-hidden />
      <p className="mt-2 font-display text-3xl text-sea-deep">Captain&apos;s quarters</p>
      <p className="mt-2 text-ink/75">
        The Captain&apos;s Log is only open to the venue owner.
        {signedIn ? ' Your account does not have access.' : ' Sign in with an owner account.'}
      </p>
      <Button asChild className="tap mt-4">
        {signedIn ? (
          <Link href="/">Back to the Dock</Link>
        ) : (
          <Link href={signInHref('/admin')}>Sign in</Link>
        )}
      </Button>
    </div>
  )
}

function BookingsWeekly({ range }: { range: MetricRange }) {
  const q = useMetric('bookings-weekly', range)
  return (
    <ChartCard
      title="Bookings per week"
      description="Private Charter vs Open Voyage"
      isPending={q.isPending}
      error={q.error}
      isEmpty={!q.data?.length}
      className="lg:col-span-2"
    >
      <ChartContainer config={weeklyConfig} className="aspect-auto h-64 w-full">
        <LineChart data={q.data} margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tickFormatter={shortDate}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, p) => `Week of ${shortDate(String(p[0]?.payload?.week ?? ''))}`}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            dataKey="charter"
            type="monotone"
            stroke="var(--color-charter)"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            dataKey="voyage"
            type="monotone"
            stroke="var(--color-voyage)"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

function Occupancy({ range }: { range: MetricRange }) {
  const q = useMetric('occupancy', range)
  return (
    <ChartCard
      title="Occupancy heatmap"
      description="Bookings by day of week and hour (venue time)"
      isPending={q.isPending}
      error={q.error}
      isEmpty={!q.data?.some((r) => r.bookings > 0)}
      className="lg:col-span-2"
    >
      <OccupancyHeatmap rows={q.data ?? []} />
    </ChartCard>
  )
}

function ClicksBySource({ range }: { range: MetricRange }) {
  const q = useMetric('clicks-by-source', range)
  return (
    <ChartCard
      title="Voyage click-through"
      description="Clicks on “View on Reclub” links by source"
      isPending={q.isPending}
      error={q.error}
      isEmpty={!q.data?.some((r) => r.clicks > 0)}
    >
      <ChartContainer config={clicksConfig} className="aspect-auto h-64 w-full">
        <BarChart data={q.data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="source"
            tickLine={false}
            axisLine={false}
            tickFormatter={(s: string) =>
              String(clicksConfig[s as keyof typeof clicksConfig]?.label ?? s)
            }
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent nameKey="clicks" labelKey="source" />} />
          <Bar dataKey="clicks" fill="var(--color-clicks)" radius={6} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

function TierDistribution({ range }: { range: MetricRange }) {
  const q = useMetric('tiers', range)
  const data = (q.data ?? []).map((r) => ({ ...r, fill: `var(--color-${r.tier})` }))
  const total = data.reduce((n, r) => n + r.count, 0)
  return (
    <ChartCard
      title="Bounty tiers"
      description={`Crew by tier · ${total.toLocaleString()} total`}
      isPending={q.isPending}
      error={q.error}
      isEmpty={total === 0}
    >
      <ChartContainer config={tierConfig} className="mx-auto aspect-square h-64">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="tier" hideLabel />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="tier"
            innerRadius="55%"
            outerRadius="85%"
            strokeWidth={2}
          />
          <ChartLegend content={<ChartLegendContent nameKey="tier" />} className="flex-wrap" />
        </PieChart>
      </ChartContainer>
    </ChartCard>
  )
}

function Revenue() {
  const q = useMetric('revenue', '90d')
  const courts = useCourts()
  const currency = courts.data?.[0]?.currency ?? 'PHP'
  return (
    <ChartCard
      title="Revenue trend"
      description="Last 90 days"
      isPending={q.isPending}
      error={q.error}
      isEmpty={!q.data?.some((r) => r.revenue > 0)}
      className="lg:col-span-2"
    >
      <ChartContainer config={revenueConfig} className="aspect-auto h-64 w-full">
        <AreaChart data={q.data} margin={{ left: 0, right: 12, top: 8 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickFormatter={shortDate}
            minTickGap={32}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => formatMoney(v, currency)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, p) => shortDate(String(p[0]?.payload?.date ?? ''))}
              />
            }
          />
          <Area
            dataKey="revenue"
            type="monotone"
            stroke="var(--color-revenue)"
            strokeWidth={2}
            fill="url(#revenue-fill)"
          />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}

export function CaptainsLog() {
  const { data: session, status } = useSession()
  const [range, setRange] = useState<MetricRange>('90d')
  // Probe one metric so a server-side 403 also shows the access-denied card.
  const probe = useMetric('tiers', range)

  if (status === 'loading') {
    return (
      <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }
  const forbidden =
    probe.error instanceof ApiError && (probe.error.status === 401 || probe.error.status === 403)
  if (session?.user?.role !== 'owner' || forbidden) {
    return <AccessDenied signedIn={status === 'authenticated'} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/70">Range for bookings, occupancy and clicks</p>
        <Tabs value={range} onValueChange={(v) => setRange(v as MetricRange)}>
          <TabsList className="h-11!" aria-label="Date range">
            {RANGES.map((r) => (
              <TabsTrigger key={r} value={r} className="min-h-9 min-w-16 px-3">
                {r.replace('d', ' days')}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <BookingsWeekly range={range} />
        <Occupancy range={range} />
        <ClicksBySource range={range} />
        <TierDistribution range={range} />
        <Revenue />
      </div>
    </div>
  )
}
