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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type Row } from '@tanstack/react-table'
import {
  Trash2,
  Edit,
  Power,
  PowerOff,
  Clipboard,
  ExternalLink,
  ArrowRightLeft,
  Copy,
  Link,
  Loader2,
  PlugZap,
  MoreHorizontal as DotsHorizontalIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { resolveTinyTokenApiBaseUrl } from '@/lib/tinytoken-endpoint'
import { Button } from '@/components/ui/button'
import { ComboboxInput } from '@/components/ui/combobox-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useChatPresets } from '@/features/chat/hooks/use-chat-presets'
import { resolveChatUrl, type ChatPreset } from '@/features/chat/lib/chat-links'
import { sendToFluent } from '@/features/chat/lib/send-to-fluent'
import {
  fetchApiKeyTestModels,
  getApiKeys,
  sendApiKeyTestMessage,
  updateApiKeyStatus,
} from '../api'
import { API_KEY_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'
import { type ApiKey, apiKeySchema } from '../types'
import { useApiKeys } from './api-keys-provider'

function getStatusServerAddress(): string {
  try {
    const raw = localStorage.getItem('status')
    if (raw) {
      const status = JSON.parse(raw)
      if (status.server_address) return status.server_address as string
    }
  } catch {
    /* empty */
  }
  return window.location.origin
}

function getServerAddress(): string {
  return resolveTinyTokenApiBaseUrl(getStatusServerAddress())
}

function encodeConnectionString(key: string, url: string): string {
  return JSON.stringify({
    _type: 'newapi_channel_conn',
    key,
    url,
  })
}

function getDefaultTestEndpoint(): string {
  try {
    const currentUrl = new URL(window.location.origin)
    if (
      currentUrl.hostname === '127.0.0.1' ||
      currentUrl.hostname === 'localhost'
    ) {
      currentUrl.port = '3000'
      return `${currentUrl.toString().replace(/\/$/, '')}/v1/chat/completions`
    }
  } catch {
    /* fall back to configured server address */
  }

  const baseUrl = getServerAddress().replace(/\/$/, '')
  return `${baseUrl}/v1/chat/completions`
}

type DataTableRowActionsProps<TData> = {
  row: Row<TData>
}

type TestResult = {
  success: boolean
  message?: string
  responseText?: string
  raw?: unknown
  elapsedMs?: number
}

type ApiKeyTestDialogProps = {
  open: boolean
  initialApiKey: ApiKey
  resolveRealKey: (id: number) => Promise<string | null>
  onOpenChange: (open: boolean) => void
}

function ApiKeyTestDialog(props: ApiKeyTestDialogProps) {
  const { t } = useTranslation()
  const { open, initialApiKey, resolveRealKey } = props
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedApiKeyId, setSelectedApiKeyId] = useState(
    String(initialApiKey.id)
  )
  const [endpoint, setEndpoint] = useState(getDefaultTestEndpoint)
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [message, setMessage] = useState('hi')
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const apiKeyOptions = useMemo(
    () =>
      apiKeys.map((item) => ({
        value: String(item.id),
        label: item.name || `API Key #${item.id}`,
      })),
    [apiKeys]
  )

  const modelOptions = useMemo(
    () => models.map((item) => ({ value: item, label: item })),
    [models]
  )

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setSelectedApiKeyId(String(initialApiKey.id))
    setEndpoint(getDefaultTestEndpoint())
    setApiKeys([initialApiKey])
    setIsLoadingApiKeys(true)
    setResult(null)

    getApiKeys({ p: 1, size: 1000 })
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data?.items) {
          setApiKeys(res.data.items)
        } else if (!res.success) {
          setResult({
            success: false,
            message: res.message || t('Failed to load API keys.'),
          })
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingApiKeys(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, initialApiKey, t])

  useEffect(() => {
    if (!open || !selectedApiKeyId || !endpoint.trim()) return

    let cancelled = false
    setIsLoadingModels(true)
    setModels([])
    setModel('')

    resolveRealKey(Number(selectedApiKeyId))
      .then((token) => {
        if (cancelled || !token) return null
        return fetchApiKeyTestModels(token, endpoint)
      })
      .then((res) => {
        if (cancelled || !res) return
        setModels(res.models)
        setModel((current) => current || res.models[0] || '')
        if (!res.success) {
          setResult({
            success: false,
            message: res.message || t('Failed to load models.'),
          })
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingModels(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, selectedApiKeyId, endpoint, resolveRealKey, t])

  const handleSend = async () => {
    const testEndpoint = endpoint.trim()
    const selectedModel = model.trim()
    const testMessage = message.trim()

    if (!selectedApiKeyId) {
      setResult({ success: false, message: 'Please select an API key.' })
      return
    }

    if (!testEndpoint) {
      setResult({ success: false, message: 'Please enter an endpoint.' })
      return
    }

    if (!selectedModel) {
      setResult({ success: false, message: t('Please select a model.') })
      return
    }

    if (!testMessage) {
      setResult({ success: false, message: t('Please enter test text.') })
      return
    }

    setIsSending(true)
    setResult(null)
    try {
      const token = await resolveRealKey(Number(selectedApiKeyId))
      if (!token) {
        setResult({ success: false, message: 'Failed to load API key.' })
        return
      }

      const nextResult = await sendApiKeyTestMessage({
        token,
        endpoint: testEndpoint,
        model: selectedModel,
        message: testMessage,
      })
      setResult(nextResult)
      if (nextResult.success) {
        toast.success(t('Model test successful.'))
      } else {
        toast.error(nextResult.message || t('Model test failed.'))
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Test API</DialogTitle>
          <DialogDescription>
            ทดสอบ API Key นี้ผ่าน endpoint ของ TinyToken อาจใช้เครดิตเล็กน้อย
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor={`api-key-test-key-${initialApiKey.id}`}>
                API Key
              </Label>
              <ComboboxInput
                id={`api-key-test-key-${initialApiKey.id}`}
                options={apiKeyOptions}
                value={selectedApiKeyId}
                onValueChange={setSelectedApiKeyId}
                placeholder={
                  isLoadingApiKeys ? 'Loading API keys...' : 'Select API key'
                }
                emptyText='No API key found.'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`api-key-test-endpoint-${initialApiKey.id}`}>
                Endpoint (Auto)
              </Label>
              <div className='flex gap-2'>
                <Input
                  id={`api-key-test-endpoint-${initialApiKey.id}`}
                  value={endpoint}
                  readOnly
                  placeholder='http://localhost:3000/v1/chat/completions'
                  className='bg-muted/40'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  aria-label='Copy endpoint'
                  onClick={async () => {
                    const ok = await copyToClipboard(endpoint)
                    if (ok) toast.success(t('Copied'))
                  }}
                >
                  <Clipboard className='size-4' />
                </Button>
              </div>
              <p className='text-muted-foreground text-xs'>
                Auto-detected from this web app.
              </p>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor={`api-key-test-model-${initialApiKey.id}`}>
              โมเดล
            </Label>
            <ComboboxInput
              id={`api-key-test-model-${initialApiKey.id}`}
              options={modelOptions}
              value={model}
              onValueChange={setModel}
              allowCustomValue
              placeholder={
                isLoadingModels
                  ? t('Loading models...')
                  : t('Select or enter model name')
              }
              emptyText={t('No model found. Type a model name manually.')}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor={`api-key-test-message-${initialApiKey.id}`}>
              ข้อความทดสอบ
            </Label>
            <Textarea
              id={`api-key-test-message-${initialApiKey.id}`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder={t('Enter text to send to the selected model')}
            />
          </div>

          <div className='space-y-2'>
            <div className='bg-muted/40 min-h-14 rounded-md border p-3'>
              {isLoadingModels && !result ? (
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Loader2 className='size-4 animate-spin' />
                  {t('Loading models...')}
                </div>
              ) : result ? (
                <div className='space-y-2'>
                  <div
                    className={
                      result.success
                        ? 'text-sm font-medium text-emerald-600 dark:text-emerald-400'
                        : 'text-destructive text-sm font-medium'
                    }
                  >
                    {result.success
                      ? t('Success')
                      : result.message || t('Failed')}
                    {result.elapsedMs != null && (
                      <span className='text-muted-foreground ml-2 font-normal'>
                        {result.elapsedMs}ms
                      </span>
                    )}
                  </div>
                  {result.responseText && (
                    <pre className='text-foreground max-h-40 overflow-auto text-sm whitespace-pre-wrap'>
                      {result.responseText}
                    </pre>
                  )}
                  {!result.responseText && result.raw != null && (
                    <pre className='text-muted-foreground max-h-40 overflow-auto text-xs whitespace-pre-wrap'>
                      {JSON.stringify(result.raw, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className='text-muted-foreground text-sm'>
                  การทดสอบนี้เรียกโมเดลจริง และอาจใช้เครดิตเล็กน้อย
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => props.onOpenChange(false)}
            disabled={isSending}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !selectedApiKeyId}
          >
            {isSending && <Loader2 className='size-4 animate-spin' />}
            ทดสอบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { t } = useTranslation()
  const apiKey = apiKeySchema.parse(row.original)
  const {
    setOpen,
    setCurrentRow,
    triggerRefresh,
    setResolvedKey,
    resolveRealKey,
    resolvedKeys,
    loadingKeys,
  } = useApiKeys()
  const isEnabled = apiKey.status === API_KEY_STATUS.ENABLED
  const { chatPresets, serverAddress } = useChatPresets()
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [isPreparingTest, setIsPreparingTest] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const resolvedRealKey = resolvedKeys[apiKey.id]
  const isRealKeyLoading = Boolean(loadingKeys[apiKey.id])

  const hasChatPresets = chatPresets.length > 0

  const handleMenuOpenChange = useCallback(
    (open: boolean) => {
      if (open && !resolvedRealKey && !isRealKeyLoading) {
        void resolveRealKey(apiKey.id)
      }
    },
    [apiKey.id, isRealKeyLoading, resolvedRealKey, resolveRealKey]
  )

  const getCachedRealKey = useCallback(() => {
    if (resolvedRealKey) return resolvedRealKey
    void resolveRealKey(apiKey.id)
    toast.info(t('API key is loading, please try again in a moment'))
    return null
  }, [apiKey.id, resolvedRealKey, resolveRealKey, t])

  const handleOpenChatPreset = useCallback(
    async (preset: ChatPreset) => {
      const realKey = await resolveRealKey(apiKey.id)
      if (!realKey) return

      if (preset.url.trim().toLowerCase() === 'ccswitch') {
        setResolvedKey(realKey)
        setCurrentRow(apiKey)
        setOpen('cc-switch')
        return
      }

      if (preset.type === 'fluent') {
        const success = sendToFluent(realKey, serverAddress)
        if (success) {
          toast.success(t('Sent the API key to FluentRead.'))
        } else {
          toast.info(
            t(
              'FluentRead extension not detected. Please ensure it is installed and active.'
            )
          )
        }
        return
      }

      const resolvedUrl = resolveChatUrl({
        template: preset.url,
        apiKey: realKey,
        serverAddress,
      })

      if (!resolvedUrl) {
        toast.error(t('Invalid chat link. Please contact your administrator.'))
        return
      }

      if (typeof window === 'undefined') return

      try {
        window.open(resolvedUrl, '_blank', 'noopener')
      } catch {
        window.location.href = resolvedUrl
      }
    },
    [
      resolveRealKey,
      apiKey,
      serverAddress,
      setCurrentRow,
      setOpen,
      setResolvedKey,
      t,
    ]
  )

  const handleToggleStatus = async (
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.stopPropagation()
    const newStatus = isEnabled
      ? API_KEY_STATUS.DISABLED
      : API_KEY_STATUS.ENABLED

    setIsTogglingStatus(true)
    try {
      const result = await updateApiKeyStatus(apiKey.id, newStatus)
      if (result.success) {
        const message = isEnabled
          ? t(SUCCESS_MESSAGES.API_KEY_DISABLED)
          : t(SUCCESS_MESSAGES.API_KEY_ENABLED)
        toast.success(message)
        triggerRefresh()
      } else {
        toast.error(result.message || t(ERROR_MESSAGES.STATUS_UPDATE_FAILED))
      }
    } catch {
      toast.error(t(ERROR_MESSAGES.UNEXPECTED))
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const handleOpenTestDialog = async () => {
    setIsPreparingTest(true)
    setTestDialogOpen(true)
    setIsPreparingTest(false)
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      <ApiKeyTestDialog
        open={testDialogOpen}
        initialApiKey={apiKey}
        resolveRealKey={resolveRealKey}
        onOpenChange={setTestDialogOpen}
      />

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={handleToggleStatus}
              disabled={isTogglingStatus}
              aria-label={isEnabled ? t('Disable') : t('Enable')}
              className={
                isEnabled
                  ? 'text-destructive hover:text-destructive'
                  : 'text-emerald-600 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400'
              }
            />
          }
        >
          {isTogglingStatus ? (
            <Loader2 className='size-4 animate-spin' />
          ) : isEnabled ? (
            <PowerOff className='size-4' />
          ) : (
            <Power className='size-4' />
          )}
        </TooltipTrigger>
        <TooltipContent>
          {isEnabled ? t('Disable') : t('Enable')}
        </TooltipContent>
      </Tooltip>

      <DropdownMenu modal={false} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger
          render={
            <Button
              variant='ghost'
              className='data-popup-open:bg-muted flex h-8 w-8 p-0'
            />
          }
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>{t('Open menu')}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[200px]'>
          <DropdownMenuItem
            onClick={async () => {
              const realKey = getCachedRealKey()
              if (!realKey) return
              const ok = await copyToClipboard(realKey)
              if (ok) toast.success(t('Copied'))
            }}
          >
            {t('Copy Key')}
            <DropdownMenuShortcut>
              <Copy size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              const realKey = getCachedRealKey()
              if (!realKey) return
              const connStr = encodeConnectionString(
                realKey,
                getServerAddress()
              )
              const ok = await copyToClipboard(connStr)
              if (ok) toast.success(t('Copied'))
            }}
          >
            {t('Copy Connection Info')}
            <DropdownMenuShortcut>
              <Link size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPreparingTest}
            onClick={handleOpenTestDialog}
          >
            {t('Test Connection')}
            <DropdownMenuShortcut>
              {isPreparingTest ? (
                <Loader2 size={16} className='animate-spin' />
              ) : (
                <PlugZap size={16} />
              )}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(apiKey)
              setOpen('update')
            }}
          >
            {t('Edit')}
            <DropdownMenuShortcut>
              <Edit size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              const realKey = await resolveRealKey(apiKey.id)
              if (!realKey) return
              setResolvedKey(realKey)
              setCurrentRow(apiKey)
              setOpen('cc-switch')
            }}
          >
            {t('CC Switch')}
            <DropdownMenuShortcut>
              <ArrowRightLeft size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          {hasChatPresets && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t('Chat')}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {chatPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => handleOpenChatPreset(preset)}
                  >
                    {preset.name}
                    {preset.type !== 'web' && (
                      <DropdownMenuShortcut>
                        <ExternalLink size={16} />
                      </DropdownMenuShortcut>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(apiKey)
              setOpen('delete')
            }}
            className='text-destructive focus:text-destructive'
          >
            {t('Delete')}
            <DropdownMenuShortcut>
              <Trash2 size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
