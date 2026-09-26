import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/dialog'
import { getApiKeys, searchApiKeys } from '../../api'
import { API_KEY_STATUS } from '../../constants'
import { useApiKeys } from '../api-keys-provider'

export function CCSwitchKeyPicker() {
  const { t } = useTranslation()
  const { open, setOpen, setCurrentRow, setResolvedKey, resolveRealKey } =
    useApiKeys()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const pickerOpen = open === 'cc-switch-pick-key'
  const { data, isLoading } = useQuery({
    queryKey: ['cc-switch-key-picker', search],
    queryFn: () =>
      search.trim()
        ? searchApiKeys({ keyword: search.trim(), p: 1, size: 50 })
        : getApiKeys({ p: 1, size: 50 }),
    enabled: pickerOpen,
    staleTime: 30_000,
  })
  const keys = (data?.data?.items || []).filter(
    (key) => key.status === API_KEY_STATUS.ENABLED
  )

  return (
    <Dialog
      open={pickerOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSearch('')
          setOpen(null)
        }
      }}
      title={t('Select API key for CC Switch')}
      contentClassName='sm:max-w-lg'
      contentHeight='auto'
      bodyClassName='space-y-3'
    >
      <div className='relative'>
        <Search className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
        <Input
          className='pl-9'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Filter by name...')}
          aria-label={t('Filter by name...')}
        />
      </div>
      <div className='max-h-72 space-y-1 overflow-y-auto'>
        {isLoading && (
          <p className='text-muted-foreground p-3 text-sm'>{t('Loading...')}</p>
        )}
        {!isLoading && keys.length === 0 && (
          <p className='text-muted-foreground p-3 text-sm'>
            {t('No enabled API keys found')}
          </p>
        )}
        {keys.map((key) => (
          <Button
            key={key.id}
            variant='ghost'
            className='h-auto w-full justify-start gap-3 px-3 py-2 text-left'
            disabled={selectedId !== null}
            onClick={async () => {
              setSelectedId(key.id)
              try {
                const realKey = await resolveRealKey(key.id)
                if (!realKey) return
                setCurrentRow(key)
                setResolvedKey(realKey)
                setSearch('')
                setOpen('cc-switch')
              } finally {
                setSelectedId(null)
              }
            }}
          >
            {selectedId === key.id ? (
              <Loader2 className='size-4 shrink-0 animate-spin' />
            ) : (
              <KeyRound className='size-4 shrink-0' />
            )}
            <span className='min-w-0 flex-1 truncate'>{key.name}</span>
            <span className='text-muted-foreground max-w-32 truncate text-xs'>
              {key.group}
            </span>
          </Button>
        ))}
      </div>
    </Dialog>
  )
}
