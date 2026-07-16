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
import type { ReactElement } from 'react'
import { KeyRound, Send, WalletCards, Zap } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CopyButton } from '@/components/copy-button'

export const TELEGRAM_SUPPORT_URL = 'https://t.me/+9_DdYIuFAQlkYTk9'

const supportTopics = [
  { icon: KeyRound, label: 'ตั้งค่าและใช้งาน Claude Code' },
  { icon: Zap, label: 'Error, API Key หรือเครดิตไม่เข้า' },
  { icon: WalletCards, label: 'เติมเงินและติดตามสถานะ top-up' },
]

export function TelegramSupportDialog(props: { trigger: ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger render={props.trigger} />
      <DialogContent className='max-h-[calc(100svh-1rem)] gap-0 overflow-y-auto border-sky-200 bg-white p-0 shadow-[0_24px_80px_rgba(14,165,233,0.25)] sm:max-w-lg dark:border-sky-500/30 dark:bg-slate-950'>
        <DialogHeader className='sr-only'>
          <DialogTitle>ติดต่อ Admin ผ่าน Telegram</DialogTitle>
          <DialogDescription>
            สแกน QR หรือเปิดลิงก์เพื่อเข้ากลุ่ม Telegram ของ TinyAPI
          </DialogDescription>
        </DialogHeader>

        <div className='bg-sky-50 px-5 pt-7 pb-5 text-center sm:px-8 dark:bg-sky-500/10'>
          <div className='relative mx-auto w-fit'>
            <img
              src='/contact-assets/telegram-logo.png'
              alt='Telegram'
              className='size-20 rounded-2xl object-cover shadow-lg sm:size-24'
            />
            <span className='absolute -top-1 -right-1 size-6 rounded-full bg-emerald-500 ring-4 ring-white sm:size-7 dark:ring-slate-950' />
          </div>
          <div className='mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-bold text-sky-700 shadow-sm dark:border-sky-500/30 dark:bg-slate-950 dark:text-sky-200'>
            <span className='size-2 rounded-full bg-sky-500' />
            Admin Support · Online
          </div>
          <h2 className='mt-3 text-3xl font-bold text-sky-600 sm:text-4xl dark:text-sky-300'>
            ติดต่อ Admin
          </h2>
          <p className='mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400'>
            สแกน QR หรือกดเปิด Telegram เพื่อพูดคุยกับทีมซัพพอร์ต TinyAPI
          </p>
        </div>

        <div className='space-y-4 px-5 py-5 sm:px-8 sm:py-6'>
          <div className='mx-auto w-fit rounded-xl border border-sky-200 bg-white p-3 shadow-[0_14px_36px_rgba(14,165,233,0.16)] dark:border-sky-500/30'>
            <QRCodeSVG
              value={TELEGRAM_SUPPORT_URL}
              size={240}
              level='H'
              bgColor='#ffffff'
              fgColor='#0f172a'
              className='h-auto w-[min(64vw,240px)]'
              imageSettings={{
                src: '/contact-assets/telegram-logo.png',
                height: 46,
                width: 46,
                excavate: true,
              }}
            />
          </div>

          <div className='rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200'>
            Private Group
          </div>

          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
            <CopyButton
              value={TELEGRAM_SUPPORT_URL}
              variant='outline'
              size='default'
              className='h-12 w-full rounded-lg font-bold'
              tooltip='คัดลอกลิงก์ Telegram'
              successTooltip='คัดลอกแล้ว'
            >
              คัดลอกลิงก์
            </CopyButton>
            <Button
              className='h-12 rounded-lg bg-sky-500 font-bold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-600'
              render={
                <a
                  href={TELEGRAM_SUPPORT_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                />
              }
            >
              <Send className='size-4' />
              เปิด Telegram
            </Button>
          </div>

          <div className='rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70'>
            <p className='text-xs font-bold text-slate-500 dark:text-slate-400'>
              คุยเรื่องอะไรได้บ้าง
            </p>
            <div className='mt-3 space-y-2.5'>
              {supportTopics.map((topic) => {
                const Icon = topic.icon
                return (
                  <div
                    key={topic.label}
                    className='flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300'
                  >
                    <span className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white'>
                      <Icon className='size-4' />
                    </span>
                    {topic.label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
