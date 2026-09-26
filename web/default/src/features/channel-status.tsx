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
import { useQuery } from '@tanstack/react-query'
import { Activity, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PublicLayout, SectionPageLayout } from '@/components/layout'
import { getUptimeStatus } from '@/features/dashboard/api'
import type { UptimeMonitor } from '@/features/dashboard/types'

function MonitorCard({ monitor }: { monitor: UptimeMonitor }) {
  const { t } = useTranslation()
  const points = monitor.history || []
  return (
    <article className='bg-background rounded-lg border p-5'>
      <div className='flex min-h-16 items-start justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800'>
        <div className='flex min-w-0 items-center gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'>
            <Activity className='size-5' />
          </div>
          <div className='min-w-0'>
            <h3 className='truncate text-sm font-bold'>{monitor.name}</h3>
            <p className='text-muted-foreground truncate text-xs'>
              {monitor.group}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${monitor.status === 1 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : monitor.status === 0 ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}
        >
          {monitor.status === 1
            ? t('Operational')
            : monitor.status === 0
              ? t('Unavailable')
              : t('Unknown')}
        </span>
      </div>
      <div className='grid grid-cols-3 gap-2 py-6'>
        <div>
          <p className='text-muted-foreground text-[10px] font-bold uppercase'>
            {t('Cache rate')}
          </p>
          <p className='mt-2 font-mono text-lg font-bold'>—</p>
        </div>
        <div>
          <p className='text-muted-foreground text-[10px] font-bold uppercase'>
            {t('Availability')}
          </p>
          <p
            className={`mt-2 font-mono text-lg font-bold ${monitor.status === 1 ? 'text-emerald-700 dark:text-emerald-400' : monitor.status === 0 ? 'text-red-600' : ''}`}
          >
            {monitor.uptimeAvailable
              ? `${(monitor.uptime * 100).toFixed(1)}%`
              : '—'}
          </p>
        </div>
        <div>
          <p className='text-muted-foreground text-[10px] font-bold uppercase'>
            {t('First token')}
          </p>
          <p className='mt-2 font-mono text-lg font-bold'>—</p>
        </div>
      </div>
      <div className='border-t border-slate-100 pt-3 dark:border-slate-800'>
        <div className='text-muted-foreground mb-2 flex justify-between text-[10px] font-semibold uppercase'>
          <span>
            {t('History')} ({points.length})
          </span>
          <span>24h</span>
        </div>
        <div
          className='flex h-7 items-end gap-1'
          aria-label={t('Recent availability history')}
        >
          {Array.from({ length: 18 }, (_, index) => {
            const status = points[index - (18 - points.length)]
            return (
              <span
                key={index}
                className={`min-w-0 flex-1 rounded-sm ${status === 1 ? 'h-6 bg-emerald-600' : status === 0 ? 'h-6 bg-red-500' : status === 2 ? 'h-6 bg-amber-400' : 'h-1 bg-slate-300 dark:bg-slate-700'}`}
              />
            )
          })}
        </div>
        <div className='text-muted-foreground mt-1 flex justify-between text-[10px] uppercase'>
          <span>{t('Past')}</span>
          <span>{t('Now')}</span>
        </div>
      </div>
    </article>
  )
}

function ChannelStatusContent({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation()
  const { data, dataUpdatedAt, isLoading, isFetching, refetch, isError } =
    useQuery({
      queryKey: ['public-channel-status'],
      queryFn: async () => (await getUptimeStatus()).data,
      refetchInterval: 60_000,
    })
  const groups = (data || []).filter((group) => group.monitors?.length)
  const reported = groups
    .flatMap((group) => group.monitors)
    .filter((monitor) => monitor.uptimeAvailable)
  const averageAvailability = reported.length
    ? `${((reported.reduce((sum, monitor) => sum + monitor.uptime, 0) / reported.length) * 100).toFixed(1)}%`
    : '—'
  const monitors = groups.flatMap((group) => group.monitors)
  const healthyCount = monitors.filter((monitor) => monitor.status === 1).length
  const degradedCount = monitors.filter(
    (monitor) => monitor.status === 0
  ).length
  return (
    <div
      className={
        embedded
          ? 'bg-background pb-8'
          : 'bg-background min-h-screen px-4 pt-24 pb-16 sm:px-8'
      }
    >
      <div className='mx-auto max-w-[1700px]'>
        <div className='bg-background overflow-hidden rounded-lg border'>
          <div className='flex flex-wrap items-center justify-between gap-3 p-6'>
            <div className='flex items-center gap-3'>
              <div className='flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'>
                <Activity className='size-5' />
              </div>
              <div>
                <h1 className={embedded ? 'sr-only' : 'text-lg font-bold'}>
                  {t('Channel status')}
                </h1>
                <p className='text-muted-foreground mt-1 text-xs'>
                  <span className='mr-2 inline-block size-2 rounded-full bg-emerald-500' />
                  {dataUpdatedAt
                    ? `${t('Updated at')} ${new Date(dataUpdatedAt).toLocaleString()}`
                    : t('Waiting for status data')}
                </p>
              </div>
            </div>
            <Button
              size='icon'
              variant='outline'
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label={t('Refresh')}
            >
              <RotateCw
                className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
          <div className='text-muted-foreground flex flex-wrap items-center gap-4 border-t bg-slate-50/60 px-6 py-3 text-xs dark:bg-slate-900/50'>
            <span className='border-b-2 border-sky-600 pb-1 font-bold text-sky-700 dark:text-sky-300'>
              24h
            </span>
            <span>{t('Passive availability monitoring')}</span>
            <span className='ml-auto font-semibold'>
              {t('Operational')} {healthyCount}/{monitors.length} ·{' '}
              {t('Unavailable')} {degradedCount} · {t('Availability')}{' '}
              {averageAvailability}
            </span>
          </div>
        </div>
        {isLoading && (
          <p className='text-muted-foreground mt-10 text-center'>
            {t('Loading...')}
          </p>
        )}
        {isError && (
          <p className='mt-10 text-center text-red-600'>
            {t('Unable to load channel status')}
          </p>
        )}
        {!isLoading && !isError && groups.length === 0 && (
          <p className='text-muted-foreground mt-10 rounded-xl border bg-white p-8 text-center'>
            {t('No uptime monitoring configured')}
          </p>
        )}
        <div className='mt-5 space-y-10'>
          {groups.map((group) => (
            <section key={group.categoryName}>
              <div className='mb-2 flex items-center justify-between text-xs font-bold text-slate-600 uppercase dark:text-slate-300'>
                <h2>{group.categoryName}</h2>
                <span>{group.monitors.length}</span>
              </div>
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                {group.monitors.map((monitor) => (
                  <MonitorCard
                    key={`${group.categoryName}-${monitor.name}`}
                    monitor={monitor}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className='text-muted-foreground mt-8 text-xs'>
          {t(
            'Cache rate and first-token latency are not supplied by this monitor. A dash means unavailable, not zero.'
          )}
        </p>
      </div>
    </div>
  )
}

export function ChannelStatus() {
  return (
    <PublicLayout showMainContainer={false}>
      <ChannelStatusContent />
    </PublicLayout>
  )
}

export function ChannelStatusWorkspace() {
  const { t } = useTranslation()
  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Channel status')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <ChannelStatusContent embedded />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
