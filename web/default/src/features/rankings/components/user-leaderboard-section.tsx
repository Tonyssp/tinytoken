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

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from '@tanstack/react-query'
import { Activity, Coins, Lock, Sparkles, Trophy, Users } from 'lucide-react'
import { formatCompactNumber, formatQuota } from '@/lib/format'
import { getUserLeaderboard } from '../api'
import type { RankingPeriod, UserLeaderboardEntry } from '../types'

const PODIUM_ORDER = [1, 0, 2]

const PODIUM_STYLES = {
  1: {
    ring: 'border-amber-300 shadow-amber-200/60 dark:border-amber-400/50',
    badge: 'bg-amber-400 text-amber-950',
    bar: 'from-amber-300 to-yellow-400',
    pedestal: 'from-yellow-300 to-amber-400',
  },
  2: {
    ring: 'border-slate-300 shadow-slate-200/70 dark:border-slate-500/50',
    badge: 'bg-slate-400 text-white',
    bar: 'from-slate-300 to-slate-400',
    pedestal: 'from-slate-200 to-slate-300',
  },
  3: {
    ring: 'border-orange-300 shadow-orange-200/60 dark:border-orange-400/50',
    badge: 'bg-orange-400 text-white',
    bar: 'from-orange-300 to-orange-400',
    pedestal: 'from-orange-300 to-amber-300',
  },
} as const

function totalTokens(user: UserLeaderboardEntry) {
  return (
    user.prompt_tokens +
    user.completion_tokens +
    (user.cache_write_tokens || 0) +
    (user.cache_read_tokens || 0)
  )
}

function UserMetricBlocks(props: { user: UserLeaderboardEntry }) {
  return (
    <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
      <TintedMetric
        tone='indigo'
        label='Input'
        value={formatCompactNumber(props.user.prompt_tokens)}
      />
      <TintedMetric
        tone='pink'
        label='Output'
        value={formatCompactNumber(props.user.completion_tokens)}
      />
      <TintedMetric
        tone='amber'
        label='Cache write'
        value={formatCompactNumber(props.user.cache_write_tokens || 0)}
      />
      <TintedMetric
        tone='emerald'
        label='Cache read'
        value={formatCompactNumber(props.user.cache_read_tokens || 0)}
      />
    </div>
  )
}

export function UserLeaderboardSection(props: { period: RankingPeriod }) {
  const leaderboardQuery = useQuery({
    queryKey: ['public-user-leaderboard', props.period],
    queryFn: () => getUserLeaderboard(props.period),
    staleTime: 60 * 1000,
  })
  const snapshot = leaderboardQuery.data?.data
  const users = snapshot?.users || []
  const topUsers = users.slice(0, 3)
  const remainingUsers = users.slice(3)
  const leaderQuota = Math.max(topUsers[0]?.used_quota || 1, 1)
  const totals = users.reduce(
    (result, user) => ({
      requests: result.requests + user.request_count,
      tokens: result.tokens + totalTokens(user),
      quota: result.quota + user.used_quota,
    }),
    { requests: 0, tokens: 0, quota: 0 }
  )

  if (leaderboardQuery.isLoading) {
    return (
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className='bg-muted/50 h-72 animate-pulse rounded-xl'
          />
        ))}
      </div>
    )
  }

  if (!snapshot?.enabled || users.length === 0) {
    return (
      <div className='flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 text-center dark:bg-slate-950'>
        <Trophy className='text-muted-foreground size-8' />
        <h2 className='mt-4 font-semibold'>
          User Leaderboard ยังไม่เปิดใช้งาน
        </h2>
        <p className='text-muted-foreground mt-2 max-w-md text-sm'>
          เมื่อแอดมินเปิดใช้งาน
          อันดับผู้ใช้จะแสดงที่นี่โดยไม่เปิดเผยข้อมูลส่วนตัว
        </p>
      </div>
    )
  }

  return (
    <section className='relative overflow-hidden rounded-[24px] border bg-[#f7f9ff] px-4 py-8 shadow-sm sm:px-6 lg:px-8 dark:bg-slate-950'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 opacity-60'
        style={{
          backgroundImage:
            'linear-gradient(rgba(126, 142, 178, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(126, 142, 178, 0.14) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className='relative mx-auto max-w-6xl space-y-8'>
        <div className='text-center'>
          <div className='mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-black tracking-[0.2em] text-amber-700 uppercase shadow-sm dark:bg-slate-900'>
            <Trophy className='size-4' />
            Hall of Fame
          </div>
          <h2 className='mt-4 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl'>
            Leaderboard
          </h2>
          <p className='text-muted-foreground mt-2 text-base font-medium'>
            20 อันดับผู้ใช้งานสูงสุด แข่งขันแบบไม่เปิดเผยตัวตน
          </p>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard
            icon={Users}
            label='ผู้เข้าร่วม'
            value={`${users.length}`}
            color='text-violet-600'
          />
          <SummaryCard
            icon={Coins}
            label='การใช้งานรวม'
            value={formatQuota(totals.quota)}
            color='text-pink-600'
          />
          <SummaryCard
            icon={Sparkles}
            label='Tokens รวม'
            value={formatCompactNumber(totals.tokens)}
            color='text-orange-500'
          />
          <SummaryCard
            icon={Activity}
            label='Requests รวม'
            value={formatCompactNumber(totals.requests)}
            color='text-emerald-600'
          />
        </div>

        <div className='grid items-end gap-5 lg:grid-cols-3 lg:pt-6'>
          {PODIUM_ORDER.map((sourceIndex) => {
            const user = topUsers[sourceIndex]
            if (!user) return null
            const style =
              PODIUM_STYLES[user.rank as 1 | 2 | 3] || PODIUM_STYLES[3]
            const height =
              user.rank === 1 ? 'h-36' : user.rank === 2 ? 'h-28' : 'h-24'
            return (
              <article
                key={`${user.rank}-${user.display_name}`}
                className={`relative rounded-2xl border bg-white p-5 shadow-xl ${style.ring} ${
                  user.rank === 1 ? 'lg:-translate-y-7' : ''
                } dark:bg-slate-900`}
              >
                <span
                  className={`absolute -top-8 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white text-2xl font-black shadow-lg ${style.badge}`}
                >
                  {user.rank}
                </span>
                <div className='pt-8 text-center'>
                  <h3 className='truncate text-xl font-black'>
                    {user.display_name}
                  </h3>
                  <p className='mt-2 text-2xl font-black'>
                    {formatQuota(user.used_quota)}
                  </p>
                  <div className='mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800'>
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${style.bar}`}
                      style={{
                        width: `${Math.max(
                          12,
                          (user.used_quota / leaderQuota) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className='mt-4 grid grid-cols-2 gap-2'>
                    <PlainMetric
                      label='Requests'
                      value={formatCompactNumber(user.request_count)}
                    />
                    <PlainMetric
                      label='Tokens'
                      value={formatCompactNumber(totalTokens(user))}
                    />
                  </div>
                </div>
                <div
                  className={`mx-auto mt-5 w-4/5 rounded-t-xl bg-gradient-to-b ${style.pedestal} ${height}`}
                >
                  <div className='pt-4 text-center text-lg font-black text-white'>
                    {user.rank}
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {remainingUsers.length > 0 && (
          <div className='space-y-3'>
            <div className='flex items-center gap-3'>
              <div className='h-px flex-1 bg-slate-200 dark:bg-slate-800' />
              <span className='text-muted-foreground text-xs font-bold'>
                อันดับ 4 เป็นต้นไป
              </span>
              <div className='h-px flex-1 bg-slate-200 dark:bg-slate-800' />
            </div>
            {remainingUsers.map((user) => (
              <article
                key={`${user.rank}-${user.display_name}`}
                className='rounded-2xl border bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900'
              >
                <div className='grid gap-4 lg:grid-cols-[64px_minmax(0,1fr)_auto] lg:items-center'>
                  <span className='flex size-14 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200'>
                    <span className='text-[10px] text-slate-400 uppercase'>
                      Rank
                    </span>
                    <span className='ml-1'>{user.rank}</span>
                  </span>
                  <div className='min-w-0'>
                    <h3 className='truncate text-lg font-black'>
                      {user.display_name}
                    </h3>
                    <div className='mt-2 h-1.5 max-w-xs rounded-full bg-slate-100 dark:bg-slate-800'>
                      <div
                        className='h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400'
                        style={{
                          width: `${Math.max(
                            8,
                            (user.used_quota / leaderQuota) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className='text-muted-foreground mt-1 text-xs'>
                      {formatCompactNumber(user.request_count)} req
                      {user.top_model ? ` · ${user.top_model}` : ''}
                    </p>
                  </div>
                  <div className='text-left lg:text-right'>
                    <p className='text-xl font-black'>
                      {formatQuota(user.used_quota)}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {formatCompactNumber(totalTokens(user))} TOK
                    </p>
                  </div>
                </div>
                <div className='mt-4'>
                  <UserMetricBlocks user={user} />
                </div>
              </article>
            ))}
          </div>
        )}

        <div className='text-muted-foreground flex items-center justify-center gap-2 text-xs'>
          <Lock className='size-3.5' />
          ชื่อผู้ใช้ถูกซ่อนบางส่วนเพื่อความเป็นส่วนตัว
        </div>
      </div>
    </section>
  )
}

function SummaryCard(props: {
  icon: typeof Users
  label: string
  value: string
  color: string
}) {
  const Icon = props.icon
  return (
    <div className='rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900'>
      <span className='flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800'>
        <Icon className={`size-5 ${props.color}`} />
      </span>
      <p className='text-muted-foreground mt-3 text-xs font-bold'>
        {props.label}
      </p>
      <p className='mt-1 text-2xl font-black'>{props.value}</p>
    </div>
  )
}

function PlainMetric(props: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800'>
      <p className='text-[10px] font-bold text-slate-400 uppercase'>
        {props.label}
      </p>
      <p className='truncate text-sm font-black'>{props.value}</p>
    </div>
  )
}

function TintedMetric(props: {
  tone: 'indigo' | 'pink' | 'amber' | 'emerald'
  label: string
  value: string
}) {
  const toneClass = {
    indigo:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    pink: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  }[props.tone]

  return (
    <div className={`rounded-xl px-3 py-2 ${toneClass}`}>
      <p className='text-[10px] font-bold uppercase opacity-75'>
        {props.label}
      </p>
      <p className='truncate text-base font-black'>{props.value}</p>
    </div>
  )
}
