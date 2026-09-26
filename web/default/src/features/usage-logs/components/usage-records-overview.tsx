/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Activity, Clock3, Coins, Layers3, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatQuota } from '@/lib/format'
import { useIsAdmin } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getUsageSummary, getUserQuotaDates } from '@/features/dashboard/api'
import type {
  QuotaDataItem,
  UsageSummaryGroup,
} from '@/features/dashboard/types'
import { getDefaultTimeRange } from '../lib/utils'

const route = getRouteApi('/_authenticated/usage-logs/$section')
const CHART_COLORS = [
  '#0d9488',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#e05d5d',
  '#64748b',
  '#94a3b8',
]

function formatCompact(value: number) {
  return Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function buildTrend(items: QuotaDataItem[], granularity: 'day' | 'week') {
  const buckets = new Map<string, { date: string; tokens: number }>()
  for (const item of items) {
    if (!Number.isFinite(item.created_at)) continue
    const date = new Date(item.created_at * 1000)
    if (granularity === 'week') {
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
    }
    const key = date.toISOString().slice(0, 10)
    const bucket = buckets.get(key) ?? { date: key, tokens: 0 }
    bucket.tokens += item.token_used ?? 0
    buckets.set(key, bucket)
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function DistributionPanel({
  title,
  rows,
  totals,
  nameLabel,
}: {
  title: string
  rows: UsageSummaryGroup[]
  totals: UsageSummaryGroup
  nameLabel: string
}) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<'tokens' | 'quota'>('tokens')
  const visible = rows.slice(0, 6)
  const remaining: UsageSummaryGroup = {
    name: t('Other'),
    requests: Math.max(
      0,
      totals.requests - visible.reduce((sum, row) => sum + row.requests, 0)
    ),
    tokens: Math.max(
      0,
      totals.tokens - visible.reduce((sum, row) => sum + row.tokens, 0)
    ),
    quota: Math.max(
      0,
      totals.quota - visible.reduce((sum, row) => sum + row.quota, 0)
    ),
  }
  const displayRows = remaining.requests > 0 ? [...visible, remaining] : visible
  const chartData = displayRows.filter((row) => row[metric] > 0)

  return (
    <section className='bg-background min-w-0 rounded-lg border p-4'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-sm font-semibold'>{title}</h3>
        <div className='inline-flex rounded-md border p-0.5 text-xs'>
          {(['tokens', 'quota'] as const).map((value) => (
            <button
              key={value}
              type='button'
              aria-pressed={metric === value}
              onClick={() => setMetric(value)}
              className={`rounded px-2 py-1 ${metric === value ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
            >
              {t(value === 'tokens' ? 'Tokens' : 'Cost')}
            </button>
          ))}
        </div>
      </div>
      {displayRows.length === 0 ? (
        <p className='text-muted-foreground flex h-48 items-center justify-center text-sm'>
          {t('No data in selected range')}
        </p>
      ) : (
        <div className='mt-3 flex min-w-0 flex-col gap-3 md:flex-row md:items-center'>
          <div className='h-44 w-full shrink-0 md:w-44'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey={metric}
                  nameKey='name'
                  innerRadius={45}
                  outerRadius={78}
                  paddingAngle={1}
                  stroke='none'
                >
                  {chartData.map((row, index) => (
                    <Cell
                      key={row.name || index}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className='min-w-0 flex-1 overflow-x-auto'>
            <table className='w-full min-w-[350px] text-xs'>
              <thead className='text-muted-foreground border-b text-left'>
                <tr>
                  <th className='pb-2 font-medium'>{nameLabel}</th>
                  <th className='pb-2 text-right font-medium'>
                    {t('Requests')}
                  </th>
                  <th className='pb-2 text-right font-medium'>{t('Tokens')}</th>
                  <th className='pb-2 text-right font-medium'>{t('Cost')}</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, index) => (
                  <tr
                    key={row.name || index}
                    className='border-b last:border-b-0'
                  >
                    <td
                      className='max-w-36 truncate py-1.5 pr-2 font-medium'
                      title={row.name}
                    >
                      <span
                        className='mr-1.5 inline-block size-2 rounded-full'
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      {row.name || t('Unknown')}
                    </td>
                    <td className='py-1.5 text-right tabular-nums'>
                      {row.requests.toLocaleString()}
                    </td>
                    <td className='py-1.5 text-right tabular-nums'>
                      {formatCompact(row.tokens)}
                    </td>
                    <td className='py-1.5 text-right tabular-nums'>
                      {formatQuota(row.quota)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export function UsageRecordsOverview() {
  const { t } = useTranslation()
  const isAdmin = useIsAdmin()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [granularity, setGranularity] = useState<'day' | 'week'>('day')
  const range = useMemo(() => {
    const defaults = getDefaultTimeRange()
    return {
      start: Math.floor((search.startTime ?? defaults.start.getTime()) / 1000),
      end: Math.floor((search.endTime ?? defaults.end.getTime()) / 1000),
    }
  }, [search.startTime, search.endTime])
  const username = isAdmin ? search.username?.trim() : undefined

  const summaryQuery = useQuery({
    queryKey: [
      'usage-records-summary',
      isAdmin,
      range.start,
      range.end,
      username,
    ],
    queryFn: () =>
      getUsageSummary(
        { start_timestamp: range.start, end_timestamp: range.end, username },
        isAdmin
      ),
    staleTime: 60_000,
  })
  const trendQuery = useQuery({
    queryKey: [
      'usage-records-trend',
      isAdmin,
      range.start,
      range.end,
      username,
    ],
    queryFn: () =>
      getUserQuotaDates(
        { start_timestamp: range.start, end_timestamp: range.end, username },
        isAdmin
      ),
    staleTime: 60_000,
  })
  const summary = summaryQuery.data?.success
    ? summaryQuery.data.data
    : undefined
  const trend = useMemo(
    () =>
      buildTrend(
        trendQuery.data?.success ? trendQuery.data.data || [] : [],
        granularity
      ),
    [trendQuery.data, granularity]
  )

  const selectRange = (days: number) => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - days + 1)
    start.setHours(0, 0, 0, 0)
    void navigate({
      to: '/usage-logs/$section',
      params: { section: 'common' },
      search: {
        ...search,
        startTime: start.getTime(),
        endTime: now.getTime(),
        page: 1,
      },
    })
  }

  const cards = [
    {
      label: t('Total requests'),
      value: (summary?.totals.requests ?? 0).toLocaleString(),
      icon: Activity,
    },
    {
      label: t('Total tokens'),
      value: formatCompact(summary?.totals.tokens ?? 0),
      icon: Layers3,
    },
    {
      label: t('Total cost'),
      value: formatQuota(summary?.totals.quota ?? 0),
      icon: Coins,
    },
    {
      label: t('Average duration'),
      value: `${(summary?.totals.avg_seconds ?? 0).toFixed(1)}s`,
      icon: Clock3,
    },
  ]

  return (
    <div className='space-y-4'>
      <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-4'>
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className='bg-background min-w-0 rounded-lg border px-4 py-3'
          >
            <div className='text-muted-foreground flex items-center gap-2 text-xs'>
              <span className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md'>
                <Icon className='size-4' />
              </span>
              {label}
            </div>
            {summaryQuery.isLoading ? (
              <Skeleton className='mt-2 h-7 w-24' />
            ) : (
              <p
                className='mt-2 truncate font-mono text-xl font-semibold tabular-nums'
                title={value}
              >
                {summary ? value : '—'}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className='bg-background flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2'>
        <div className='flex flex-wrap items-center gap-2 text-xs'>
          <span className='font-medium'>{t('Time Range')}:</span>
          <span className='text-muted-foreground tabular-nums'>
            {new Date(range.start * 1000).toLocaleDateString()} -{' '}
            {new Date(range.end * 1000).toLocaleDateString()}
          </span>
          {[7, 15, 30].map((days) => (
            <Button
              key={days}
              type='button'
              size='sm'
              variant='outline'
              onClick={() => selectRange(days)}
            >
              {t('Last {{count}} days', { count: days })}
            </Button>
          ))}
          <Button
            type='button'
            size='icon'
            variant='ghost'
            aria-label={t('Refresh')}
            title={t('Refresh')}
            onClick={() => {
              void summaryQuery.refetch()
              void trendQuery.refetch()
            }}
          >
            <RefreshCw className='size-4' />
          </Button>
        </div>
        <div className='flex items-center gap-2 text-xs'>
          <span className='font-medium'>{t('Time Granularity')}:</span>
          <div className='inline-flex rounded-md border p-0.5'>
            {(['day', 'week'] as const).map((value) => (
              <button
                key={value}
                type='button'
                aria-pressed={granularity === value}
                onClick={() => setGranularity(value)}
                className={`rounded px-2 py-1 ${granularity === value ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
              >
                {t(value === 'day' ? 'Daily' : 'Weekly')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {summaryQuery.isError && (
        <p className='text-destructive text-sm'>
          {t('Unable to load usage summary')}
        </p>
      )}

      <div className='grid gap-3 xl:grid-cols-2'>
        <DistributionPanel
          title={t('Model distribution')}
          rows={summary?.models ?? []}
          totals={{
            name: '',
            requests: summary?.totals.requests ?? 0,
            tokens: summary?.totals.tokens ?? 0,
            quota: summary?.totals.quota ?? 0,
          }}
          nameLabel={t('Model')}
        />
        <DistributionPanel
          title={t('Group distribution')}
          rows={summary?.groups ?? []}
          totals={{
            name: '',
            requests: summary?.totals.requests ?? 0,
            tokens: summary?.totals.tokens ?? 0,
            quota: summary?.totals.quota ?? 0,
          }}
          nameLabel={t('Group')}
        />
        <DistributionPanel
          title={t('Endpoint distribution')}
          rows={summary?.endpoints ?? []}
          totals={{
            name: '',
            requests: summary?.totals.requests ?? 0,
            tokens: summary?.totals.tokens ?? 0,
            quota: summary?.totals.quota ?? 0,
          }}
          nameLabel={t('Endpoint')}
        />
        <section className='bg-background min-w-0 rounded-lg border p-4'>
          <h3 className='text-sm font-semibold'>{t('Token usage trend')}</h3>
          <div className='mt-4 h-48 w-full'>
            {trendQuery.isLoading ? (
              <Skeleton className='h-full w-full' />
            ) : trend.length === 0 ? (
              <p className='text-muted-foreground flex h-full items-center justify-center text-sm'>
                {trendQuery.isError
                  ? t('Unable to load usage summary')
                  : t('No data in selected range')}
              </p>
            ) : (
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                  data={trend}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey='date'
                    tick={{ fontSize: 11 }}
                    minTickGap={20}
                  />
                  <YAxis
                    tickFormatter={formatCompact}
                    tick={{ fontSize: 11 }}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) => Number(value).toLocaleString()}
                  />
                  <Area
                    type='monotone'
                    dataKey='tokens'
                    name={t('Tokens')}
                    stroke='#0d9488'
                    fill='#0d9488'
                    fillOpacity={0.16}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('Trend data may lag recent requests by a few minutes.')}
          </p>
        </section>
      </div>
    </div>
  )
}
