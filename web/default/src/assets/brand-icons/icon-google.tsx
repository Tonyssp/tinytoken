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
import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function IconGoogle({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      role='img'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      className={cn(className)}
      {...props}
    >
      <title>Google</title>
      <path
        fill='#4285F4'
        d='M21.6 12.23c0-.72-.06-1.25-.19-1.8H12v3.56h5.52c-.11.89-.71 2.24-2.05 3.14l-.02.12 2.98 2.2.21.02c1.95-1.72 3.06-4.25 3.06-7.24z'
      />
      <path
        fill='#34A853'
        d='M12 21.6c2.79 0 5.13-.88 6.84-2.39l-3.25-2.46c-.87.58-2.03.99-3.59.99a6.23 6.23 0 0 1-5.89-4.1l-.12.01-3.1 2.3-.04.11A10.32 10.32 0 0 0 12 21.6z'
      />
      <path
        fill='#FBBC05'
        d='M6.11 13.64a6.05 6.05 0 0 1-.34-1.99c0-.69.12-1.35.33-1.99l-.01-.13-3.14-2.34-.1.05A9.95 9.95 0 0 0 1.8 11.65c0 1.66.41 3.23 1.13 4.6l3.18-2.61z'
      />
      <path
        fill='#EA4335'
        d='M12 5.51c1.94 0 3.25.8 4 1.47l2.93-2.74C17.13 2.64 14.79 1.6 12 1.6a10.32 10.32 0 0 0-9.15 5.64l3.17 2.43A6.25 6.25 0 0 1 12 5.51z'
      />
    </svg>
  )
}
