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
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { formatCompactNumber, formatQuota } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SectionPageLayout } from '@/components/layout'
import { updateSystemOption } from '@/features/system-settings/api'
import { useSystemOptions } from '@/features/system-settings/hooks/use-system-options'

type LeaderboardPeriod = 'today' | 'week' | 'month' | 'year' | 'all'

type LeaderboardEntry = {
  type: 'real' | 'fake'
  enabled: boolean
  user_id?: number
  display_name: string
  request_count: number
  used_quota: number
  prompt_tokens: number
  completion_tokens: number
  cache_write_tokens: number
  cache_read_tokens: number
  top_model: string
}

type LeaderboardCandidate = {
  user_id: number
  username: string
  display_name: string
  request_count: number
  used_quota: number
  prompt_tokens: number
  completion_tokens: number
  cache_write_tokens?: number
  cache_read_tokens?: number
  top_model: string
}

type CandidatesResponse = {
  success: boolean
  message?: string
  data?: LeaderboardCandidate[]
}

const PERIOD_OPTIONS = [
  ['today', 'วันนี้'],
  ['week', '7 วัน'],
  ['month', '30 วัน'],
  ['year', 'ปี'],
  ['all', 'ทั้งหมด'],
] as const

function toNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function normalizeEntry(entry: Record<string, unknown>): LeaderboardEntry {
  const userID = Number(entry.user_id)
  const type =
    entry.type === 'fake' || (!Number.isInteger(userID) && !entry.type)
      ? 'fake'
      : 'real'
  return {
    type,
    enabled: entry.enabled !== false,
    user_id: Number.isInteger(userID) && userID > 0 ? userID : undefined,
    display_name: String(entry.display_name || ''),
    request_count: toNumber(entry.request_count),
    used_quota: toNumber(entry.used_quota),
    prompt_tokens: toNumber(entry.prompt_tokens),
    completion_tokens: toNumber(entry.completion_tokens),
    cache_write_tokens: toNumber(entry.cache_write_tokens),
    cache_read_tokens: toNumber(entry.cache_read_tokens),
    top_model: String(entry.top_model || ''),
  }
}

function parseEntries(value: string): LeaderboardEntry[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === 'object'
      )
      .map(normalizeEntry)
      .filter((entry) => entry.type === 'fake' || Boolean(entry.user_id))
      .slice(0, 20)
  } catch {
    return []
  }
}

function serializeEntries(entries: LeaderboardEntry[]) {
  return JSON.stringify(
    entries.map((entry) =>
      entry.type === 'real'
        ? {
            type: 'real',
            enabled: entry.enabled,
            user_id: entry.user_id,
            display_name: entry.display_name.trim(),
          }
        : {
            type: 'fake',
            enabled: entry.enabled,
            display_name: entry.display_name.trim(),
            request_count: entry.request_count,
            used_quota: entry.used_quota,
            prompt_tokens: entry.prompt_tokens,
            completion_tokens: entry.completion_tokens,
            cache_write_tokens: entry.cache_write_tokens,
            cache_read_tokens: entry.cache_read_tokens,
            top_model: entry.top_model.trim(),
          }
    )
  )
}

async function getCandidates(period: LeaderboardPeriod) {
  const response = await api.get<CandidatesResponse>(
    '/api/user/leaderboard/candidates',
    { params: { period } }
  )
  if (!response.data.success) {
    throw new Error(response.data.message || 'Unable to load users')
  }
  return response.data.data || []
}

function readOption(
  options: Array<{ key: string; value: string }> | undefined,
  key: string,
  fallback: string
) {
  return options?.find((option) => option.key === key)?.value ?? fallback
}

export function LeaderboardAdmin() {
  const { data: optionsData, isLoading } = useSystemOptions()

  if (isLoading) {
    return (
      <SectionPageLayout>
        <SectionPageLayout.Title>Leaderboard</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div className='bg-muted/50 h-96 animate-pulse rounded-xl' />
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )
  }

  return (
    <LeaderboardAdminEditor
      initialEnabled={
        readOption(optionsData?.data, 'UserLeaderboardEnabled', 'false') ===
        'true'
      }
      initialSerialized={readOption(
        optionsData?.data,
        'UserLeaderboardEntries',
        '[]'
      )}
      initialYearPeriodEnabled={
        readOption(optionsData?.data, 'RankingsYearPeriodEnabled', 'true') !==
        'false'
      }
      initialAllPeriodEnabled={
        readOption(optionsData?.data, 'RankingsAllPeriodEnabled', 'true') !==
        'false'
      }
    />
  )
}

function LeaderboardAdminEditor(props: {
  initialEnabled: boolean
  initialSerialized: string
  initialYearPeriodEnabled: boolean
  initialAllPeriodEnabled: boolean
}) {
  const queryClient = useQueryClient()
  const initialEntries = useMemo(
    () => parseEntries(props.initialSerialized),
    [props.initialSerialized]
  )
  const [enabled, setEnabled] = useState(props.initialEnabled)
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries)
  const [period, setPeriod] = useState<LeaderboardPeriod>('month')
  const [search, setSearch] = useState('')
  const [yearPeriodEnabled, setYearPeriodEnabled] = useState(
    props.initialYearPeriodEnabled
  )
  const [allPeriodEnabled, setAllPeriodEnabled] = useState(
    props.initialAllPeriodEnabled
  )

  const candidatesQuery = useQuery({
    queryKey: ['user-leaderboard-candidates', period],
    queryFn: () => getCandidates(period),
    staleTime: 30 * 1000,
  })

  const candidates = useMemo(
    () => candidatesQuery.data ?? [],
    [candidatesQuery.data]
  )
  const candidateByID = useMemo(
    () =>
      new Map(candidates.map((candidate) => [candidate.user_id, candidate])),
    [candidates]
  )
  const selectedIDs = useMemo(
    () =>
      new Set(
        entries
          .filter((entry) => entry.type === 'real' && entry.user_id)
          .map((entry) => entry.user_id)
      ),
    [entries]
  )
  const visibleCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return candidates.filter((candidate) => {
      if (selectedIDs.has(candidate.user_id)) return false
      if (!normalizedSearch) return true
      return [candidate.username, candidate.display_name, candidate.top_model]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [candidates, search, selectedIDs])

  const serializedEntries = serializeEntries(entries)
  const isDirty =
    enabled !== props.initialEnabled ||
    yearPeriodEnabled !== props.initialYearPeriodEnabled ||
    allPeriodEnabled !== props.initialAllPeriodEnabled ||
    serializedEntries !== props.initialSerialized
  const enabledEntries = entries.filter((entry) => entry.enabled)
  const fakeCount = entries.filter((entry) => entry.type === 'fake').length
  const realCount = entries.length - fakeCount

  const saveMutation = useMutation({
    mutationFn: async () => {
      const responses = await Promise.all([
        updateSystemOption({
          key: 'UserLeaderboardEnabled',
          value: enabled,
        }),
        updateSystemOption({
          key: 'UserLeaderboardEntries',
          value: serializedEntries,
        }),
        updateSystemOption({
          key: 'RankingsYearPeriodEnabled',
          value: yearPeriodEnabled,
        }),
        updateSystemOption({
          key: 'RankingsAllPeriodEnabled',
          value: allPeriodEnabled,
        }),
      ])
      const failed = responses.find((response) => !response.success)
      if (failed)
        throw new Error(failed.message || 'Unable to save leaderboard')
    },
    onSuccess: () => {
      toast.success('บันทึก Leaderboard แล้ว')
      queryClient.invalidateQueries({ queryKey: ['system-options'] })
      queryClient.invalidateQueries({ queryKey: ['status'] })
      queryClient.invalidateQueries({ queryKey: ['public-user-leaderboard'] })
      try {
        window.localStorage.removeItem('status')
      } catch {
        /* empty */
      }
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const moveEntry = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= entries.length) return
    const next = [...entries]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    setEntries(next)
  }

  const updateEntry = (index: number, patch: Partial<LeaderboardEntry>) => {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry
      )
    )
  }

  const addFakeEntry = () => {
    setEntries((current) => [
      ...current,
      {
        type: 'fake',
        enabled: true,
        display_name: 'TinyAPI Pro',
        request_count: 52000,
        used_quota: 240000,
        prompt_tokens: 54000000,
        completion_tokens: 12000000,
        cache_write_tokens: 208000000,
        cache_read_tokens: 1600000000,
        top_model: 'gpt-5.6-luna',
      },
    ])
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>Leaderboard</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <a
          href='/rankings?view=users&period=month'
          target='_blank'
          className='border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium shadow-xs transition-colors'
        >
          <Eye className='size-4' />
          Preview
        </a>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'กำลังบันทึก...' : 'Save Leaderboard'}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='space-y-5'>
          <section className='rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-950'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div className='flex min-w-0 items-start gap-4'>
                <span className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'>
                  <Trophy className='size-6' />
                </span>
                <div className='min-w-0'>
                  <h2 className='text-xl font-black'>
                    จัดอันดับผู้ใช้สำหรับหน้าเว็บ
                  </h2>
                  <p className='text-muted-foreground mt-1 max-w-3xl text-sm'>
                    เลือกผู้ใช้จริงจากสถิติการใช้งาน
                    หรือเพิ่มรายชื่อจำลองสำหรับการตลาด
                    แล้วเปิดปิดแต่ละอันดับได้จากหน้านี้
                  </p>
                </div>
              </div>
              <div className='grid shrink-0 gap-2 rounded-xl border px-4 py-3'>
                <ToggleRow
                  label='แสดงหน้าเว็บ'
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
                <ToggleRow
                  label='โชว์ปุ่มปี'
                  checked={yearPeriodEnabled}
                  onCheckedChange={setYearPeriodEnabled}
                />
                <ToggleRow
                  label='โชว์ปุ่มตลอดเวลา'
                  checked={allPeriodEnabled}
                  onCheckedChange={setAllPeriodEnabled}
                />
              </div>
            </div>

            <div className='mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <AdminStat
                label='Visible entries'
                value={enabledEntries.length}
              />
              <AdminStat label='Real users' value={realCount} />
              <AdminStat label='Fake users' value={fakeCount} />
              <AdminStat label='Max slots' value={`${entries.length}/20`} />
            </div>
          </section>

          <div className='grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]'>
            <section className='min-w-0 rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-950'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h3 className='font-bold'>Real user usage</h3>
                  <p className='text-muted-foreground text-xs'>
                    เลือกจากข้อมูลจริงตามช่วงเวลาที่ต้องการ
                  </p>
                </div>
                <Users className='text-muted-foreground size-5' />
              </div>
              <div className='mt-4 flex flex-wrap gap-2'>
                {PERIOD_OPTIONS.map(([value, label]) => (
                  <button
                    key={value}
                    type='button'
                    onClick={() => setPeriod(value)}
                    className={`h-9 rounded-lg px-3 text-xs font-bold transition ${
                      period === value
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className='relative mt-4'>
                <Search className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='ค้นหาผู้ใช้หรือโมเดล'
                  className='pl-9'
                />
              </div>
              <div className='mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1'>
                {candidatesQuery.isLoading ? (
                  <div className='text-muted-foreground py-16 text-center text-sm'>
                    กำลังโหลดสถิติผู้ใช้...
                  </div>
                ) : visibleCandidates.length === 0 ? (
                  <div className='text-muted-foreground py-16 text-center text-sm'>
                    ไม่พบผู้ใช้ที่เพิ่มได้
                  </div>
                ) : (
                  visibleCandidates.map((candidate) => (
                    <div
                      key={candidate.user_id}
                      className='rounded-xl border p-3'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-bold'>
                            {candidate.display_name || candidate.username}
                            <span className='text-muted-foreground ml-2 font-normal'>
                              #{candidate.user_id}
                            </span>
                          </p>
                          <p className='text-muted-foreground mt-1 truncate text-xs'>
                            {formatCompactNumber(candidate.request_count)} req ·{' '}
                            {formatQuota(candidate.used_quota)}
                            {candidate.top_model
                              ? ` · ${candidate.top_model}`
                              : ''}
                          </p>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='shrink-0'
                          onClick={() =>
                            setEntries((current) => [
                              ...current,
                              {
                                type: 'real',
                                enabled: true,
                                user_id: candidate.user_id,
                                display_name: '',
                                request_count: 0,
                                used_quota: 0,
                                prompt_tokens: 0,
                                completion_tokens: 0,
                                cache_write_tokens: 0,
                                cache_read_tokens: 0,
                                top_model: '',
                              },
                            ])
                          }
                          disabled={entries.length >= 20}
                        >
                          <Plus className='size-4' />
                          Add
                        </Button>
                      </div>
                      <div className='mt-3 grid grid-cols-2 gap-2 text-xs'>
                        <SmallMetric
                          label='Input'
                          value={formatCompactNumber(candidate.prompt_tokens)}
                        />
                        <SmallMetric
                          label='Output'
                          value={formatCompactNumber(
                            candidate.completion_tokens
                          )}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className='min-w-0 rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-950'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <h3 className='font-bold'>Public leaderboard builder</h3>
                  <p className='text-muted-foreground text-xs'>
                    ลำดับนี้คือสิ่งที่ลูกค้าจะเห็นจริงในหน้าอันดับ
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={addFakeEntry}
                  disabled={entries.length >= 20}
                >
                  <Sparkles className='size-4' />
                  Add fake user
                </Button>
              </div>
              <div className='mt-4 space-y-3'>
                {entries.length === 0 ? (
                  <div className='text-muted-foreground flex min-h-64 items-center justify-center rounded-xl border border-dashed text-sm'>
                    เพิ่มผู้ใช้จริงหรือ fake user เพื่อเริ่มสร้าง leaderboard
                  </div>
                ) : (
                  entries.map((entry, index) => {
                    const candidate =
                      entry.type === 'real' && entry.user_id
                        ? candidateByID.get(entry.user_id)
                        : undefined
                    return (
                      <div
                        key={`${entry.type}-${entry.user_id ?? index}`}
                        className='rounded-xl border p-3'
                      >
                        <div className='grid gap-3 lg:grid-cols-[48px_minmax(0,1fr)_auto] lg:items-start'>
                          <span className='bg-muted flex size-11 items-center justify-center rounded-xl text-sm font-black'>
                            {index + 1}
                          </span>
                          <div className='min-w-0 space-y-3'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  entry.type === 'real'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                                    : 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300'
                                }`}
                              >
                                {entry.type === 'real' ? 'Real user' : 'Fake'}
                              </span>
                              <span className='text-muted-foreground truncate text-xs'>
                                {entry.type === 'real'
                                  ? candidate?.username ||
                                    `User #${entry.user_id}`
                                  : 'Manual marketing entry'}
                              </span>
                            </div>
                            <Input
                              value={entry.display_name}
                              maxLength={40}
                              placeholder={
                                entry.type === 'real'
                                  ? 'ชื่อสาธารณะ (เว้นว่างเพื่อปิดบังอัตโนมัติ)'
                                  : 'ชื่อที่แสดงบน leaderboard'
                              }
                              onChange={(event) =>
                                updateEntry(index, {
                                  display_name: event.target.value,
                                })
                              }
                            />
                            {entry.type === 'fake' ? (
                              <div className='grid gap-2 md:grid-cols-2'>
                                <NumberInput
                                  label='Requests'
                                  value={entry.request_count}
                                  onChange={(value) =>
                                    updateEntry(index, { request_count: value })
                                  }
                                />
                                <NumberInput
                                  label='Used quota'
                                  value={entry.used_quota}
                                  onChange={(value) =>
                                    updateEntry(index, { used_quota: value })
                                  }
                                />
                                <NumberInput
                                  label='Input tokens'
                                  value={entry.prompt_tokens}
                                  onChange={(value) =>
                                    updateEntry(index, { prompt_tokens: value })
                                  }
                                />
                                <NumberInput
                                  label='Output tokens'
                                  value={entry.completion_tokens}
                                  onChange={(value) =>
                                    updateEntry(index, {
                                      completion_tokens: value,
                                    })
                                  }
                                />
                                <NumberInput
                                  label='Cache write'
                                  value={entry.cache_write_tokens}
                                  onChange={(value) =>
                                    updateEntry(index, {
                                      cache_write_tokens: value,
                                    })
                                  }
                                />
                                <NumberInput
                                  label='Cache read'
                                  value={entry.cache_read_tokens}
                                  onChange={(value) =>
                                    updateEntry(index, {
                                      cache_read_tokens: value,
                                    })
                                  }
                                />
                                <div className='md:col-span-2'>
                                  <label className='text-muted-foreground text-xs font-semibold'>
                                    Top model
                                  </label>
                                  <Input
                                    value={entry.top_model}
                                    maxLength={80}
                                    onChange={(event) =>
                                      updateEntry(index, {
                                        top_model: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            ) : (
                              <Textarea
                                readOnly
                                value='Real stats are loaded from logs. Public metrics use this user actual usage for the selected visitor period.'
                                className='text-muted-foreground min-h-16 resize-none text-xs'
                              />
                            )}
                          </div>
                          <div className='flex items-center justify-end gap-1'>
                            <Switch
                              checked={entry.enabled}
                              onCheckedChange={(checked) =>
                                updateEntry(index, { enabled: checked })
                              }
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              title='Move up'
                              disabled={index === 0}
                              onClick={() => moveEntry(index, -1)}
                            >
                              <ArrowUp className='size-4' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              title='Move down'
                              disabled={index === entries.length - 1}
                              onClick={() => moveEntry(index, 1)}
                            >
                              <ArrowDown className='size-4' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              title='Remove'
                              className='text-destructive hover:text-destructive'
                              onClick={() =>
                                setEntries((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index
                                  )
                                )
                              }
                            >
                              <Trash2 className='size-4' />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

function AdminStat(props: { label: string; value: number | string }) {
  return (
    <div className='rounded-xl border bg-slate-50 px-4 py-3 dark:bg-slate-900'>
      <p className='text-muted-foreground text-xs font-semibold'>
        {props.label}
      </p>
      <p className='mt-1 text-2xl font-black'>{props.value}</p>
    </div>
  )
}

function ToggleRow(props: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className='flex min-w-52 items-center justify-between gap-4'>
      <span className='text-sm font-semibold'>{props.label}</span>
      <Switch checked={props.checked} onCheckedChange={props.onCheckedChange} />
    </div>
  )
}

function SmallMetric(props: { label: string; value: string }) {
  return (
    <div className='rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900'>
      <p className='text-muted-foreground text-[10px] font-bold uppercase'>
        {props.label}
      </p>
      <p className='truncate font-bold'>{props.value}</p>
    </div>
  )
}

function NumberInput(props: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className='text-muted-foreground text-xs font-semibold'>
        {props.label}
      </label>
      <Input
        type='number'
        min={0}
        value={props.value}
        onChange={(event) => props.onChange(toNumber(event.target.value))}
      />
    </div>
  )
}
