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
import { useMemo, useState, type ReactNode } from 'react'
import { Layers3, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EXCLUDED_GROUPS } from '../constants'
import type { ParsedTier } from '../lib/billing-expr'
import {
  formatDynamicUnitPrice,
  getDynamicPricingTiers,
} from '../lib/dynamic-price'
import {
  formatFixedPrice,
  formatGroupPrice,
  stripTrailingZeros,
} from '../lib/price'
import type {
  PricingModel,
  PricingVendor,
  PriceType,
  TokenUnit,
} from '../types'

type Props = {
  models: PricingModel[]
  vendors: PricingVendor[]
  groupRatio: Record<string, number>
  priceRate: number
  usdExchangeRate: number
  tokenUnit: TokenUnit
  showRechargePrice: boolean
  onShowRechargePriceChange: (value: boolean) => void
  onModelClick: (name: string) => void
  onClassicView: () => void
}

type ThemeName = 'teal' | 'emerald' | 'sky' | 'amber' | 'slate' | 'violet'
type Theme = {
  border: string
  badge: string
  chip: string
  selected: string
  priceHead: string
  priceCell: string
  priceText: string
}

const themes: Record<ThemeName, Theme> = {
  teal: {
    border: 'border-teal-200 dark:border-teal-900',
    badge: 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
    chip: 'border-teal-200 bg-teal-50/70 text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200',
    selected:
      'border-teal-600 bg-teal-600 text-white dark:border-teal-500 dark:bg-teal-600',
    priceHead:
      'bg-teal-50/90 text-teal-800 dark:bg-teal-950/80 dark:text-teal-200',
    priceCell: 'bg-teal-50/45 dark:bg-teal-950/25',
    priceText: 'text-teal-800 dark:text-teal-200',
  },
  emerald: {
    border: 'border-emerald-200 dark:border-emerald-900',
    badge:
      'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    chip: 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    selected:
      'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600',
    priceHead:
      'bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200',
    priceCell: 'bg-emerald-50/45 dark:bg-emerald-950/25',
    priceText: 'text-emerald-800 dark:text-emerald-200',
  },
  sky: {
    border: 'border-sky-200 dark:border-sky-900',
    badge: 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    chip: 'border-sky-200 bg-sky-50/70 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
    selected:
      'border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-600',
    priceHead: 'bg-sky-50/90 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200',
    priceCell: 'bg-sky-50/45 dark:bg-sky-950/25',
    priceText: 'text-sky-800 dark:text-sky-200',
  },
  amber: {
    border: 'border-orange-200 dark:border-orange-900',
    badge:
      'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
    chip: 'border-orange-200 bg-orange-50/70 text-orange-800 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200',
    selected:
      'border-orange-600 bg-orange-600 text-white dark:border-orange-500 dark:bg-orange-600',
    priceHead:
      'bg-orange-50/90 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200',
    priceCell: 'bg-orange-50/45 dark:bg-orange-950/25',
    priceText: 'text-orange-800 dark:text-orange-200',
  },
  slate: {
    border: 'border-slate-300 dark:border-slate-700',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    chip: 'border-slate-300 bg-slate-100/70 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    selected:
      'border-slate-700 bg-slate-700 text-white dark:border-slate-500 dark:bg-slate-600',
    priceHead:
      'bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    priceCell: 'bg-slate-50 dark:bg-slate-800/45',
    priceText: 'text-slate-800 dark:text-slate-200',
  },
  violet: {
    border: 'border-violet-200 dark:border-violet-900',
    badge:
      'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    chip: 'border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200',
    selected:
      'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-600',
    priceHead:
      'bg-violet-50/90 text-violet-800 dark:bg-violet-950/80 dark:text-violet-200',
    priceCell: 'bg-violet-50/45 dark:bg-violet-950/25',
    priceText: 'text-violet-800 dark:text-violet-200',
  },
}

const fallbackThemes: ThemeName[] = [
  'teal',
  'violet',
  'sky',
  'amber',
  'emerald',
  'slate',
]

function themeForName(name: string, index = 0): Theme {
  const key = name.toLowerCase()
  if (key.includes('grok')) return themes.slate
  if (key.includes('gemini') || key.includes('google')) return themes.sky
  if (
    key.includes('claude') ||
    key.includes('kiro') ||
    key.includes('anthropic')
  ) {
    return themes.amber
  }
  if (key.includes('gpt') || key.includes('codex') || key.includes('openai')) {
    return themes.emerald
  }
  if (key === 'default') return themes.teal
  return themes[fallbackThemes[index % fallbackThemes.length]]
}

const dynamicFields: Record<PriceType, string> = {
  input: 'inputPrice',
  output: 'outputPrice',
  cache: 'cacheReadPrice',
  create_cache: 'cacheCreatePrice',
  image: 'imagePrice',
  audio_input: 'audioInputPrice',
  audio_output: 'audioOutputPrice',
}

function formatPrice(
  model: PricingModel,
  group: string,
  type: PriceType,
  ratio: number,
  tier: ParsedTier | undefined,
  props: Props
): string {
  if (tier) {
    const raw = tier[dynamicFields[type]]
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return '—'
    return stripTrailingZeros(
      formatDynamicUnitPrice(raw, {
        tokenUnit: props.tokenUnit,
        showRechargePrice: props.showRechargePrice,
        priceRate: props.priceRate,
        usdExchangeRate: props.usdExchangeRate,
        groupRatioMultiplier: ratio,
      })
    )
  }
  if (model.billing_mode === 'tiered_expr') return '—'
  if (model.quota_type === 1) {
    if (type !== 'input') return '—'
    const value = stripTrailingZeros(
      formatFixedPrice(
        model,
        group,
        props.showRechargePrice,
        props.priceRate,
        props.usdExchangeRate,
        { [group]: ratio }
      )
    )
    return value === '-' ? '—' : value
  }
  const value = stripTrailingZeros(
    formatGroupPrice(
      model,
      group,
      type,
      props.tokenUnit,
      props.showRechargePrice,
      props.priceRate,
      props.usdExchangeRate,
      { [group]: ratio }
    )
  )
  return value === '-' ? '—' : value
}

function CachePrice(props: {
  model: PricingModel
  group: string
  ratio: number
  tier: ParsedTier | undefined
  plaza: Props
}) {
  const write = formatPrice(
    props.model,
    props.group,
    'create_cache',
    props.ratio,
    props.tier,
    props.plaza
  )
  const read = formatPrice(
    props.model,
    props.group,
    'cache',
    props.ratio,
    props.tier,
    props.plaza
  )
  if (write === '—' && read === '—') return <>—</>
  return (
    <span className='inline-flex flex-wrap gap-x-2 gap-y-0.5'>
      <span>
        <span className='text-muted-foreground'>W</span> {write}
      </span>
      <span>
        <span className='text-muted-foreground'>R</span> {read}
      </span>
    </span>
  )
}

function PriceCell(props: {
  model: PricingModel
  group: string
  type: 'input' | 'output' | 'cache'
  ratio: number
  tiers: ParsedTier[]
  plaza: Props
  theme: Theme
}) {
  const { t } = useTranslation()
  const lines: (ParsedTier | undefined)[] =
    props.tiers.length > 0 ? props.tiers : [undefined]
  return (
    <td
      className={cn(
        'border-l border-slate-100 px-3 py-3 align-middle font-mono text-xs tabular-nums dark:border-slate-800',
        props.theme.priceCell
      )}
    >
      <div className='space-y-1'>
        {lines.map((tier, index) => (
          <div
            key={index}
            className='flex min-h-5 flex-wrap items-baseline gap-x-2'
          >
            {tier && (
              <span className='text-muted-foreground min-w-[3.4rem] text-[10px] font-medium whitespace-nowrap'>
                {tier.label || t('Tier {{number}}', { number: index + 1 })}
              </span>
            )}
            <span className='text-foreground font-bold whitespace-nowrap'>
              {props.type === 'cache' ? (
                <CachePrice
                  model={props.model}
                  group={props.group}
                  ratio={props.ratio}
                  tier={tier}
                  plaza={props.plaza}
                />
              ) : (
                formatPrice(
                  props.model,
                  props.group,
                  props.type,
                  props.ratio,
                  tier,
                  props.plaza
                )
              )}
              {props.model.quota_type === 1 && props.type === 'input' && (
                <span className='text-muted-foreground ml-1 text-[10px] font-normal'>
                  / request
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </td>
  )
}

function FilterChip(props: {
  label: string
  active: boolean
  onClick: () => void
  theme?: Theme
  icon?: ReactNode
}) {
  const theme = props.theme || themes.teal
  return (
    <button
      type='button'
      aria-pressed={props.active}
      onClick={props.onClick}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors',
        props.active ? theme.selected : theme.chip
      )}
    >
      {props.icon}
      {props.label}
    </button>
  )
}

function GroupPriceCard(props: {
  group: string
  models: PricingModel[]
  ratio: number
  theme: Theme
  plaza: Props
}) {
  const { t } = useTranslation()
  const firstVendor = props.models[0]?.vendor_name
  const oneVendor = props.models.every(
    (model) => model.vendor_name === firstVendor
  )
  const icon =
    oneVendor && props.models[0]
      ? props.models[0].vendor_icon || props.models[0].icon
      : ''
  const columns: ('input' | 'output' | 'cache')[] = ['input', 'output', 'cache']
  const gpt55 = props.models.find((model) => model.model_name === 'gpt-5.5')
  const rechargeFactor = props.plaza.showRechargePrice
    ? props.plaza.priceRate / props.plaza.usdExchangeRate
    : 1
  const inputPrice = gpt55
    ? gpt55.model_ratio * 2 * props.ratio * rechargeFactor
    : 0
  const outputPrice = gpt55 ? inputPrice * gpt55.completion_ratio : 0
  const savingsMultiple =
    gpt55?.quota_type === 0 &&
    gpt55.billing_mode !== 'tiered_expr' &&
    inputPrice > 0 &&
    outputPrice > 0 &&
    inputPrice < 5 &&
    outputPrice < 30
      ? Math.floor(Math.min(5 / inputPrice, 30 / outputPrice) * 100) / 100
      : null

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-950',
        props.theme.border
      )}
    >
      <div className='flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800'>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-bold',
            props.theme.badge
          )}
        >
          {icon ? getLobeIcon(icon, 16) : <Layers3 className='size-4' />}
          {props.group}
        </span>
        <span className='text-muted-foreground ml-auto text-xs'>
          {t('{{count}} models', { count: props.models.length })}
        </span>
      </div>
      {savingsMultiple && savingsMultiple > 1 && (
        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-5 py-2.5 text-xs text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'>
          <strong>
            {t(
              'GPT-5.5: input and output prices are {{multiple}}× lower than OpenAI standard rates (up to 272K input tokens)',
              {
                multiple: savingsMultiple.toFixed(2),
              }
            )}
          </strong>
          <a
            href='https://developers.openai.com/api/docs/models/gpt-5.5'
            target='_blank'
            rel='noopener noreferrer'
            className='underline underline-offset-2'
          >
            {t('See official GPT-5.5 pricing')}
          </a>
        </div>
      )}
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[580px] border-collapse text-left text-sm'>
          <colgroup>
            <col className='w-[40%]' />
            <col className='w-[19%]' />
            <col className='w-[19%]' />
            <col className='w-[22%]' />
          </colgroup>
          <thead className='text-[11px] font-semibold text-slate-500 dark:text-slate-400'>
            <tr>
              <th rowSpan={2} scope='col' className='px-5 py-3'>
                {t('Model')}
              </th>
              <th
                colSpan={3}
                scope='colgroup'
                className={cn(
                  'border-l border-slate-100 px-3 py-2 text-center dark:border-slate-800',
                  props.theme.priceHead
                )}
              >
                {t('Price on TinyToken')}
                <span className='ml-1 font-normal tracking-normal normal-case opacity-70'>
                  / {props.plaza.tokenUnit === 'M' ? '1M' : '1K'} tokens
                </span>
              </th>
            </tr>
            <tr className='border-t border-slate-100 dark:border-slate-800'>
              {columns.map((column) => (
                <th
                  key={column}
                  scope='col'
                  className={cn(
                    'border-l border-slate-100 px-3 py-2 dark:border-slate-800',
                    props.theme.priceHead
                  )}
                >
                  {t(column === 'cache' ? 'Cache' : column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.models.map((model) => {
              const tiers = getDynamicPricingTiers(model)
              return (
                <tr
                  key={model.model_name}
                  className='border-t border-slate-100 transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/50'
                >
                  <td className='px-5 py-3'>
                    <button
                      type='button'
                      onClick={() => props.plaza.onModelClick(model.model_name)}
                      className={cn(
                        'text-left font-semibold hover:underline',
                        props.theme.priceText
                      )}
                    >
                      {model.model_name}
                    </button>
                    {model.quota_type === 1 && (
                      <span className='ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800'>
                        {t('Per request')}
                      </span>
                    )}
                  </td>
                  {columns.map((column) => (
                    <PriceCell
                      key={column}
                      model={model}
                      group={props.group}
                      type={column}
                      ratio={props.ratio}
                      tiers={tiers}
                      plaza={props.plaza}
                      theme={props.theme}
                    />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function ModelPlaza(props: Props) {
  const { t } = useTranslation()
  const [platform, setPlatform] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [search, setSearch] = useState('')

  const groups = useMemo(
    () =>
      [...new Set(props.models.flatMap((model) => model.enable_groups || []))]
        .filter(
          (group) =>
            !EXCLUDED_GROUPS.includes(group) &&
            Object.prototype.hasOwnProperty.call(props.groupRatio, group)
        )
        .sort(),
    [props.models, props.groupRatio]
  )
  const visibleGroups = groups.filter(
    (group) => groupFilter === 'all' || group === groupFilter
  )
  const query = search.trim().toLowerCase()
  const visible = visibleGroups
    .map((group) => ({
      group,
      models: props.models.filter(
        (model) =>
          model.enable_groups?.includes(group) &&
          (platform === 'all' || model.vendor_name === platform) &&
          (!query ||
            model.model_name.toLowerCase().includes(query) ||
            (model.vendor_name || '').toLowerCase().includes(query))
      ),
    }))
    .filter((entry) => entry.models.length > 0)

  return (
    <div className='min-h-screen bg-gradient-to-br from-sky-50/70 via-teal-50/30 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900'>
      <div className='mx-auto w-full max-w-[1900px] px-4 pt-16 pb-14 sm:px-8'>
        <div className='mb-7 flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {t('Model Plaza')}
            </h1>
            <p className='text-muted-foreground mt-1 max-w-3xl text-sm'>
              {t(
                'Explore TinyToken model prices by platform and group. Select a model for more details.'
              )}
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={props.onClassicView}
          >
            {t('Classic view')}
          </Button>
        </div>

        <div className='mb-7 space-y-3 rounded-2xl border border-sky-100 bg-white/60 p-4 shadow-sm backdrop-blur-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900/60'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='w-16 shrink-0 text-[11px] font-bold tracking-wide text-slate-400 uppercase'>
              {t('Platform')}
            </span>
            <FilterChip
              label={t('All')}
              active={platform === 'all'}
              onClick={() => setPlatform('all')}
            />
            {props.vendors.map((vendor) => (
              <FilterChip
                key={vendor.id}
                label={vendor.name}
                icon={vendor.icon ? getLobeIcon(vendor.icon, 15) : undefined}
                theme={themeForName(vendor.name)}
                active={platform === vendor.name}
                onClick={() => setPlatform(vendor.name)}
              />
            ))}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='w-16 shrink-0 text-[11px] font-bold tracking-wide text-slate-400 uppercase'>
              {t('Group')}
            </span>
            <FilterChip
              label={t('All')}
              active={groupFilter === 'all'}
              onClick={() => setGroupFilter('all')}
            />
            {groups.map((group, index) => (
              <FilterChip
                key={group}
                label={group}
                theme={themeForName(group, index)}
                active={groupFilter === group}
                onClick={() => setGroupFilter(group)}
              />
            ))}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='w-16 shrink-0 text-[11px] font-bold tracking-wide text-slate-400 uppercase'>
              {t('Model')}
            </span>
            <div className='relative w-full max-w-sm'>
              <Search className='text-muted-foreground absolute top-2.5 left-3 size-4' />
              <Input
                className='bg-white pl-9 dark:bg-slate-900'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('Search models')}
              />
            </div>
            <label className='ml-auto inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300'>
              <input
                type='checkbox'
                checked={props.showRechargePrice}
                onChange={(event) =>
                  props.onShowRechargePriceChange(event.target.checked)
                }
              />
              {t('Show recharge cost')}
            </label>
          </div>
        </div>

        <div className='space-y-6'>
          {visible.length === 0 && (
            <p className='text-muted-foreground rounded-2xl border bg-white p-8 text-center'>
              {t('No models match your current filters.')}
            </p>
          )}
          {visible.map(({ group, models }) => (
            <GroupPriceCard
              key={group}
              group={group}
              models={models}
              ratio={props.groupRatio[group] ?? 1}
              theme={themeForName(group, groups.indexOf(group))}
              plaza={props}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
