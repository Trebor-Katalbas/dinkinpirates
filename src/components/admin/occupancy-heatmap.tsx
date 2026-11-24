import type { OccupancyRow } from '@/types/metrics'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CELL = 28
const GAP = 3
const LEFT = 36
const TOP = 22

function hourLabel(h: number): string {
  const suffix = h < 12 ? 'a' : 'p'
  const n = h % 12 === 0 ? 12 : h % 12
  return `${n}${suffix}`
}

/**
 * Day-of-week × hour occupancy grid. Off-peak cells (≤ 25% of the busiest hour) are
 * highlighted in treasure gold — good candidates for promotions.
 */
export function OccupancyHeatmap({ rows }: { rows: OccupancyRow[] }) {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(`${r.day}-${r.hour}`, r.bookings)

  const hoursWithData = rows.map((r) => r.hour)
  const minHour = Math.min(6, ...hoursWithData)
  const maxHour = Math.max(22, ...hoursWithData)
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i)
  const max = Math.max(1, ...rows.map((r) => r.bookings))
  const offPeakLimit = max * 0.25

  const width = LEFT + hours.length * (CELL + GAP)
  const height = TOP + DAYS.length * (CELL + GAP)

  let peak: OccupancyRow | null = null
  for (const r of rows) if (!peak || r.bookings > peak.bookings) peak = r
  const summary = peak
    ? `Busiest slot: ${DAYS[peak.day] ?? ''} ${hourLabel(peak.hour)} with ${peak.bookings} bookings. Gold cells are off-peak hours.`
    : 'No bookings in this range.'

  return (
    <figure className="space-y-3">
      {/* Scrolls inside its card on narrow screens so labels stay legible. */}
      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[32rem]"
          role="img"
          aria-label={`Occupancy heatmap by day and hour. ${summary}`}
        >
          {hours.map((h, i) =>
            h % 2 === 0 ? (
              <text
                key={h}
                x={LEFT + i * (CELL + GAP) + CELL / 2}
                y={TOP - 8}
                textAnchor="middle"
                className="fill-ink/60 text-[10px]"
              >
                {hourLabel(h)}
              </text>
            ) : null,
          )}
          {DAYS.map((d, day) => (
            <g key={d}>
              <text
                x={LEFT - 6}
                y={TOP + day * (CELL + GAP) + CELL / 2 + 4}
                textAnchor="end"
                className="fill-ink/70 text-[11px]"
              >
                {d}
              </text>
              {hours.map((h, i) => {
                const n = counts.get(`${day}-${h}`) ?? 0
                const offPeak = n <= offPeakLimit
                const intensity = n / max
                return (
                  <rect
                    key={h}
                    x={LEFT + i * (CELL + GAP)}
                    y={TOP + day * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={5}
                    fill={offPeak ? 'var(--color-treasure-gold)' : 'var(--chart-1)'}
                    fillOpacity={offPeak ? 0.18 + intensity * 0.6 : 0.25 + intensity * 0.75}
                    stroke={offPeak ? 'var(--color-treasure-gold)' : 'none'}
                    strokeWidth={offPeak ? 1 : 0}
                  >
                    <title>
                      {`${d} ${hourLabel(h)}: ${n} booking${n === 1 ? '' : 's'}${offPeak ? ' (off-peak)' : ''}`}
                    </title>
                  </rect>
                )
              })}
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/70">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm border border-treasure-gold bg-treasure-gold/40"
            aria-hidden
          />
          Off-peak (≤ 25% of busiest hour)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-chart-1" aria-hidden />
          Busy
        </span>
        <span>{summary}</span>
      </figcaption>
    </figure>
  )
}
