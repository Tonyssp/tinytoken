import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { searchUsers } from '@/features/users/api'
import { LogsFilterInput } from './logs-filter-toolbar'

interface AdminUserSearchProps {
  value: string
  onChange: (value: string) => void
  onSelect: (username: string) => void
  onSubmit: () => void
}

export function AdminUserSearch({
  value,
  onChange,
  onSelect,
  onSubmit,
}: AdminUserSearchProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(value.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [value])

  const { data, isFetching } = useQuery({
    queryKey: ['usage-log-user-search', keyword],
    queryFn: () => searchUsers({ keyword, p: 1, page_size: 8 }),
    enabled: open && keyword.length >= 2,
    staleTime: 30_000,
  })
  const users = data?.success ? (data.data?.items ?? []) : []
  const showResults = open && keyword.length >= 2 && keyword === value.trim()

  return (
    <div
      className='relative'
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <LogsFilterInput
        value={value}
        aria-label={t('Search user by username')}
        aria-expanded={showResults}
        aria-controls='usage-log-user-options'
        aria-autocomplete='list'
        role='combobox'
        autoComplete='off'
        placeholder={t('Search user by username')}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
          } else if (event.key === 'ArrowDown' && showResults) {
            event.preventDefault()
            listRef.current?.querySelector('button')?.focus()
          } else if (event.key === 'Enter') {
            event.preventDefault()
            if (showResults && users.length === 1) {
              onSelect(users[0].username)
              setOpen(false)
            } else {
              onSubmit()
              setOpen(false)
            }
          }
        }}
      />
      {showResults && (
        <div
          id='usage-log-user-options'
          ref={listRef}
          role='listbox'
          className='bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full min-w-56 overflow-y-auto rounded-md border p-1 shadow-md'
        >
          {isFetching && users.length === 0 ? (
            <div className='text-muted-foreground flex justify-center py-3'>
              <Loader2 className='size-4 animate-spin' />
            </div>
          ) : users.length === 0 ? (
            <p className='text-muted-foreground px-2 py-2 text-sm'>
              {t('No Users Found')}
            </p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                type='button'
                role='option'
                aria-selected={value === user.username}
                className='hover:bg-accent focus:bg-accent flex w-full flex-col rounded-sm px-2 py-1.5 text-left text-sm outline-none'
                onClick={() => {
                  onChange(user.username)
                  onSelect(user.username)
                  setOpen(false)
                }}
              >
                <span className='font-medium'>{user.username}</span>
                {user.display_name && user.display_name !== user.username && (
                  <span className='text-muted-foreground truncate text-xs'>
                    {user.display_name}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
