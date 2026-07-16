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
import type { CSSProperties, ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Azure,
  Claude,
  DeepSeek,
  Fireworks,
  Gemini,
  Midjourney,
  OpenAI,
  OpenRouter,
  Perplexity,
  Qwen,
} from '@lobehub/icons'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  KeyRound,
  Landmark,
  Layers3,
  Plug,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  WalletCards,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { CopyButton } from '@/components/copy-button'
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import {
  TELEGRAM_SUPPORT_URL,
  TelegramSupportDialog,
} from '@/components/telegram-support-dialog'
import {
  TinyTokenHeaderActions,
  tinyTokenHeaderMobileLinks,
} from '@/components/tinytoken-header-actions'
import { getHomeTrustMetrics } from './api'
import { useHomePageContent } from './hooks'

const API_BASE_URL = 'https://api.tinyapi.org'
const OPENAI_BASE_URL = `${API_BASE_URL}/v1`
const DOCS_URL = 'https://docs.tinyapi.org'
const CONTACT_LINE_URL = 'https://line.me/ti/g/N3pcMe9CAc'
const CONTACT_FACEBOOK_URL =
  'https://www.facebook.com/share/18odMfCxkk/?mibextid=wwXIfr'

const floatingContactChannels = [
  {
    name: 'Telegram',
    label: 'ติดต่อ Telegram',
    href: TELEGRAM_SUPPORT_URL,
    image: '/contact-assets/telegram-logo.png',
    className:
      'border-sky-200 hover:border-sky-300 hover:shadow-[0_14px_36px_rgba(14,165,233,0.24)] dark:border-sky-500/30',
    dotClassName: 'bg-sky-500',
  },
  {
    name: 'LINE',
    label: 'เข้าร่วม LINE',
    href: CONTACT_LINE_URL,
    image: '/contact-assets/line-logo.png',
    className:
      'border-emerald-200 hover:border-emerald-300 hover:shadow-[0_14px_36px_rgba(16,185,129,0.24)] dark:border-emerald-500/30',
    dotClassName: 'bg-emerald-500',
  },
  {
    name: 'Facebook',
    label: 'ติดตาม Facebook',
    href: CONTACT_FACEBOOK_URL,
    image: '/contact-assets/facebook-logo.png',
    className:
      'border-blue-200 hover:border-blue-300 hover:shadow-[0_14px_36px_rgba(37,99,235,0.24)] dark:border-blue-500/30',
    dotClassName: 'bg-blue-600',
  },
]

const tools = [
  'Claude Code',
  'Codex CLI',
  'OpenClaw',
  'opencode',
  'Hermes Agent',
  'Roo Cline',
  'Aider',
]

const providerLogos: Array<{
  name: string
  Icon: ElementType<{ size?: number | string; style?: CSSProperties }>
  color?: string
}> = [
  {
    name: 'OpenAI',
    Icon: OpenAI,
    color: '#111827',
  },
  {
    name: 'Midjourney',
    Icon: Midjourney,
    color: '#64748b',
  },
  {
    name: 'Azure',
    Icon: Azure.Color,
  },
  {
    name: 'Claude',
    Icon: Claude,
    color: Claude.colorPrimary,
  },
  {
    name: 'Fireworks',
    Icon: Fireworks.Color,
  },
  {
    name: 'Gemini',
    Icon: Gemini.Color,
  },
  {
    name: 'OpenRouter',
    Icon: OpenRouter,
    color: OpenRouter.colorPrimary,
  },
  {
    name: 'Qwen',
    Icon: Qwen.Color,
  },
  {
    name: 'DeepSeek',
    Icon: DeepSeek.Color,
  },
  {
    name: 'Perplexity',
    Icon: Perplexity.Color,
  },
]

const pools = [
  {
    name: 'Standard Pool',
    tag: 'แนะนำ',
    description: 'Claude + GPT pool หลัก เสถียรและเหมาะกับงานทั่วไป',
    color: 'text-indigo-600 dark:text-indigo-300',
    price: '$3 / 1M tokens',
    items: [
      'Claude Opus, Sonnet, Haiku',
      'GPT และ Codex models',
      'Auto-failover หลายช่องทาง',
    ],
  },
  {
    name: 'Performance Pool',
    tag: 'เร็ว',
    description: 'เหมาะกับงานที่ต้องการ latency ต่ำและ response เร็ว',
    color: 'text-amber-600 dark:text-amber-300',
    price: 'เลือกตามโมเดล',
    items: [
      'routing เร็วขึ้น',
      'เหมาะกับ CLI/agent',
      'ดูราคาจริงที่ All AI Model',
    ],
  },
  {
    name: 'Budget Pool',
    tag: 'ประหยัด',
    description: 'สำหรับงานจำนวนมากที่ต้องการคุมต้นทุนต่อ token',
    color: 'text-emerald-600 dark:text-emerald-300',
    price: 'จ่ายตามที่ใช้จริง',
    items: [
      'เหมาะกับ batch jobs',
      'เช็ค usage ได้ใน dashboard',
      'ใช้ API key เดียว',
    ],
  },
]

function ToolMarquee() {
  return (
    <div className='mx-auto mt-10 flex max-w-5xl flex-col items-center justify-center gap-3 text-center'>
      <Button
        variant='outline'
        className='h-12 rounded-xl border-indigo-200 bg-white px-6 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-950 dark:text-indigo-200 dark:hover:bg-indigo-500/10'
        render={<a href={DOCS_URL} target='_blank' rel='noopener noreferrer' />}
      >
        <BookOpen className='size-4' />
        คู่มือสำหรับModelที่นิยม
      </Button>
      <p className='text-sm font-medium text-slate-500 dark:text-slate-400'>
        {tools.join(' / ')}
      </p>
    </div>
  )
}

function FloatingContactButtons() {
  return (
    <aside className='fixed right-3 bottom-16 z-40 md:right-5 md:bottom-20'>
      <div className='hidden w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:block dark:border-slate-800 dark:bg-slate-950'>
        <div className='border-b border-slate-100 px-4 py-3 dark:border-slate-800'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-sm font-bold text-slate-900 dark:text-white'>
                ต้องการความช่วยเหลือ?
              </p>
              <p className='mt-0.5 text-xs text-slate-500 dark:text-slate-400'>
                ติดต่อทีม TinyAPI
              </p>
            </div>
            <span className='size-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-500/15' />
          </div>
        </div>
        <div className='p-2'>
          {floatingContactChannels.map((channel) => {
            const trigger = (
              <button
                type='button'
                className='group flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900'
              >
                <img
                  src={channel.image}
                  alt=''
                  className='size-9 rounded-lg object-cover shadow-sm transition group-hover:scale-105'
                />
                <span className='min-w-0'>
                  <span className='block truncate text-sm font-bold text-slate-900 dark:text-white'>
                    {channel.name}
                  </span>
                  <span className='block truncate text-[11px] text-slate-500 dark:text-slate-400'>
                    {channel.label}
                  </span>
                </span>
                <span
                  className={`ml-auto size-2 shrink-0 rounded-full ${channel.dotClassName}`}
                />
              </button>
            )
            if (channel.name === 'Telegram') {
              return (
                <TelegramSupportDialog key={channel.name} trigger={trigger} />
              )
            }
            return (
              <a
                key={channel.name}
                href={channel.href}
                target='_blank'
                rel='noopener noreferrer'
                className='group flex h-12 items-center gap-3 rounded-lg px-2 transition hover:bg-slate-50 dark:hover:bg-slate-900'
              >
                {trigger.props.children}
              </a>
            )
          })}
        </div>
        <Link
          to='/about'
          className='flex h-10 items-center justify-center border-t border-slate-100 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-500/10'
        >
          เปิดศูนย์ช่วยเหลือ
        </Link>
      </div>

      <div className='flex flex-col gap-2.5 md:hidden'>
        {floatingContactChannels.map((channel) => {
          const trigger = (
            <button
              type='button'
              aria-label={channel.label}
              title={channel.label}
              className={`group relative flex size-14 items-center justify-center rounded-2xl border bg-white p-1.5 shadow-lg shadow-slate-900/10 transition duration-300 hover:-translate-y-1 dark:bg-slate-950 ${channel.className}`}
            >
              <span
                className={`absolute top-1.5 right-1.5 size-2.5 rounded-full ring-2 ring-white ${channel.dotClassName} dark:ring-slate-950`}
              />
              <img
                src={channel.image}
                alt=''
                className='size-11 rounded-xl object-cover shadow-sm'
              />
            </button>
          )
          if (channel.name === 'Telegram') {
            return (
              <TelegramSupportDialog key={channel.name} trigger={trigger} />
            )
          }
          return (
            <a
              key={channel.name}
              href={channel.href}
              target='_blank'
              rel='noopener noreferrer'
              aria-label={channel.label}
              title={channel.label}
              className={`group relative flex size-14 items-center justify-center rounded-2xl border bg-white p-1.5 shadow-lg shadow-slate-900/10 transition duration-300 hover:-translate-y-1 dark:bg-slate-950 ${channel.className}`}
            >
              {trigger.props.children}
            </a>
          )
        })}
      </div>
    </aside>
  )
}

function FloatingLeaderboardButton() {
  const { status } = useStatus()
  if (status?.user_leaderboard_enabled !== true) return null

  return (
    <aside className='fixed bottom-16 left-3 z-40 md:bottom-20 md:left-5'>
      <Link
        to='/rankings'
        search={{ view: 'users', period: 'month' }}
        className='group hidden h-14 w-52 items-center gap-3 overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 px-3 text-white shadow-[0_18px_42px_rgba(245,158,11,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(245,158,11,0.34)] md:flex dark:border-amber-300/30'
      >
        <span className='relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-inner'>
          <Trophy className='size-5 animate-bounce' />
          <span className='absolute -top-1 -right-1 size-3 rounded-full bg-emerald-400 ring-2 ring-white' />
        </span>
        <span className='min-w-0'>
          <span className='block text-sm font-extrabold'>อันดับผู้ใช้งาน</span>
          <span className='block truncate text-[11px] font-semibold text-white/80'>
            ดู Hall of Fame
          </span>
        </span>
        <ArrowRight className='ml-auto size-4 transition group-hover:translate-x-0.5' />
      </Link>

      <Link
        to='/rankings'
        search={{ view: 'users', period: 'month' }}
        aria-label='ดูอันดับผู้ใช้งาน'
        title='ดูอันดับผู้ใช้งาน'
        className='group relative flex size-14 animate-bounce items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-1.5 text-white shadow-lg shadow-amber-500/20 transition duration-300 hover:-translate-y-1 md:hidden dark:border-amber-300/30'
      >
        <span className='absolute top-1.5 right-1.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-950' />
        <Trophy className='size-8 drop-shadow-sm' />
      </Link>
    </aside>
  )
}

function HomeTrustStrip() {
  const metricsQuery = useQuery({
    queryKey: ['home-trust-metrics'],
    queryFn: getHomeTrustMetrics,
    staleTime: 60 * 1000,
    retry: 1,
  })
  const metrics = metricsQuery.data

  const items = [
    {
      label: 'Service status',
      value: metricsQuery.isLoading
        ? 'กำลังตรวจสอบ'
        : metrics?.online
          ? 'ระบบพร้อมใช้งาน'
          : 'กำลังตรวจสอบระบบ',
      detail:
        metrics?.monitorCount && metrics.monitorCount > 0
          ? `${metrics.monitorCount} services monitored`
          : 'ตรวจสอบแบบเรียลไทม์',
      Icon: ShieldCheck,
      color: metrics?.online
        ? 'text-emerald-600 dark:text-emerald-300'
        : 'text-amber-600 dark:text-amber-300',
    },
    {
      label: 'AI models',
      value: metrics?.modelCount ? `${metrics.modelCount}+ โมเดล` : 'หลายโมเดล',
      detail: 'Claude, GPT และอื่น ๆ',
      Icon: Layers3,
      color: 'text-indigo-600 dark:text-indigo-300',
    },
    {
      label: 'API latency',
      value: metrics?.latencyMs ? `${metrics.latencyMs} ms` : 'กำลังวัด',
      detail: 'วัดจากการเชื่อมต่อของคุณ',
      Icon: Zap,
      color: 'text-amber-600 dark:text-amber-300',
    },
    {
      label: 'Payment',
      value: 'PromptPay + Bank',
      detail: 'พร้อมเพย์และโอนธนาคาร',
      Icon: Landmark,
      color: 'text-sky-600 dark:text-sky-300',
    },
  ]

  return (
    <div className='mx-auto mt-9 grid max-w-5xl divide-y overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950'>
      {items.map((item) => (
        <div
          key={item.label}
          className='flex min-w-0 items-center gap-3 px-4 py-3.5'
        >
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900'>
            <item.Icon className={`size-4 ${item.color}`} />
          </span>
          <span className='min-w-0 text-left'>
            <span className='block truncate text-xs font-semibold text-slate-500 dark:text-slate-400'>
              {item.label}
            </span>
            <span className='block truncate text-sm font-bold text-slate-950 dark:text-white'>
              {item.value}
            </span>
            <span className='block truncate text-[11px] text-slate-400 dark:text-slate-500'>
              {item.detail}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

function EndpointSummaryCard() {
  const values = [
    { label: 'Website URL', value: 'https://tinyapi.org' },
    { label: 'API Endpoint', value: API_BASE_URL },
  ]

  return (
    <div className='rounded-3xl border border-slate-200 bg-white/90 p-5 text-left shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90'>
      <div className='flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white'>
        <Plug className='size-4 text-indigo-500' />
        ตั้งค่า URL หลัก
      </div>
      <p className='mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400'>
        ช่องที่ต้องใส่มี 2 ค่าในระดับบนสุดพอ คือ Website URL และ API Endpoint
      </p>
      <div className='mt-4 space-y-3'>
        {values.map((item) => (
          <div
            key={item.label}
            className='grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70'
          >
            <div className='text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400'>
              {item.label}
            </div>
            <div className='flex min-w-0 items-center gap-2'>
              <code className='min-w-0 flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-sm whitespace-nowrap text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
                {item.value}
              </code>
              <CopyButton
                value={item.value}
                variant='outline'
                size='sm'
                className='size-9 shrink-0 px-2'
                tooltip='Copy'
                successTooltip='Copied!'
                aria-label={`Copy ${item.label}`}
              />
            </div>
          </div>
        ))}
      </div>
      <p className='mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400'>
        ถ้าเครื่องมือรองรับ ให้ใส่แค่{' '}
        <code className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-100'>
          {API_BASE_URL}
        </code>{' '}
        แล้วให้ระบบต่อ path ที่ต้องใช้เอง อย่าเติม{' '}
        <code className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-100'>
          /v1
        </code>{' '}
        หรือ{' '}
        <code className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-100'>
          /v1/chat/completions
        </code>{' '}
        ลงไปในช่องหลักถ้าเขาไม่ได้ร้องขอ
      </p>
    </div>
  )
}

function TerminalCard() {
  const command = `# ใช้ endpoint เดียวกับเครื่องมือที่รองรับ OpenAI API
export OPENAI_BASE_URL="${OPENAI_BASE_URL}"
export OPENAI_API_KEY="sk-YOUR_API_KEY"

curl ${OPENAI_BASE_URL}/chat/completions \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-opus-4-6","messages":[{"role":"user","content":"hi"}]}'`

  return (
    <div className='mx-auto mt-9 max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950'>
      <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800'>
        <div className='flex items-center gap-2'>
          <span className='size-2.5 rounded-full bg-rose-400' />
          <span className='size-2.5 rounded-full bg-amber-400' />
          <span className='size-2.5 rounded-full bg-emerald-400' />
        </div>
        <div className='flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400'>
          <Terminal className='size-4' />
          HELLO-TINYAPI
        </div>
        <CopyButton
          value={command}
          variant='outline'
          size='sm'
          className='h-8 px-2'
          tooltip='Copy'
          successTooltip='Copied!'
          aria-label='Copy command'
        />
      </div>
      <pre className='overflow-x-auto p-5 text-xs leading-7 text-slate-700 md:text-sm dark:text-slate-200'>
        <code>{command}</code>
      </pre>
    </div>
  )
}

function ProviderLogoTile(props: { provider: (typeof providerLogos)[number] }) {
  const Icon = props.provider.Icon

  return (
    <div
      className='group flex aspect-square min-h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 transition-transform hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100 dark:border-slate-700 dark:bg-white dark:shadow-black/20 dark:hover:border-indigo-300'
      title={props.provider.name}
      aria-label={props.provider.name}
    >
      <Icon
        size={34}
        style={{
          color: props.provider.color,
          filter: 'drop-shadow(0 8px 12px rgba(15, 23, 42, 0.10))',
        }}
      />
    </div>
  )
}

function MoreProviderTile() {
  return (
    <div
      className='flex aspect-square min-h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl font-bold text-indigo-500 shadow-sm shadow-slate-200/60 dark:border-slate-700 dark:bg-white dark:text-indigo-500 dark:shadow-black/20'
      aria-label='More providers'
      title='More providers'
    >
      ...
    </div>
  )
}

function PoolCard(props: { pool: (typeof pools)[number] }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-950'>
      <div className='mb-5 flex items-start justify-between gap-4'>
        <div>
          <h3 className='text-2xl font-bold'>{props.pool.name}</h3>
          <p
            className={`mt-2 text-xs font-bold tracking-[0.18em] uppercase ${props.pool.color}`}
          >
            {props.pool.tag}
          </p>
        </div>
        <span className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300'>
          Pool
        </span>
      </div>
      <p className='text-sm leading-7 text-slate-500 dark:text-slate-400'>
        {props.pool.description}
      </p>
      <ul className='mt-5 space-y-3'>
        {props.pool.items.map((item) => (
          <li key={item} className='flex items-center gap-2 text-sm'>
            <Check className={`size-4 ${props.pool.color}`} />
            {item}
          </li>
        ))}
      </ul>
      <p className='mt-6 text-xl font-bold text-indigo-700 dark:text-indigo-300'>
        {props.pool.price}
      </p>
    </div>
  )
}

function StepCard(props: {
  icon: React.ElementType
  title: string
  description: string
  href: string
}) {
  const Icon = props.icon

  return (
    <a
      href={props.href}
      className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10'
    >
      <span className='mb-5 flex size-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900'>
        <Icon className='size-5' />
      </span>
      <h3 className='text-lg font-bold'>{props.title}</h3>
      <p className='mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400'>
        {props.description}
      </p>
    </a>
  )
}

export function Home() {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user
  const { content, isLoaded, isUrl } = useHomePageContent()

  if (!isLoaded) {
    return (
      <PublicLayout showMainContainer={false}>
        <main className='flex min-h-screen items-center justify-center'>
          <div className='text-muted-foreground'>{t('Loading...')}</div>
        </main>
      </PublicLayout>
    )
  }

  if (content) {
    return (
      <PublicLayout showMainContainer={false}>
        <main className='overflow-x-hidden'>
          {isUrl ? (
            <iframe
              src={content}
              className='h-screen w-full border-none'
              title={t('Custom Home Page')}
            />
          ) : (
            <div className='container mx-auto py-8'>
              <Markdown className='custom-home-content'>{content}</Markdown>
            </div>
          )}
        </main>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout
      showMainContainer={false}
      siteName='TinyToken'
      logo={
        <img
          src='/tinytoken-logo.jpg'
          alt='TinyToken'
          className='size-full rounded-lg object-cover'
        />
      }
      navContent={<TinyTokenHeaderActions />}
      headerProps={{ mobileLinks: tinyTokenHeaderMobileLinks }}
      navLinks={[
        { title: 'Docs', href: DOCS_URL, external: true },
        { title: 'Status', href: '/dashboard/overview' },
      ]}
    >
      <main className='dark:bg-background dark:text-foreground min-h-svh bg-[#fbfbfc] text-slate-950'>
        <section className='mx-auto max-w-7xl px-4 pt-24 pb-12 md:px-6 md:pt-28 md:pb-16'>
          <div className='grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)_100px]'>
            <div className='order-2 lg:order-1 lg:-translate-x-10 lg:pt-5 xl:-translate-x-24'>
              <EndpointSummaryCard />
            </div>
            <div className='order-1 text-center lg:order-2'>
              <div className='mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'>
                <Sparkles className='size-4 text-indigo-500' />
                เปิดใช้งาน API · รวม Claude และ GPT ใน endpoint เดียว
              </div>
              <h1 className='mx-auto mt-6 max-w-4xl text-4xl leading-tight font-bold tracking-normal text-slate-950 sm:text-5xl md:text-6xl dark:text-white'>
                เขียนโค้ดเร็วขึ้น
                <br />
                ในราคาที่จ่ายไหว
              </h1>
              <p className='mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500 md:text-lg md:leading-8 dark:text-slate-400'>
                เติมยอด สร้าง API Key แล้วเรียกใช้ Claude, GPT และเครื่องมือ
                coding ยอดนิยมผ่าน Base URL เดียว จ่ายตามการใช้งานจริง
              </p>
              <div className='mt-7 flex flex-wrap justify-center gap-3'>
                <Button
                  className='h-12 rounded-xl px-6 shadow-xl shadow-slate-900/10'
                  render={
                    <Link to={isAuthenticated ? '/dashboard' : '/sign-up'} />
                  }
                >
                  เริ่มต้นใช้งาน
                  <ArrowRight className='size-4' />
                </Button>
                <Button
                  variant='outline'
                  className='h-12 rounded-xl px-6'
                  render={
                    <a
                      href={DOCS_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  }
                >
                  <BookOpen className='size-4' />
                  อ่านเอกสาร API
                </Button>
              </div>
            </div>
          </div>

          <HomeTrustStrip />
          <TerminalCard />
          <ToolMarquee />
        </section>

        <section className='mx-auto max-w-6xl px-4 py-20 md:px-6'>
          <div className='mb-12 text-center'>
            <p className='text-sm font-bold tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-300'>
              Model providers
            </p>
            <h2 className='mt-4 text-4xl font-bold tracking-tight md:text-5xl'>
              ตระกูลโมเดลที่ใช้บ่อยที่สุด
            </h2>
            <p className='mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-500 dark:text-slate-400'>
              ใช้ API Key เดียวเพื่อสลับใช้งาน Claude, GPT, Gemini, DeepSeek,
              Qwen และโมเดลอื่น ๆ ดูชื่อโมเดลและราคาจริงได้จาก All AI Model
            </p>
          </div>
          <div className='overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.13),transparent_38%),#ffffff] p-6 shadow-sm md:p-10 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.16),transparent_38%),#020617]'>
            <div className='grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10'>
              {providerLogos.map((provider) => (
                <ProviderLogoTile key={provider.name} provider={provider} />
              ))}
              <MoreProviderTile />
            </div>
            <div className='mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300'>
              <span className='font-semibold'>
                รองรับหลาย provider ใน endpoint เดียว
              </span>
              <Button
                variant='outline'
                className='h-10 rounded-xl'
                render={<Link to='/pricing' />}
              >
                ดู All AI Model
                <ArrowRight className='size-4' />
              </Button>
            </div>
          </div>
        </section>

        <section className='mx-auto max-w-6xl px-4 py-20 md:px-6'>
          <div className='mb-12 text-center'>
            <p className='text-sm font-bold tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-300'>
              Routing pools
            </p>
            <h2 className='mt-4 text-4xl font-bold tracking-tight md:text-5xl'>
              เลือก pool ให้เหมาะกับงาน
            </h2>
            <p className='mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-500 dark:text-slate-400'>
              ใช้ pool ที่เหมาะกับความเร็ว คุณภาพ และต้นทุนของงานคุณ
            </p>
          </div>
          <div className='grid gap-6 lg:grid-cols-3'>
            {pools.map((pool) => (
              <PoolCard key={pool.name} pool={pool} />
            ))}
          </div>
        </section>

        <section className='mx-auto max-w-6xl px-4 py-20 md:px-6'>
          <div className='mb-12 text-center'>
            <p className='text-sm font-bold tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-300'>
              Quick start
            </p>
            <h2 className='mt-4 text-4xl font-bold tracking-tight md:text-5xl'>
              เริ่มใช้งานใน 3 ขั้นตอน
            </h2>
          </div>
          <div className='grid gap-6 md:grid-cols-3'>
            <StepCard
              icon={WalletCards}
              title='เติมยอด'
              description='เพิ่มเครดิตเข้าบัญชี แล้วดูยอดคงเหลือได้จาก Dashboard'
              href='/console/topup'
            />
            <StepCard
              icon={KeyRound}
              title='สร้าง API Key'
              description='สร้าง key ที่ขึ้นต้นด้วย sk- และใช้ Test Connection ก่อนใช้งานจริง'
              href='/keys'
            />
            <StepCard
              icon={Plug}
              title='เชื่อมต่อเครื่องมือ'
              description='นำ Base URL, API Key และ model id ไปใส่ใน Claude Code หรือ Codex CLI'
              href={DOCS_URL}
            />
          </div>
        </section>

        <section className='mx-auto max-w-6xl px-4 py-20 md:px-6'>
          <div className='rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12 dark:border-slate-800 dark:bg-slate-950'>
            <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center'>
              <div>
                <div className='mb-5 flex flex-wrap gap-3'>
                  <span className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'>
                    <ShieldCheck className='size-4' />
                    ไม่ต้องมีบัญชี provider
                  </span>
                  <span className='inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300'>
                    <Zap className='size-4' />
                    ใช้ได้กับ CLI tools
                  </span>
                </div>
                <h2 className='text-4xl font-bold tracking-tight md:text-5xl'>
                  พร้อมเริ่มใช้งาน TinyToken แล้วหรือยัง?
                </h2>
                <p className='mt-4 max-w-2xl text-base leading-8 text-slate-500 dark:text-slate-400'>
                  อ่าน Quick Start เพื่อดูวิธีสมัคร เติมเงิน สร้าง API Key
                  และทดสอบ endpoint ก่อนนำไปใช้กับงานจริง
                </p>
              </div>
              <div className='space-y-3'>
                <Button
                  className='h-12 w-full rounded-xl'
                  render={
                    <Link to={isAuthenticated ? '/dashboard' : '/sign-up'} />
                  }
                >
                  {isAuthenticated ? 'เปิด Dashboard' : 'เริ่มต้นใช้งาน'}
                </Button>
                <Button
                  variant='outline'
                  className='h-12 w-full rounded-xl'
                  render={<Link to='/pricing' />}
                >
                  <Layers3 className='size-4' />
                  ดูโมเดลและราคา
                </Button>
                <Button
                  variant='outline'
                  className='h-12 w-full rounded-xl'
                  render={
                    <a
                      href={DOCS_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  }
                >
                  <BadgeCheck className='size-4' />
                  อ่าน Quick Start
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <FloatingLeaderboardButton />
      <FloatingContactButtons />
      <Footer />
    </PublicLayout>
  )
}
