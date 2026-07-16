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
import { Link, useRouterState } from '@tanstack/react-router'
import {
  BookOpen,
  Home,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Trophy,
  WalletCards,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TopNavLink } from '@/components/layout/types'

const headerActionLinks = [
  {
    title: 'หน้าแรก',
    href: '/',
    icon: Home,
  },
  {
    title: 'แดชบอร์ด',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'แชท',
    href: '/playground',
    icon: MessageSquare,
  },
  {
    title: 'เติมเงิน',
    href: '/wallet',
    icon: WalletCards,
  },
  {
    title: 'อันดับ',
    href: '/rankings/?view=users&period=month',
    icon: Trophy,
  },
  {
    title: 'Getting Started',
    href: 'https://docs.tinyapi.org',
    icon: KeyRound,
    external: true,
  },
  {
    title: 'API Docs',
    href: 'https://docs.tinyapi.org',
    icon: BookOpen,
    external: true,
  },
]

export const tinyTokenHeaderMobileLinks: TopNavLink[] = [
  ...headerActionLinks.map((link) => ({
    title: link.title,
    href: link.href,
    external: link.external,
  })),
  {
    title: 'ดูราคาโมเดล',
    href: '/pricing',
  },
  {
    title: 'Contact Us',
    href: '/about',
  },
]

export function TinyTokenHeaderActions() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const normalize = (href: string) =>
    href.split('?')[0]?.replace(/\/+$/, '') || '/'
  const currentPath = normalize(pathname)

  return (
    <div className='flex min-w-0 flex-wrap items-center gap-1 xl:flex-nowrap'>
      {headerActionLinks.map((link) => {
        const Icon = link.icon
        const normalizedHref = normalize(link.href)
        const active =
          link.external
            ? false
            : normalizedHref === '/'
            ? currentPath === '/'
            : currentPath === normalizedHref ||
              currentPath.startsWith(`${normalizedHref}/`)

        const className = cn(
          'inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
          active &&
            'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20'
        )

        if (link.external) {
          return (
            <a
              key={link.title}
              href={link.href}
              target='_blank'
              rel='noopener noreferrer'
              className={className}
            >
              <Icon className='size-[18px]' />
              <span>{link.title}</span>
            </a>
          )
        }

        return (
          <Link
            key={link.title}
            to={link.href}
            className={className}
          >
            <Icon className='size-[18px]' />
            <span>{link.title}</span>
          </Link>
        )
      })}
    </div>
  )
}
