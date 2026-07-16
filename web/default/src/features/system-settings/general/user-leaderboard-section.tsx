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
import { ArrowDown, ArrowUp, Plus, Search, Trash2, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { formatCompactNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { updateSystemOption } from '../api'
import { SettingsSection } from '../components/settings-section'

type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all'

type LeaderboardEntry = {
  user_id: number
  display_name: string
}

type LeaderboardCandidate = {
  user_id: number
  username: string
  display_name: string
  request_count: number
  used_quota: number
  prompt_tokens: number
  completion_tokens: number
  top_model: string
}

type CandidatesResponse = {
  success: boolean
  message?: string
  data?: LeaderboardCandidate[]
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
      .map((entry) => ({
        user_id: Number(entry.user_id),
        display_name: String(entry.display_name || ''),
      }))
      .filter((entry) => Number.isInteger(entry.user_id) && entry.user_id > 0)
  } catch {
    return []
  }
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

export function UserLeaderboardSection(props: {
  enabled: boolean
  entries: string
}) {
  const queryClient = useQueryClient()
  const initialEntries = useMemo(
    () => parseEntries(props.entries),
    [props.entries]
  )
  const [enabled, setEnabled] = useState(props.enabled)
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries)
  const [period, setPeriod] = useState<LeaderboardPeriod>('month')
  const [search, setSearch] = useState('')

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
    () => new Set(entries.map((entry) => entry.user_id)),
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

  const normalizedInitial = JSON.stringify(initialEntries)
  const isDirty =
    enabled !== props.enabled || JSON.stringify(entries) !== normalizedInitial

  const saveMutation = useMutation({
    mutationFn: async () => {
      const responses = await Promise.all([
        updateSystemOption({
          key: 'UserLeaderboardEnabled',
          value: enabled,
        }),
        updateSystemOption({
          key: 'UserLeaderboardEntries',
          value: JSON.stringify(entries),
        }),
      ])
      const failed = responses.find((response) => !response.success)
      if (failed)
        throw new Error(failed.message || 'Unable to save leaderboard')
    },
    onSuccess: () => {
      toast.success('บันทึก User Leaderboard แล้ว')
      queryClient.invalidateQueries({ queryKey: ['system-options'] })
      queryClient.invalidateQueries({ queryKey: ['public-user-leaderboard'] })
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

  return (
    <SettingsSection title='User Leaderboard'>
      <div className='space-y-4 rounded-lg border p-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-start gap-3'>
            <span className='bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg'>
              <Trophy className='size-5 text-amber-500' />
            </span>
            <div>
              <p className='font-semibold'>
                จัดอันดับผู้ใช้แบบคัดเลือกโดยแอดมิน
              </p>
              <p className='text-muted-foreground mt-1 max-w-3xl text-sm'>
                ดูสถิติจริง เลือกผู้ใช้ และเรียงลำดับเอง
                ลูกค้าจะเห็นเฉพาะชื่อสาธารณะและข้อมูลการใช้งานที่เลือกไว้
              </p>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-3'>
            <span className='text-sm font-medium'>แสดงต่อสาธารณะ</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <div className='flex flex-wrap items-center justify-between gap-3 border-y py-3'>
          <div className='flex rounded-lg border p-1'>
            {(
              [
                ['today', 'วันนี้'],
                ['week', '7 วัน'],
                ['month', '30 วัน'],
                ['all', 'ทั้งหมด'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type='button'
                onClick={() => setPeriod(value)}
                className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
                  period === value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            type='button'
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก Leaderboard'}
          </Button>
        </div>

        <div className='grid gap-5 xl:grid-cols-2'>
          <div className='min-w-0 space-y-3'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h4 className='font-semibold'>ผู้ใช้จากข้อมูลจริง</h4>
                <p className='text-muted-foreground text-xs'>
                  เรียงตามเครดิตที่ใช้ในช่วงเวลาที่เลือก
                </p>
              </div>
              <span className='text-muted-foreground text-xs'>
                {visibleCandidates.length} คน
              </span>
            </div>
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='ค้นหาชื่อหรือโมเดล'
                className='pl-9'
              />
            </div>
            <div className='max-h-[520px] space-y-2 overflow-y-auto pr-1'>
              {candidatesQuery.isLoading ? (
                <div className='text-muted-foreground py-12 text-center text-sm'>
                  กำลังโหลดสถิติผู้ใช้...
                </div>
              ) : visibleCandidates.length === 0 ? (
                <div className='text-muted-foreground py-12 text-center text-sm'>
                  ไม่พบผู้ใช้ที่เพิ่มได้
                </div>
              ) : (
                visibleCandidates.map((candidate) => (
                  <div
                    key={candidate.user_id}
                    className='flex items-center gap-3 rounded-lg border px-3 py-3'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-semibold'>
                        {candidate.display_name || candidate.username}
                        <span className='text-muted-foreground ml-2 font-normal'>
                          #{candidate.user_id}
                        </span>
                      </p>
                      <p className='text-muted-foreground mt-1 truncate text-xs'>
                        {formatCompactNumber(candidate.request_count)} requests
                        ·{' '}
                        {formatCompactNumber(
                          candidate.prompt_tokens + candidate.completion_tokens
                        )}{' '}
                        tokens
                        {candidate.top_model ? ` · ${candidate.top_model}` : ''}
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='shrink-0 gap-1.5'
                      onClick={() =>
                        setEntries((current) => [
                          ...current,
                          { user_id: candidate.user_id, display_name: '' },
                        ])
                      }
                      disabled={entries.length >= 20}
                    >
                      <Plus className='size-4' />
                      เลือก
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className='min-w-0 space-y-3'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h4 className='font-semibold'>อันดับที่จะแสดง</h4>
                <p className='text-muted-foreground text-xs'>
                  ลากลำดับด้วยลูกศร และตั้งชื่อสาธารณะได้
                </p>
              </div>
              <span className='text-muted-foreground text-xs'>
                {entries.length}/20 คน
              </span>
            </div>
            <div className='space-y-2'>
              {entries.length === 0 ? (
                <div className='text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm'>
                  เลือกผู้ใช้จากรายการด้านซ้าย
                </div>
              ) : (
                entries.map((entry, index) => {
                  const candidate = candidateByID.get(entry.user_id)
                  return (
                    <div
                      key={entry.user_id}
                      className='grid gap-3 rounded-lg border p-3 sm:grid-cols-[42px_minmax(0,1fr)_auto] sm:items-center'
                    >
                      <span className='bg-muted flex size-10 items-center justify-center rounded-lg text-sm font-bold'>
                        {index + 1}
                      </span>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>
                          {candidate?.display_name ||
                            candidate?.username ||
                            `User #${entry.user_id}`}
                        </p>
                        <Input
                          value={entry.display_name}
                          maxLength={40}
                          placeholder='ชื่อสาธารณะ (เว้นว่างเพื่อปิดบังอัตโนมัติ)'
                          className='mt-2 h-9'
                          onChange={(event) =>
                            setEntries((current) =>
                              current.map((item) =>
                                item.user_id === entry.user_id
                                  ? {
                                      ...item,
                                      display_name: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className='flex items-center justify-end gap-1'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          title='เลื่อนขึ้น'
                          disabled={index === 0}
                          onClick={() => moveEntry(index, -1)}
                        >
                          <ArrowUp className='size-4' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          title='เลื่อนลง'
                          disabled={index === entries.length - 1}
                          onClick={() => moveEntry(index, 1)}
                        >
                          <ArrowDown className='size-4' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          title='ลบออกจาก Leaderboard'
                          className='text-destructive hover:text-destructive'
                          onClick={() =>
                            setEntries((current) =>
                              current.filter(
                                (item) => item.user_id !== entry.user_id
                              )
                            )
                          }
                        >
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
