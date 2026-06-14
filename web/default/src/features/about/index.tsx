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
import {
  ArrowRight,
  Clock3,
  Copy,
  ExternalLink,
  LinkIcon,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Markdown } from '@/components/ui/markdown'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/components/layout'
import { getAboutContent } from './api'

const contactLinks = {
  telegram: 'https://t.me/+9_DdYIuFAQlkYTk9',
  facebook: 'https://www.facebook.com/share/18odMfCxkk/?mibextid=wwXIfr',
  line: 'https://line.me/ti/g/N3pcMe9CAc',
}

const contactChannels = [
  {
    name: 'Telegram',
    label: 'เข้ากลุ่ม Telegram',
    description: 'เหมาะสำหรับติดตามข่าว อัปเดต และคุยกับทีมงานแบบรวดเร็ว',
    href: contactLinks.telegram,
    image: '/contact-assets/telegram-logo.png',
    accent: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/30',
  },
  {
    name: 'Facebook',
    label: 'ติดตาม Facebook',
    description: 'ช่องทางสำหรับประกาศทั่วไป โปรโมชัน และข้อความจากเพจ',
    href: contactLinks.facebook,
    image: '/contact-assets/facebook-logo.png',
    accent: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/30',
  },
  {
    name: 'LINE',
    label: 'เข้ากลุ่ม LINE',
    description: 'ช่องทางหลักสำหรับติดต่อ สอบถาม และรับความช่วยเหลือ',
    href: contactLinks.line,
    image: '/contact-assets/line-logo.png',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30',
  },
]

const supportItems = [
  'สมัครบัญชีและสร้าง API Key',
  'เติมเครดิตและตรวจยอดคงเหลือ',
  'ตั้งค่า Claude Code, Codex, OpenCode, Hermes และเครื่องมืออื่น',
  'ตรวจ endpoint, model name และปัญหาเชื่อมต่อ API',
]

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isLikelyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function EmptyAboutState() {
  return (
    <div className='min-h-[calc(100svh-4rem)] bg-white text-slate-950 dark:bg-slate-950 dark:text-white'>
      <section className='border-b bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_48%,#f5fff7_100%)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#020617_0%,#071527_48%,#08190f_100%)]'>
        <div className='mx-auto grid max-w-6xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm dark:border-blue-500/30 dark:bg-slate-900/80 dark:text-blue-200'>
              <MessageCircle className='size-4' />
              Contact TinyAPI
            </div>
            <h1 className='mt-5 text-4xl font-bold tracking-tight md:text-5xl'>
              ติดต่อทีมงาน TinyAPI
            </h1>
            <p className='mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg dark:text-slate-300'>
              เลือกช่องทางที่สะดวกเพื่อสอบถามเรื่อง API Key, การเติมเครดิต, ราคาโมเดล
              หรือการตั้งค่าเครื่องมือ AI ให้เชื่อมต่อกับ TinyAPI
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
              {contactChannels.map((channel) => (
                <a
                  key={channel.name}
                  href={channel.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900'
                >
                  <img
                    src={channel.image}
                    alt={channel.name}
                    className='size-8 rounded-md object-cover'
                  />
                  {channel.name}
                  <ExternalLink className='size-4 text-slate-400' />
                </a>
              ))}
            </div>
          </div>

          <a
            href={contactLinks.line}
            target='_blank'
            rel='noopener noreferrer'
            className='rounded-xl border bg-white p-5 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900'
          >
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-sm font-bold text-emerald-600 dark:text-emerald-300'>
                  LINE QR
                </p>
                <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>
                  สแกนหรือกดรูปเพื่อเข้ากลุ่ม
                </p>
              </div>
              <ArrowRight className='size-5 text-emerald-500' />
            </div>
            <img
              src='/contact-assets/line-qr.png'
              alt='LINE group QR code'
              className='mt-4 aspect-square w-full rounded-lg border object-cover dark:border-slate-800'
            />
          </a>
        </div>
      </section>

      <section className='mx-auto grid max-w-6xl gap-6 px-4 py-10 md:px-6 lg:grid-cols-3'>
        {contactChannels.map((channel) => (
          <a
            key={channel.name}
            href={channel.href}
            target='_blank'
            rel='noopener noreferrer'
            className='group rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900'
          >
            <div className='flex items-start justify-between gap-4'>
              <img
                src={channel.image}
                alt={channel.name}
                className='size-14 rounded-xl object-cover shadow-sm'
              />
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${channel.accent}`}>
                เปิดลิงก์
              </span>
            </div>
            <h2 className='mt-5 text-xl font-bold'>{channel.label}</h2>
            <p className='mt-3 min-h-14 text-sm leading-7 text-slate-600 dark:text-slate-300'>
              {channel.description}
            </p>
            <div className='mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700 group-hover:underline dark:text-blue-300'>
              ไปที่ {channel.name}
              <ExternalLink className='size-4' />
            </div>
          </a>
        ))}
      </section>

      <section className='mx-auto grid max-w-6xl gap-6 px-4 pb-14 md:px-6 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='rounded-xl border bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60'>
          <div className='flex items-center gap-3'>
            <ShieldCheck className='size-6 text-emerald-600 dark:text-emerald-300' />
            <h2 className='text-2xl font-bold'>เราช่วยเรื่องอะไรได้บ้าง</h2>
          </div>
          <div className='mt-5 grid gap-3 sm:grid-cols-2'>
            {supportItems.map((item) => (
              <div
                key={item}
                className='rounded-lg border bg-white p-4 text-sm font-medium leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-4'>
          <div className='rounded-xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
            <div className='flex items-center gap-3'>
              <Clock3 className='size-5 text-blue-700 dark:text-blue-300' />
              <h3 className='font-bold'>เวลาตอบกลับ</h3>
            </div>
            <p className='mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300'>
              ปกติทีมงานจะตอบกลับในช่องทางโซเชียลเร็วที่สุด โดยเฉพาะ LINE และ Telegram
            </p>
          </div>

          <div className='rounded-xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900'>
            <div className='flex items-center gap-3'>
              <LinkIcon className='size-5 text-blue-700 dark:text-blue-300' />
              <h3 className='font-bold'>API Endpoint</h3>
            </div>
            <div className='mt-3 flex items-center gap-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-950'>
              <code className='min-w-0 flex-1 truncate font-mono text-sm'>
                https://api.tinyapi.org
              </code>
              <Copy className='size-4 text-slate-400' />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export function About() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['about-content'],
    queryFn: getAboutContent,
  })

  const rawContent = data?.data?.trim() ?? ''
  const hasContent = rawContent.length > 0
  const isUrl = hasContent && isValidUrl(rawContent)
  const isHtml = hasContent && !isUrl && isLikelyHtml(rawContent)

  if (isLoading) {
    return (
      <PublicLayout>
        <div className='mx-auto flex max-w-4xl flex-col gap-4 py-12'>
          <Skeleton className='h-8 w-[45%]' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-[90%]' />
          <Skeleton className='h-4 w-[80%]' />
        </div>
      </PublicLayout>
    )
  }

  if (!hasContent) {
    return (
      <PublicLayout>
        <EmptyAboutState />
      </PublicLayout>
    )
  }

  if (isUrl) {
    return (
      <PublicLayout showMainContainer={false}>
        <iframe
          src={rawContent}
          className='h-[calc(100vh-3.5rem)] w-full border-0'
          title={t('About')}
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl px-4 py-8'>
        {isHtml ? (
          <div
            className='prose prose-neutral dark:prose-invert max-w-none'
            dangerouslySetInnerHTML={{ __html: rawContent }}
          />
        ) : (
          <Markdown className='prose-neutral dark:prose-invert max-w-none'>
            {rawContent}
          </Markdown>
        )}
      </div>
    </PublicLayout>
  )
}
