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
import type { AuthUser } from '@/stores/auth-store'
import { ROLE } from '@/lib/roles'

export const DEFAULT_POST_LOGIN_REDIRECT = '/dashboard'

const AUTH_PAGE_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/register',
  '/forgot-password',
  '/reset',
  '/otp',
  '/oauth',
]

const ERROR_PAGE_PREFIXES = ['/401', '/403', '/404', '/500', '/503']

const ADMIN_ONLY_PREFIXES = [
  '/channels',
  '/models',
  '/redemption-codes',
  '/subscriptions',
  '/system-settings',
  '/users',
]

const ADMIN_ONLY_EXACT_PATHS = ['/dashboard/users']

function hasPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function normalizeRedirectTarget(target?: string) {
  const trimmed = target?.trim()
  if (!trimmed) return DEFAULT_POST_LOGIN_REDIRECT

  try {
    const baseOrigin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost'
    const url = new URL(trimmed, baseOrigin)
    if (url.origin !== baseOrigin) {
      return DEFAULT_POST_LOGIN_REDIRECT
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_POST_LOGIN_REDIRECT
  }
}

function shouldResetAfterLogin(
  pathname: string,
  user?: Pick<AuthUser, 'role'>
) {
  if (
    AUTH_PAGE_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix)) ||
    ERROR_PAGE_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix))
  ) {
    return true
  }

  const isAdmin = (user?.role ?? ROLE.USER) >= ROLE.ADMIN
  if (isAdmin) return false

  return (
    ADMIN_ONLY_EXACT_PATHS.includes(pathname) ||
    ADMIN_ONLY_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix))
  )
}

export function getPostLoginRedirect(
  target?: string,
  user?: Pick<AuthUser, 'role'>
) {
  const normalized = normalizeRedirectTarget(target)

  try {
    const url = new URL(normalized, 'http://localhost')
    if (shouldResetAfterLogin(url.pathname, user)) {
      return DEFAULT_POST_LOGIN_REDIRECT
    }
  } catch {
    return DEFAULT_POST_LOGIN_REDIRECT
  }

  return normalized
}
