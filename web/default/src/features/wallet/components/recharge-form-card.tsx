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
import { useState, useEffect, useMemo } from 'react'
import {
  Banknote,
  CheckCircle2,
  Copy,
  Gift,
  ExternalLink,
  Loader2,
  QrCode,
  Receipt,
  UploadCloud,
  WalletCards,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  isApiSuccess,
  requestOtherManualTopup,
  requestPromptPayManualTopup,
} from '../api'
import {
  formatCurrency,
  getDiscountLabel,
  getPaymentIcon,
  getMinTopupAmount,
  calculatePresetPricing,
} from '../lib'
import type {
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  CreemProduct,
  WaffoPayMethod,
} from '../types'
import { CreemProductsSection } from './creem-products-section'

const BANK_OPTION_GROUPS = [
  {
    label: 'Thai banks',
    options: [
      { value: 'bangkok', label: 'กรุงเทพ (Bangkok Bank)' },
      { value: 'kasikorn', label: 'กสิกรไทย (Kasikorn Bank)' },
      { value: 'krungthai', label: 'กรุงไทย (Krungthai Bank)' },
      { value: 'ttb', label: 'ทหารไทยธนชาต (TMBThanachart Bank)' },
      { value: 'scb', label: 'ไทยพาณิชย์ (Siam Commercial Bank)' },
      { value: 'krungsri', label: 'กรุงศรีอยุธยา (Bank of Ayudhya)' },
      { value: 'gsb', label: 'ออมสิน (Government Savings Bank)' },
      { value: 'kkp', label: 'เกียรตินาคินภัทร (Kiatnakin Phatra Bank)' },
    ],
  },
]

const DEFAULT_PROMPTPAY_ID = '0844155451'

const OTHER_PANEL_PREFIX = 'other:'

function getOtherPanelKey(methodId: string) {
  return `${OTHER_PANEL_PREFIX}${methodId}`
}

function formatPromptPayField(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`
}

function crc16Ccitt(payload: string) {
  let crc = 0xffff

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function normalizePromptPayTarget(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return null

  if (digits.length === 13 && digits.startsWith('0066')) {
    return { type: '01', value: digits }
  }

  if (digits.length === 11 && digits.startsWith('66')) {
    return { type: '01', value: `0066${digits.slice(2)}` }
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    return { type: '01', value: `0066${digits.slice(1)}` }
  }

  if (digits.length === 9 && /^[689]/.test(digits)) {
    return { type: '01', value: `0066${digits}` }
  }

  if (digits.length === 13) {
    return { type: '02', value: digits }
  }

  if (digits.length >= 15) {
    return { type: '03', value: digits }
  }

  return null
}

function createPromptPayPayload(promptPayId: string, amount: number) {
  const target = normalizePromptPayTarget(promptPayId)
  if (!target || !Number.isFinite(amount) || amount <= 0) return ''

  const merchantAccountInfo =
    formatPromptPayField('00', 'A000000677010111') +
    formatPromptPayField(target.type, target.value)

  const payloadWithoutCrc =
    formatPromptPayField('00', '01') +
    formatPromptPayField('01', '12') +
    formatPromptPayField('29', merchantAccountInfo) +
    formatPromptPayField('53', '764') +
    formatPromptPayField('54', amount.toFixed(2)) +
    formatPromptPayField('58', 'TH') +
    '6304'

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`
}

interface RechargeFormCardProps {
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  onPaymentMethodSelect: (method: PaymentMethod) => void
  paymentLoading: string | null
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  topupLink?: string
  loading?: boolean
  priceRatio?: number
  usdExchangeRate?: number
  onOpenBilling?: () => void
  creemProducts?: CreemProduct[]
  enableCreemTopup?: boolean
  onCreemProductSelect?: (product: CreemProduct) => void
  enableWaffoTopup?: boolean
  waffoPayMethods?: WaffoPayMethod[]
  waffoMinTopup?: number
  onWaffoMethodSelect?: (method: WaffoPayMethod, index: number) => void
  enableWaffoPancakeTopup?: boolean
}

export function RechargeFormCard({
  topupInfo,
  presetAmounts,
  selectedPreset,
  onSelectPreset,
  topupAmount,
  onTopupAmountChange,
  paymentAmount,
  calculating,
  onPaymentMethodSelect,
  paymentLoading,
  redemptionCode,
  onRedemptionCodeChange,
  onRedeem,
  redeeming,
  topupLink,
  loading,
  priceRatio = 1,
  usdExchangeRate = 1,
  onOpenBilling,
  creemProducts,
  enableCreemTopup,
  onCreemProductSelect,
  enableWaffoTopup,
  waffoPayMethods,
  waffoMinTopup,
  onWaffoMethodSelect,
  enableWaffoPancakeTopup,
}: RechargeFormCardProps) {
  const { t } = useTranslation()
  const [localAmount, setLocalAmount] = useState('')
  const [activeTopupPanel, setActiveTopupPanel] = useState('thai')
  const [selectedPromptPayBank, setSelectedPromptPayBank] = useState('')
  const [promptPaySlipName, setPromptPaySlipName] = useState('')
  const [promptPaySlipFile, setPromptPaySlipFile] = useState<File | null>(null)
  const [submittingPromptPay, setSubmittingPromptPay] = useState(false)
  const [otherAmount, setOtherAmount] = useState('')
  const [selectedOtherPreset, setSelectedOtherPreset] = useState<number | null>(
    null
  )
  const [selectedOtherMethodId, setSelectedOtherMethodId] = useState('')
  const [otherBankFrom, setOtherBankFrom] = useState('')
  const [otherSlipName, setOtherSlipName] = useState('')
  const [otherSlipFile, setOtherSlipFile] = useState<File | null>(null)
  const [submittingOtherPayment, setSubmittingOtherPayment] = useState(false)

  useEffect(() => {
    // Keep the typed amount synced when preset buttons update topupAmount.
    if (topupInfo?.enable_promptpay_topup && topupAmount === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalAmount('')
      return
    }

    setLocalAmount(topupAmount > 0 ? topupAmount.toString() : '')
  }, [topupAmount, topupInfo?.enable_promptpay_topup])

  const handleAmountChange = (value: string) => {
    setLocalAmount(value)
    const numValue = value.trim() === '' ? 0 : parseInt(value) || 0
    if (numValue >= 0) {
      onTopupAmountChange(numValue)
    }
  }

  const promptPayEnabled = !!topupInfo?.enable_promptpay_topup
  const otherPaymentMethods = useMemo(
    () =>
      (topupInfo?.other_payment_methods || []).filter(
        (method) => method.enabled !== false
      ),
    [topupInfo?.other_payment_methods]
  )
  const otherPaymentEnabled =
    !!topupInfo?.enable_other_payment_topup && otherPaymentMethods.length > 0
  const hasConfigurableTopup =
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    promptPayEnabled ||
    otherPaymentEnabled ||
    enableWaffoTopup ||
    enableWaffoPancakeTopup
  const hasAnyTopup = hasConfigurableTopup || enableCreemTopup
  const promptPayId = topupInfo?.promptpay_id?.trim() || DEFAULT_PROMPTPAY_ID
  const promptPayRate = Number(topupInfo?.promptpay_rate || 0)
  const promptPayCredits = topupAmount * promptPayRate
  const promptPayMode = topupInfo?.promptpay_mode || 'manual'
  const promptPayProvider = topupInfo?.promptpay_slip_provider || 'manual'
  const promptPayQrPayload = createPromptPayPayload(promptPayId, topupAmount)
  const legacyTopupEnabled =
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    enableWaffoTopup ||
    enableWaffoPancakeTopup
  const hasStandardPaymentMethods =
    Array.isArray(topupInfo?.pay_methods) && topupInfo.pay_methods.length > 0
  const hasWaffoPaymentMethods =
    Array.isArray(waffoPayMethods) && waffoPayMethods.length > 0
  const minTopup = getMinTopupAmount(topupInfo)
  const redemptionEnabled = topupInfo?.enable_redemption !== false
  const promptPayAmountTooLow =
    promptPayEnabled && localAmount.trim() !== '' && topupAmount < minTopup
  const canSubmitPromptPay =
    !!promptPaySlipFile &&
    !!selectedPromptPayBank &&
    topupAmount >= minTopup &&
    topupAmount > 0
  const activeOtherMethodId = activeTopupPanel.startsWith(OTHER_PANEL_PREFIX)
    ? activeTopupPanel.slice(OTHER_PANEL_PREFIX.length)
    : selectedOtherMethodId
  const selectedOtherMethod =
    otherPaymentMethods.find((method) => method.id === activeOtherMethodId) ??
    otherPaymentMethods[0]
  const effectiveActiveTopupPanel =
    activeTopupPanel.startsWith(OTHER_PANEL_PREFIX) || !promptPayEnabled
      ? selectedOtherMethod
        ? getOtherPanelKey(selectedOtherMethod.id)
        : activeTopupPanel
      : activeTopupPanel
  const otherPaymentCurrency = topupInfo?.other_payment_currency || 'LAK'
  const otherPaymentRate = Number(topupInfo?.other_payment_rate || 0)
  const otherPaymentMinTopup = Number(topupInfo?.other_payment_min_topup || 0)
  const otherPaymentAmount =
    otherAmount.trim() === '' ? 0 : parseInt(otherAmount) || 0
  const otherPaymentCredits = otherPaymentAmount * otherPaymentRate
  const otherPaymentAmountTooLow =
    otherAmount.trim() !== '' &&
    otherPaymentMinTopup > 0 &&
    otherPaymentAmount < otherPaymentMinTopup
  const otherPaymentPresets = topupInfo?.other_payment_amount_options?.length
    ? topupInfo.other_payment_amount_options
    : [30000, 50000, 100000]
  const canSubmitOtherPayment =
    !!selectedOtherMethod?.id &&
    !!otherSlipFile &&
    otherPaymentAmount > 0 &&
    !otherPaymentAmountTooLow

  const copyPromptPayId = async () => {
    if (!promptPayId) {
      return
    }

    await navigator.clipboard.writeText(promptPayId)
    toast.success(t('Copied PromptPay ID'))
  }

  const handlePromptPaySubmit = async () => {
    if (!canSubmitPromptPay || !promptPaySlipFile) {
      return
    }

    const formData = new FormData()
    formData.append('amount', topupAmount.toString())
    formData.append('bank_from', selectedPromptPayBank)
    formData.append('slip', promptPaySlipFile)

    try {
      setSubmittingPromptPay(true)
      const response = await requestPromptPayManualTopup(formData)
      if (isApiSuccess(response)) {
        toast.success(t('ส่งคำขอเติมเครดิตแล้ว กรุณารอแอดมินตรวจสอบสลิป'))
        setPromptPaySlipFile(null)
        setPromptPaySlipName('')
        setSelectedPromptPayBank('')
      } else {
        toast.error(response.message || t('Failed to submit top-up request'))
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to submit top-up request')
      )
    } finally {
      setSubmittingPromptPay(false)
    }
  }

  const handleOtherPresetSelect = (amount: number) => {
    setOtherAmount(amount.toString())
    setSelectedOtherPreset(amount)
  }

  const handleOtherAmountChange = (value: string) => {
    setOtherAmount(value)
    setSelectedOtherPreset(null)
  }

  const handleOtherPaymentSubmit = async () => {
    if (!canSubmitOtherPayment || !otherSlipFile || !selectedOtherMethod) {
      return
    }

    const formData = new FormData()
    formData.append('amount', otherPaymentAmount.toString())
    formData.append('method_id', selectedOtherMethod.id)
    formData.append(
      'bank_from',
      otherBankFrom || selectedOtherMethod?.bank_name || ''
    )
    formData.append('slip', otherSlipFile)

    try {
      setSubmittingOtherPayment(true)
      const response = await requestOtherManualTopup(formData)
      if (isApiSuccess(response)) {
        toast.success(
          t(
            'Top-up request sent. Admin can approve it from Telegram, LINE, or order history.'
          )
        )
        setOtherSlipFile(null)
        setOtherSlipName('')
      } else {
        toast.error(response.message || t('Failed to submit top-up request'))
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('Failed to submit top-up request')
      )
    } finally {
      setSubmittingOtherPayment(false)
    }
  }

  if (loading) {
    return (
      <Card className='gap-0 overflow-hidden py-0'>
        <CardHeader className='border-b p-3 !pb-3 sm:p-5 sm:!pb-5'>
          <Skeleton className='h-6 w-32' />
          <Skeleton className='mt-2 h-4 w-48' />
        </CardHeader>
        <CardContent className='space-y-4 p-3 sm:space-y-6 sm:p-5'>
          <div className='space-y-4 sm:space-y-6'>
            {/* Preset Amounts Skeleton */}
            <div className='space-y-3'>
              <Skeleton className='h-3 w-16' />
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className='h-[72px] rounded-lg' />
                ))}
              </div>
            </div>

            {/* Custom Amount Input Skeleton */}
            <div className='space-y-3'>
              <Skeleton className='h-3 w-28' />
              <Skeleton className='h-[42px] w-full' />
            </div>

            {/* Payment Methods Skeleton */}
            <div className='space-y-3'>
              <Skeleton className='h-3 w-32' />
              <div className='flex flex-wrap gap-3'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-24 rounded-lg' />
                ))}
              </div>
            </div>
          </div>

          {/* Redemption Code Section Skeleton */}
          <div className='space-y-3 border-t pt-8'>
            <Skeleton className='h-3 w-24' />
            <div className='flex gap-2'>
              <Skeleton className='h-10 flex-1' />
              <Skeleton className='h-10 w-20' />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TitledCard
      title={t('Add Funds')}
      description={t('Choose an amount and payment method')}
      icon={<WalletCards className='h-4 w-4' />}
      action={
        onOpenBilling ? (
          <Button
            onClick={onOpenBilling}
            className='h-11 w-full gap-2 bg-emerald-600 px-5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-lg sm:w-auto dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400'
          >
            <Receipt className='size-5' />
            {t('Order History')}
          </Button>
        ) : null
      }
      contentClassName='space-y-4 sm:space-y-6'
    >
      {/* Online Topup Section */}
      {hasAnyTopup ? (
        <div className='space-y-4 sm:space-y-6'>
          {(promptPayEnabled ? 1 : 0) + otherPaymentMethods.length > 1 && (
            <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
              {promptPayEnabled && (
                <Button
                  type='button'
                  variant={
                    effectiveActiveTopupPanel === 'thai' ? 'default' : 'outline'
                  }
                  className='h-11 justify-start gap-2'
                  onClick={() => setActiveTopupPanel('thai')}
                >
                  <Banknote className='h-4 w-4' />
                  {t('Bank transfer / PromptPay')}
                </Button>
              )}
              {otherPaymentMethods.map((method) => (
                <Button
                  key={method.id}
                  type='button'
                  variant={
                    effectiveActiveTopupPanel === getOtherPanelKey(method.id)
                      ? 'default'
                      : 'outline'
                  }
                  className='h-11 justify-start gap-2'
                  onClick={() => {
                    setSelectedOtherMethodId(method.id)
                    setActiveTopupPanel(getOtherPanelKey(method.id))
                  }}
                >
                  <WalletCards className='h-4 w-4' />
                  <span className='truncate'>{method.name}</span>
                </Button>
              ))}
            </div>
          )}

          {promptPayEnabled && effectiveActiveTopupPanel === 'thai' && (
            <div className='space-y-4'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-center gap-2'>
                  <Banknote className='h-4 w-4' />
                  <Label className='text-base font-semibold'>
                    {t('Bank transfer / PromptPay')}
                  </Label>
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <CheckCircle2 className='h-4 w-4 text-green-600' />
                  {promptPayMode === 'manual' || promptPayProvider === 'manual'
                    ? t('Manual review')
                    : t('Automatic slip checking')}
                </div>
              </div>

              {presetAmounts.length > 0 && (
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
                  {presetAmounts.map((preset) => (
                    <Button
                      key={preset.value}
                      type='button'
                      variant={
                        selectedPreset === preset.value ? 'default' : 'outline'
                      }
                      onClick={() => onSelectPreset(preset)}
                      className='h-10'
                    >
                      ฿{formatNumber(preset.value)}
                    </Button>
                  ))}
                </div>
              )}

              <div className='grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
                <div className='space-y-4 rounded-lg border p-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='promptpay-amount'>
                      {t('Transfer amount (THB)')}
                    </Label>
                    <Input
                      id='promptpay-amount'
                      type='number'
                      value={localAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      min={minTopup}
                      placeholder={t('Minimum {{amount}} THB', {
                        amount: minTopup,
                      })}
                      className='h-11 text-lg'
                    />
                    <p className='text-muted-foreground text-sm'>
                      {t('Estimated credit: {{amount}}', {
                        amount: formatNumber(promptPayCredits || 0),
                      })}
                    </p>
                    {promptPayAmountTooLow && (
                      <p className='text-sm font-medium text-amber-600'>
                        {t('Minimum transfer amount is {{amount}} THB', {
                          amount: minTopup,
                        })}
                      </p>
                    )}
                  </div>

                  <div className='grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]'>
                    <div className='flex min-h-[220px] items-center justify-center rounded-lg border bg-white p-4'>
                      {promptPayQrPayload ? (
                        <QRCodeSVG
                          value={promptPayQrPayload}
                          title={t('PromptPay QR')}
                          size={210}
                          level='M'
                          marginSize={2}
                          className='h-full max-h-[210px] w-full max-w-[210px]'
                        />
                      ) : (
                        <div className='text-muted-foreground flex flex-col items-center gap-2 text-center text-sm'>
                          <QrCode className='h-10 w-10' />
                          {t('Enter PromptPay ID in admin settings to show QR')}
                        </div>
                      )}
                    </div>

                    <div className='bg-muted/30 space-y-3 rounded-lg border p-4'>
                      <div className='grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-sm'>
                        <span className='text-muted-foreground'>
                          {t('PromptPay ID')}
                        </span>
                        <div className='flex min-w-0 items-center gap-2'>
                          <span className='truncate font-mono font-semibold'>
                            {promptPayId || '-'}
                          </span>
                          {promptPayId && (
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-7 px-2'
                              onClick={copyPromptPayId}
                            >
                              <Copy className='h-3.5 w-3.5' />
                            </Button>
                          )}
                        </div>
                        <span className='text-muted-foreground'>
                          {t('Receiving bank')}
                        </span>
                        <span className='font-medium'>
                          {topupInfo?.promptpay_bank_name || '-'}
                        </span>
                        <span className='text-muted-foreground'>
                          {t('Receiving account name')}
                        </span>
                        <span className='font-medium'>
                          {topupInfo?.promptpay_account_name || '-'}
                        </span>
                      </div>
                      <div className='border-t pt-3 text-sm'>
                        <p className='text-muted-foreground'>
                          {topupInfo?.promptpay_instructions?.trim() ||
                            t(
                              'Scan the QR with your bank app, then upload the payment slip below.'
                            )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='space-y-4 rounded-lg border p-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='promptpay-bank'>
                      {t('Bank you transferred from')}
                    </Label>
                    <select
                      id='promptpay-bank'
                      value={selectedPromptPayBank}
                      onChange={(e) => setSelectedPromptPayBank(e.target.value)}
                      className='border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
                    >
                      <option value=''>{t('Select bank')}</option>
                      {BANK_OPTION_GROUPS.map((group) => (
                        <optgroup key={group.label} label={t(group.label)}>
                          {group.options.map((bank) => (
                            <option key={bank.value} value={bank.label}>
                              {bank.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='promptpay-slip'>
                      {t('Upload transfer slip')}
                    </Label>
                    <label
                      htmlFor='promptpay-slip'
                      className='hover:bg-muted/40 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center'
                    >
                      <UploadCloud className='text-muted-foreground h-6 w-6' />
                      <span className='text-sm font-medium'>
                        {promptPaySlipName || t('Choose slip file')}
                      </span>
                      <span className='text-muted-foreground text-xs'>
                        JPG, PNG, WEBP หรือ PDF ไม่เกิน 5 MB
                      </span>
                    </label>
                    <input
                      id='promptpay-slip'
                      type='file'
                      accept='.jpg,.jpeg,.png,.webp,.pdf'
                      className='hidden'
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setPromptPaySlipFile(file)
                        setPromptPaySlipName(file?.name || '')
                      }}
                    />
                  </div>

                  <Button
                    type='button'
                    className='w-full'
                    disabled={!canSubmitPromptPay || submittingPromptPay}
                    onClick={handlePromptPaySubmit}
                  >
                    {submittingPromptPay && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    {t('Submit top-up request')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {otherPaymentEnabled &&
            effectiveActiveTopupPanel.startsWith(OTHER_PANEL_PREFIX) &&
            selectedOtherMethod && (
              <div className='space-y-4'>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex items-center gap-2'>
                    <WalletCards className='h-4 w-4' />
                    <Label className='text-base font-semibold'>
                      {selectedOtherMethod.name || t('Other Payment')}
                    </Label>
                  </div>
                  <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <CheckCircle2 className='h-4 w-4 text-green-600' />
                    {t('Manual review')}
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                  {otherPaymentPresets.map((amount) => (
                    <Button
                      key={amount}
                      type='button'
                      variant={
                        selectedOtherPreset === amount ? 'default' : 'outline'
                      }
                      onClick={() => handleOtherPresetSelect(amount)}
                      className='h-10'
                    >
                      {otherPaymentCurrency} {formatNumber(amount)}
                    </Button>
                  ))}
                </div>

                <div className='grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
                  <div className='space-y-4 rounded-lg border p-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='other-payment-amount'>
                        {t('Transfer amount')} ({otherPaymentCurrency})
                      </Label>
                      <Input
                        id='other-payment-amount'
                        type='number'
                        value={otherAmount}
                        onChange={(e) =>
                          handleOtherAmountChange(e.target.value)
                        }
                        min={otherPaymentMinTopup}
                        placeholder={`${t('Minimum')} ${formatNumber(
                          otherPaymentMinTopup
                        )} ${otherPaymentCurrency}`}
                        className='h-11 text-lg'
                      />
                      <p className='text-muted-foreground text-sm'>
                        {t('Estimated credit: {{amount}}', {
                          amount: formatNumber(otherPaymentCredits || 0),
                        })}
                      </p>
                      {otherPaymentAmountTooLow && (
                        <p className='text-sm font-medium text-amber-600'>
                          {t('Minimum transfer amount is {{amount}}', {
                            amount: `${formatNumber(
                              otherPaymentMinTopup
                            )} ${otherPaymentCurrency}`,
                          })}
                        </p>
                      )}
                    </div>

                    <div className='grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]'>
                      <div className='flex min-h-[220px] items-center justify-center rounded-lg border bg-white p-4'>
                        {selectedOtherMethod?.qr_image_url ? (
                          <img
                            src={selectedOtherMethod.qr_image_url}
                            alt={t('Payment QR')}
                            className='h-full max-h-[210px] w-full max-w-[210px] object-contain'
                          />
                        ) : (
                          <div className='text-muted-foreground flex flex-col items-center gap-2 text-center text-sm'>
                            <QrCode className='h-10 w-10' />
                            {t('Payment QR is not configured.')}
                          </div>
                        )}
                      </div>

                      <div className='bg-muted/30 space-y-3 rounded-lg border p-4'>
                        <div className='grid grid-cols-[120px_minmax(0,1fr)] gap-2 text-sm'>
                          <span className='text-muted-foreground'>
                            {t('Currency')}
                          </span>
                          <span className='font-semibold'>
                            {otherPaymentCurrency}
                          </span>
                          <span className='text-muted-foreground'>
                            {t('Bank')}
                          </span>
                          <span className='font-medium'>
                            {selectedOtherMethod?.bank_name || '-'}
                          </span>
                          <span className='text-muted-foreground'>
                            {t('Account name')}
                          </span>
                          <span className='font-medium'>
                            {selectedOtherMethod?.account_name || '-'}
                          </span>
                          <span className='text-muted-foreground'>
                            {t('Account number')}
                          </span>
                          <div className='flex min-w-0 items-center gap-2'>
                            <span className='truncate font-mono font-semibold'>
                              {selectedOtherMethod?.account_number || '-'}
                            </span>
                            {selectedOtherMethod?.account_number && (
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='h-7 px-2'
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    selectedOtherMethod.account_number
                                  )
                                  toast.success(t('Copied account number'))
                                }}
                              >
                                <Copy className='h-3.5 w-3.5' />
                              </Button>
                            )}
                          </div>
                        </div>
                        {selectedOtherMethod?.note && (
                          <div className='border-t pt-3 text-sm'>
                            <p className='text-muted-foreground'>
                              {selectedOtherMethod.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-4 rounded-lg border p-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='other-bank-from'>
                        {t('Bank you transferred from')}
                      </Label>
                      <Input
                        id='other-bank-from'
                        value={otherBankFrom}
                        onChange={(e) => setOtherBankFrom(e.target.value)}
                        placeholder={t('Optional bank name')}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='other-slip'>
                        {t('Upload transfer slip')}
                      </Label>
                      <label
                        htmlFor='other-slip'
                        className='hover:bg-muted/40 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center'
                      >
                        <UploadCloud className='text-muted-foreground h-6 w-6' />
                        <span className='text-sm font-medium'>
                          {otherSlipName || t('Choose slip file')}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          JPG, PNG, WEBP หรือ PDF ไม่เกิน 5 MB
                        </span>
                      </label>
                      <input
                        id='other-slip'
                        type='file'
                        accept='.jpg,.jpeg,.png,.webp,.pdf'
                        className='hidden'
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setOtherSlipFile(file)
                          setOtherSlipName(file?.name || '')
                        }}
                      />
                    </div>

                    <Button
                      type='button'
                      className='w-full'
                      disabled={
                        !canSubmitOtherPayment || submittingOtherPayment
                      }
                      onClick={handleOtherPaymentSubmit}
                    >
                      {submittingOtherPayment && (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      )}
                      {t('Submit top-up request')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          {legacyTopupEnabled && (
            <>
              {presetAmounts.length > 0 && (
                <div className='space-y-2.5 sm:space-y-3'>
                  <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                    {t('Amount')}
                  </Label>
                  <div className='grid grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-4'>
                    {presetAmounts.map((preset, index) => {
                      const discount =
                        preset.discount ||
                        topupInfo?.discount?.[preset.value] ||
                        1.0
                      const {
                        displayValue,
                        actualPrice,
                        savedAmount,
                        hasDiscount,
                      } = calculatePresetPricing(
                        preset.value,
                        priceRatio,
                        discount,
                        usdExchangeRate
                      )
                      return (
                        <Button
                          key={index}
                          variant='outline'
                          className={cn(
                            'hover:border-foreground flex min-h-16 flex-col items-start rounded-lg px-3 py-2.5 text-left whitespace-normal sm:min-h-[72px] sm:p-4',
                            selectedPreset === preset.value
                              ? 'border-foreground bg-foreground/5 dark:border-foreground dark:bg-foreground/10'
                              : 'border-muted'
                          )}
                          onClick={() => onSelectPreset(preset)}
                        >
                          <div className='flex w-full items-center justify-between'>
                            <div className='text-base font-semibold sm:text-lg'>
                              {formatNumber(displayValue)}
                            </div>
                            {hasDiscount && (
                              <div className='text-xs font-medium text-green-600'>
                                {getDiscountLabel(discount)}
                              </div>
                            )}
                          </div>
                          <div className='text-muted-foreground mt-1.5 w-full text-xs sm:mt-2'>
                            Pay {formatCurrency(actualPrice)}
                            {hasDiscount && savedAmount > 0 && (
                              <span className='text-green-600'>
                                {' '}
                                • Save {formatCurrency(savedAmount)}
                              </span>
                            )}
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className='space-y-2.5 sm:space-y-3'>
                <Label
                  htmlFor='topup-amount'
                  className='text-muted-foreground text-xs font-medium tracking-wider uppercase'
                >
                  {t('Custom Amount')}
                </Label>
                <div className='grid grid-cols-[minmax(0,1fr)_minmax(110px,0.55fr)] gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
                  <Input
                    id='topup-amount'
                    type='number'
                    value={localAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    min={minTopup}
                    placeholder={`Minimum ${minTopup}`}
                    className='h-9 text-base sm:h-10 sm:text-lg'
                  />
                  <div className='bg-muted/30 flex min-h-9 items-center justify-between gap-2 rounded-md border px-3 lg:min-w-52'>
                    <span className='text-muted-foreground truncate text-xs'>
                      {t('Amount to pay:')}
                    </span>
                    {calculating ? (
                      <Skeleton className='h-5 w-16' />
                    ) : (
                      <span className='text-sm font-semibold'>
                        {formatCurrency(paymentAmount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className='space-y-2.5 sm:space-y-3'>
                <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                  {t('Payment Method')}
                </Label>
                {hasStandardPaymentMethods ? (
                  <div className='grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-3'>
                    {topupInfo?.pay_methods?.map((method) => {
                      const minTopup = method.min_topup || 0
                      const disabled = minTopup > topupAmount

                      const button = (
                        <Button
                          key={method.type}
                          variant='outline'
                          onClick={() => onPaymentMethodSelect(method)}
                          disabled={disabled || !!paymentLoading}
                          className='h-9 min-w-0 justify-start gap-2 rounded-lg px-3'
                        >
                          {paymentLoading === method.type ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            getPaymentIcon(
                              method.type,
                              'h-4 w-4',
                              method.icon,
                              method.name
                            )
                          )}
                          <span className='truncate'>{method.name}</span>
                        </Button>
                      )

                      return disabled ? (
                        <TooltipProvider key={method.type}>
                          <Tooltip>
                            <TooltipTrigger render={button}></TooltipTrigger>
                            <TooltipContent>
                              {t('Minimum topup amount: {{amount}}', {
                                amount: minTopup,
                              })}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        button
                      )
                    })}
                  </div>
                ) : hasWaffoPaymentMethods ? null : (
                  <Alert>
                    <AlertDescription>
                      {t(
                        'No payment methods available. Please contact administrator.'
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {enableWaffoTopup &&
                hasWaffoPaymentMethods &&
                onWaffoMethodSelect && (
                  <div className='space-y-2.5 sm:space-y-3'>
                    <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                      {t('Waffo Payment')}
                    </Label>
                    <div className='grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-3'>
                      {waffoPayMethods?.map((method, index) => {
                        const loadingKey = `waffo-${index}`
                        const waffoMin = waffoMinTopup || 0
                        const belowMin = waffoMin > topupAmount

                        const button = (
                          <Button
                            key={`${method.name}-${index}`}
                            variant='outline'
                            onClick={() => onWaffoMethodSelect(method, index)}
                            disabled={belowMin || !!paymentLoading}
                            className='h-9 min-w-0 justify-start gap-2 rounded-lg px-3'
                          >
                            {paymentLoading === loadingKey ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : method.icon ? (
                              <img
                                src={method.icon}
                                alt={method.name}
                                className='h-4 w-4 object-contain'
                              />
                            ) : (
                              getPaymentIcon('waffo')
                            )}
                            <span className='truncate'>{method.name}</span>
                          </Button>
                        )

                        return belowMin ? (
                          <TooltipProvider key={`${method.name}-${index}`}>
                            <Tooltip>
                              <TooltipTrigger render={button}></TooltipTrigger>
                              <TooltipContent>
                                {t('Minimum topup amount: {{amount}}', {
                                  amount: waffoMin,
                                })}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          button
                        )
                      })}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            {t(
              'Online topup is not enabled. Please use redemption code or contact administrator.'
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Creem Products Section */}
      {enableCreemTopup &&
        Array.isArray(creemProducts) &&
        creemProducts.length > 0 &&
        onCreemProductSelect && (
          <div className='space-y-2.5 border-t pt-4 sm:space-y-3 sm:pt-6'>
            <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
              {t('Creem Payment')}
            </Label>
            <CreemProductsSection
              products={creemProducts}
              onProductSelect={onCreemProductSelect}
            />
          </div>
        )}

      {/* Redemption Code Section */}
      {redemptionEnabled ? (
        <div className='space-y-2.5 border-t pt-4 sm:space-y-3 sm:pt-6'>
          <div className='flex items-center gap-2'>
            <Gift className='text-muted-foreground h-4 w-4' />
            <Label
              htmlFor='redemption-code'
              className='text-muted-foreground text-xs font-medium tracking-wider uppercase'
            >
              {t('Have a Code?')}
            </Label>
          </div>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
            <Input
              id='redemption-code'
              value={redemptionCode}
              onChange={(e) => onRedemptionCodeChange(e.target.value)}
              placeholder={t(
                'Enter a friend invite code here to redeem points'
              )}
              className='h-9 min-w-0'
            />
            <Button
              onClick={onRedeem}
              disabled={redeeming}
              variant='outline'
              className='h-9 px-4'
            >
              {redeeming && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {t('Redeem')}
            </Button>
          </div>
          {topupLink && (
            <p className='text-muted-foreground text-xs'>
              {t('Need a redemption code?')}{' '}
              <a
                href={topupLink}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 underline-offset-4 hover:underline'
              >
                {t('Get one here')}
                <ExternalLink className='h-3 w-3' />
              </a>
            </p>
          )}
        </div>
      ) : (
        <Alert className='border-t'>
          <AlertDescription>
            {t(
              'Redemption codes are disabled until the administrator confirms compliance terms.'
            )}
          </AlertDescription>
        </Alert>
      )}
    </TitledCard>
  )
}
