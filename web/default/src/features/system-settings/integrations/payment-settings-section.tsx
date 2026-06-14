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
import * as React from 'react'
import * as z from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  Bell,
  Calculator,
  Code2,
  Eye,
  FileSpreadsheet,
  QrCode,
  ShieldAlert,
  UploadCloud,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { RiskAcknowledgementDialog } from '@/components/risk-acknowledgement-dialog'
import { confirmPaymentCompliance } from '../api'
import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { AmountDiscountVisualEditor } from './amount-discount-visual-editor'
import { AmountOptionsVisualEditor } from './amount-options-visual-editor'
import { CreemProductsVisualEditor } from './creem-products-visual-editor'
import { PaymentMethodsVisualEditor } from './payment-methods-visual-editor'
import {
  formatJsonForEditor,
  getJsonError,
  normalizeJsonForComparison,
  removeTrailingSlash,
} from './utils'
import type { WaffoPancakeSettingsValues } from './waffo-pancake-settings-section'
import type { WaffoSettingsValues } from './waffo-settings-section'

const paymentSchema = z.object({
  PayAddress: z.string().refine((value) => {
    const trimmed = value.trim()
    if (!trimmed) return true
    return /^https?:\/\//.test(trimmed)
  }, 'Provide a valid callback URL starting with http:// or https://'),
  EpayId: z.string(),
  EpayKey: z.string(),
  Price: z.coerce.number().min(0),
  MinTopUp: z.coerce.number().min(0),
  CustomCallbackAddress: z.string().refine((value) => {
    const trimmed = value.trim()
    if (!trimmed) return true
    return /^https?:\/\//.test(trimmed)
  }, 'Provide a valid URL starting with http:// or https://'),
  PayMethods: z.string().superRefine((value, ctx) => {
    const error = getJsonError(value)
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      })
    }
  }),
  AmountOptions: z.string().superRefine((value, ctx) => {
    const error = getJsonError(value, (parsed) => Array.isArray(parsed))
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      })
    }
  }),
  AmountDiscount: z.string().superRefine((value, ctx) => {
    const error = getJsonError(
      value,
      (parsed) =>
        !!parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    )
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      })
    }
  }),
  PromptPayEnabled: z.boolean(),
  PromptPayMode: z.enum(['manual', 'automatic', 'both']),
  PromptPayAccountName: z.string(),
  PromptPayId: z.string(),
  PromptPayBankName: z.string(),
  PromptPayRate: z.coerce.number().min(0),
  PromptPayMinTopUp: z.coerce.number().min(0),
  PromptPayAmountOptions: z.string().superRefine((value, ctx) => {
    const error = getJsonError(value, (parsed) => Array.isArray(parsed))
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      })
    }
  }),
  PromptPaySlipProvider: z.enum(['manual', 'slipok', 'slipmate', 'custom']),
  PromptPaySlipApiURL: z.string().refine((value) => {
    const trimmed = value.trim()
    if (!trimmed) return true
    return /^https?:\/\//.test(trimmed)
  }, 'Provide a valid URL starting with http:// or https://'),
  PromptPaySlipApiKey: z.string(),
  PromptPayTelegramEnabled: z.boolean(),
  PromptPayTelegramBotSecret: z.string(),
  PromptPayTelegramChatId: z.string(),
  PromptPayLineEnabled: z.boolean(),
  PromptPayLineAccessSecret: z.string(),
  PromptPayLineGroupId: z.string(),
  PromptPayTransactionExport: z.boolean(),
  OtherPaymentEnabled: z.boolean(),
  OtherPaymentCurrency: z.string(),
  OtherPaymentRate: z.coerce.number().min(0),
  OtherPaymentMinTopUp: z.coerce.number().min(0),
  OtherPaymentAmountOptions: z.string().superRefine((value, ctx) => {
    const error = getJsonError(value, (parsed) => Array.isArray(parsed))
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      })
    }
  }),
  OtherPaymentMethods: z.string().superRefine((value, ctx) => {
    const error = getJsonError(value, (parsed) => Array.isArray(parsed))
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      })
    }
  }),
  OtherPaymentTelegramEnabled: z.boolean(),
  OtherPaymentTelegramBotSecret: z.string(),
  OtherPaymentTelegramChatId: z.string(),
  OtherPaymentLineEnabled: z.boolean(),
  OtherPaymentLineAccessSecret: z.string(),
  OtherPaymentLineGroupId: z.string(),
  OtherPaymentConfirmSecret: z.string(),
  StripeApiSecret: z.string(),
  StripeWebhookSecret: z.string(),
  StripePriceId: z.string(),
  StripeUnitPrice: z.coerce.number().min(0),
  StripeMinTopUp: z.coerce.number().min(0),
  StripePromotionCodesEnabled: z.boolean(),
  CreemApiKey: z.string(),
  CreemWebhookSecret: z.string(),
  CreemTestMode: z.boolean(),
  CreemProducts: z.string().superRefine((value, ctx) => {
    const error = getJsonError(value, (parsed) => Array.isArray(parsed))
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      })
    }
  }),
  WaffoEnabled: z.boolean(),
  WaffoApiKey: z.string(),
  WaffoPrivateKey: z.string(),
  WaffoPublicCert: z.string(),
  WaffoSandboxPublicCert: z.string(),
  WaffoSandboxApiKey: z.string(),
  WaffoSandboxPrivateKey: z.string(),
  WaffoSandbox: z.boolean(),
  WaffoMerchantId: z.string(),
  WaffoCurrency: z.string(),
  WaffoUnitPrice: z.coerce.number().min(0),
  WaffoMinTopUp: z.coerce.number().min(1),
  WaffoNotifyUrl: z.string(),
  WaffoReturnUrl: z.string(),
  WaffoPancakeMerchantID: z.string(),
  WaffoPancakePrivateKey: z.string(),
  WaffoPancakeReturnURL: z.string(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>
type PaymentBaseFormValues = Omit<
  PaymentFormValues,
  keyof WaffoSettingsValues | keyof WaffoPancakeSettingsValues
>

const CURRENT_COMPLIANCE_TERMS_VERSION = 'v1'

type PaymentComplianceDefaults = {
  confirmed: boolean
  termsVersion: string
  confirmedAt: number
  confirmedBy: number
}

type PaymentSettingsSectionProps = {
  defaultValues: PaymentBaseFormValues
  waffoDefaultValues: WaffoSettingsValues
  waffoPancakeDefaultValues: WaffoPancakeSettingsValues
  waffoPancakeProvisionedStoreID?: string
  waffoPancakeProvisionedProductID?: string
  complianceDefaults: PaymentComplianceDefaults
}

export function PaymentSettingsSection({
  defaultValues,
  waffoDefaultValues,
  waffoPancakeDefaultValues,
  complianceDefaults,
}: PaymentSettingsSectionProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const updateOption = useUpdateOption()
  const initialFormValues = React.useMemo<PaymentFormValues>(
    () => ({
      ...defaultValues,
      ...waffoDefaultValues,
      ...waffoPancakeDefaultValues,
    }),
    [defaultValues, waffoDefaultValues, waffoPancakeDefaultValues]
  )
  const initialRef = React.useRef(initialFormValues)
  const defaultsSignature = React.useMemo(
    () => JSON.stringify(initialFormValues),
    [initialFormValues]
  )

  const [payMethodsVisualMode, setPayMethodsVisualMode] = React.useState(true)
  const [amountOptionsVisualMode, setAmountOptionsVisualMode] =
    React.useState(true)
  const [amountDiscountVisualMode, setAmountDiscountVisualMode] =
    React.useState(true)
  const [creemProductsVisualMode, setCreemProductsVisualMode] =
    React.useState(true)
  const [showComplianceDialog, setShowComplianceDialog] = React.useState(false)
  const [promptPayExchange, setPromptPayExchange] = React.useState({
    paid: '100',
    credit: '300',
  })
  const [otherPaymentExchange, setOtherPaymentExchange] = React.useState({
    paid: '30000',
    credit: '30000',
  })

  const complianceStatements = React.useMemo(
    () => [
      t(
        'You have legally obtained authorization for the connected model APIs, accounts, keys, and quotas.'
      ),
      t(
        'You commit to using upstream APIs, accounts, keys, quotas, and service capabilities only within the scope of lawful authorization obtained from upstream service providers, model service providers, or relevant rights holders, and will not conduct unauthorized resale, trafficking, distribution, or other non-compliant commercialization.'
      ),
      t(
        'If you provide generative AI services to the public in mainland China, you will fulfill legal obligations including filing, security assessment, content safety, complaint handling, generated content labeling, log retention, and personal information protection.'
      ),
      t(
        'You commit not to use this system to implement, assist with, or indirectly implement acts that violate applicable laws and regulations, regulatory requirements, platform rules, public interests, or the lawful rights and interests of third parties.'
      ),
      t(
        'You understand and independently bear legal responsibility arising from deployment, operation, and charging behavior.'
      ),
      t(
        'You understand this compliance reminder is only for risk notice and does not constitute legal advice, a compliance review conclusion, or a guarantee of the legality of your use of this system; you should consult professional legal or compliance advisors based on your actual business scenario.'
      ),
    ],
    [t]
  )

  const complianceAgreementText = t(
    'I have read and understood the above compliance reminder, acknowledge the related legal risks, and confirm that I bear legal responsibility arising from deployment, operation, and charging behavior.'
  )

  const complianceConfirmed =
    complianceDefaults.confirmed &&
    complianceDefaults.termsVersion === CURRENT_COMPLIANCE_TERMS_VERSION
  const showLegacyPaymentGateways = false

  const confirmComplianceMutation = useMutation({
    mutationFn: confirmPaymentCompliance,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(t('Compliance confirmed successfully'))
        setShowComplianceDialog(false)
        queryClient.invalidateQueries({ queryKey: ['system-options'] })
      } else {
        toast.error(data.message || t('Failed to confirm compliance'))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t('Failed to confirm compliance'))
    },
  })

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as Resolver<PaymentFormValues>,
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      ...defaultValues,
      PayMethods: formatJsonForEditor(defaultValues.PayMethods),
      AmountOptions: formatJsonForEditor(defaultValues.AmountOptions),
      AmountDiscount: formatJsonForEditor(defaultValues.AmountDiscount),
      PromptPayAmountOptions: formatJsonForEditor(
        defaultValues.PromptPayAmountOptions
      ),
      OtherPaymentAmountOptions: formatJsonForEditor(
        defaultValues.OtherPaymentAmountOptions
      ),
      OtherPaymentMethods: formatJsonForEditor(
        defaultValues.OtherPaymentMethods
      ),
      CreemProducts: formatJsonForEditor(defaultValues.CreemProducts),
    },
  })

  React.useEffect(() => {
    const parsedDefaults = JSON.parse(defaultsSignature) as PaymentFormValues
    initialRef.current = parsedDefaults
    form.reset({
      ...parsedDefaults,
      PayMethods: formatJsonForEditor(parsedDefaults.PayMethods),
      AmountOptions: formatJsonForEditor(parsedDefaults.AmountOptions),
      AmountDiscount: formatJsonForEditor(parsedDefaults.AmountDiscount),
      PromptPayAmountOptions: formatJsonForEditor(
        parsedDefaults.PromptPayAmountOptions
      ),
      OtherPaymentAmountOptions: formatJsonForEditor(
        parsedDefaults.OtherPaymentAmountOptions
      ),
      OtherPaymentMethods: formatJsonForEditor(
        parsedDefaults.OtherPaymentMethods
      ),
      CreemProducts: formatJsonForEditor(parsedDefaults.CreemProducts),
    })
  }, [defaultsSignature, form])

  const applyExchangeRate = (
    paid: string,
    credit: string,
    fieldName: 'PromptPayRate' | 'OtherPaymentRate'
  ) => {
    const paidAmount = Number(paid)
    const creditAmount = Number(credit)

    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      toast.error(t('Enter a valid transfer amount'))
      return
    }

    if (!Number.isFinite(creditAmount) || creditAmount < 0) {
      toast.error(t('Enter a valid credit amount'))
      return
    }

    const nextRate = Number((creditAmount / paidAmount).toFixed(8))
    form.setValue(fieldName, nextRate, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    toast.success(t('Exchange rate updated'))
  }

  const saveGeneralSettings = async () => {
    const values = form.getValues()
    const sanitized = {
      PayAddress: removeTrailingSlash(values.PayAddress),
      EpayId: values.EpayId.trim(),
      EpayKey: values.EpayKey.trim(),
      Price: values.Price,
      MinTopUp: values.MinTopUp,
      CustomCallbackAddress: removeTrailingSlash(values.CustomCallbackAddress),
      PayMethods: values.PayMethods.trim(),
      AmountOptions: values.AmountOptions.trim(),
      AmountDiscount: values.AmountDiscount.trim(),
    }

    const initial = {
      PayAddress: removeTrailingSlash(initialRef.current.PayAddress),
      EpayId: initialRef.current.EpayId.trim(),
      EpayKey: initialRef.current.EpayKey.trim(),
      Price: initialRef.current.Price,
      MinTopUp: initialRef.current.MinTopUp,
      CustomCallbackAddress: removeTrailingSlash(
        initialRef.current.CustomCallbackAddress
      ),
      PayMethods: initialRef.current.PayMethods.trim(),
      AmountOptions: initialRef.current.AmountOptions.trim(),
      AmountDiscount: initialRef.current.AmountDiscount.trim(),
    }

    const updates: Array<{ key: string; value: string | number | boolean }> = []

    if (sanitized.PayAddress !== initial.PayAddress) {
      updates.push({ key: 'PayAddress', value: sanitized.PayAddress })
    }

    if (sanitized.EpayId !== initial.EpayId) {
      updates.push({ key: 'EpayId', value: sanitized.EpayId })
    }

    if (sanitized.EpayKey && sanitized.EpayKey !== initial.EpayKey) {
      updates.push({ key: 'EpayKey', value: sanitized.EpayKey })
    }

    if (sanitized.Price !== initial.Price) {
      updates.push({ key: 'Price', value: sanitized.Price })
    }

    if (sanitized.MinTopUp !== initial.MinTopUp) {
      updates.push({ key: 'MinTopUp', value: sanitized.MinTopUp })
    }

    if (sanitized.CustomCallbackAddress !== initial.CustomCallbackAddress) {
      updates.push({
        key: 'CustomCallbackAddress',
        value: sanitized.CustomCallbackAddress,
      })
    }

    if (
      normalizeJsonForComparison(sanitized.PayMethods) !==
      normalizeJsonForComparison(initial.PayMethods)
    ) {
      updates.push({ key: 'PayMethods', value: sanitized.PayMethods })
    }

    if (
      normalizeJsonForComparison(sanitized.AmountOptions) !==
      normalizeJsonForComparison(initial.AmountOptions)
    ) {
      updates.push({
        key: 'payment_setting.amount_options',
        value: sanitized.AmountOptions,
      })
    }

    if (
      normalizeJsonForComparison(sanitized.AmountDiscount) !==
      normalizeJsonForComparison(initial.AmountDiscount)
    ) {
      updates.push({
        key: 'payment_setting.amount_discount',
        value: sanitized.AmountDiscount,
      })
    }

    if (updates.length === 0) {
      return
    }

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }

    await savePromptPaySettings()
  }

  const savePromptPaySettings = async () => {
    const values = form.getValues()
    const sanitized = {
      PromptPayEnabled: values.PromptPayEnabled as boolean,
      PromptPayMode: values.PromptPayMode,
      PromptPayAccountName: values.PromptPayAccountName.trim(),
      PromptPayId: values.PromptPayId.trim(),
      PromptPayBankName: values.PromptPayBankName.trim(),
      PromptPayRate: values.PromptPayRate as number,
      PromptPayMinTopUp: values.PromptPayMinTopUp as number,
      PromptPayAmountOptions: values.PromptPayAmountOptions.trim(),
      PromptPaySlipProvider: values.PromptPaySlipProvider,
      PromptPaySlipApiURL: removeTrailingSlash(values.PromptPaySlipApiURL),
      PromptPaySlipApiKey: values.PromptPaySlipApiKey.trim(),
      PromptPayTelegramEnabled: values.PromptPayTelegramEnabled as boolean,
      PromptPayTelegramBotSecret: values.PromptPayTelegramBotSecret.trim(),
      PromptPayTelegramChatId: values.PromptPayTelegramChatId.trim(),
      PromptPayLineEnabled: values.PromptPayLineEnabled as boolean,
      PromptPayLineAccessSecret: values.PromptPayLineAccessSecret.trim(),
      PromptPayLineGroupId: values.PromptPayLineGroupId.trim(),
      PromptPayTransactionExport: values.PromptPayTransactionExport as boolean,
    }

    const initial = {
      PromptPayEnabled: initialRef.current.PromptPayEnabled,
      PromptPayMode: initialRef.current.PromptPayMode,
      PromptPayAccountName: initialRef.current.PromptPayAccountName.trim(),
      PromptPayId: initialRef.current.PromptPayId.trim(),
      PromptPayBankName: initialRef.current.PromptPayBankName.trim(),
      PromptPayRate: initialRef.current.PromptPayRate,
      PromptPayMinTopUp: initialRef.current.PromptPayMinTopUp,
      PromptPayAmountOptions: initialRef.current.PromptPayAmountOptions.trim(),
      PromptPaySlipProvider: initialRef.current.PromptPaySlipProvider,
      PromptPaySlipApiURL: removeTrailingSlash(
        initialRef.current.PromptPaySlipApiURL
      ),
      PromptPaySlipApiKey: initialRef.current.PromptPaySlipApiKey.trim(),
      PromptPayTelegramEnabled: initialRef.current.PromptPayTelegramEnabled,
      PromptPayTelegramBotSecret:
        initialRef.current.PromptPayTelegramBotSecret.trim(),
      PromptPayTelegramChatId:
        initialRef.current.PromptPayTelegramChatId.trim(),
      PromptPayLineEnabled: initialRef.current.PromptPayLineEnabled,
      PromptPayLineAccessSecret:
        initialRef.current.PromptPayLineAccessSecret.trim(),
      PromptPayLineGroupId: initialRef.current.PromptPayLineGroupId.trim(),
      PromptPayTransactionExport: initialRef.current.PromptPayTransactionExport,
    }

    const updates: Array<{ key: string; value: string | number | boolean }> = []
    const addScalar = (
      key: keyof typeof sanitized,
      optionKey: string,
      secret = false
    ) => {
      const nextValue = sanitized[key]
      const initialValue = initial[key]
      if (secret && typeof nextValue === 'string' && !nextValue) {
        return
      }
      if (nextValue !== initialValue) {
        updates.push({ key: optionKey, value: nextValue })
      }
    }

    addScalar('PromptPayEnabled', 'payment_setting.promptpay_enabled')
    addScalar('PromptPayMode', 'payment_setting.promptpay_mode')
    addScalar('PromptPayAccountName', 'payment_setting.promptpay_account_name')
    addScalar('PromptPayId', 'payment_setting.promptpay_id')
    addScalar('PromptPayBankName', 'payment_setting.promptpay_bank_name')
    addScalar('PromptPayRate', 'payment_setting.promptpay_rate')
    addScalar('PromptPayMinTopUp', 'payment_setting.promptpay_min_topup')

    if (
      normalizeJsonForComparison(sanitized.PromptPayAmountOptions) !==
      normalizeJsonForComparison(initial.PromptPayAmountOptions)
    ) {
      updates.push({
        key: 'payment_setting.promptpay_amount_options',
        value: sanitized.PromptPayAmountOptions,
      })
    }

    addScalar(
      'PromptPaySlipProvider',
      'payment_setting.promptpay_slip_provider'
    )
    addScalar('PromptPaySlipApiURL', 'payment_setting.promptpay_slip_api_url')
    addScalar(
      'PromptPaySlipApiKey',
      'payment_setting.promptpay_slip_api_key',
      true
    )
    addScalar(
      'PromptPayTelegramEnabled',
      'payment_setting.promptpay_telegram_enabled'
    )
    addScalar(
      'PromptPayTelegramBotSecret',
      'payment_setting.promptpay_telegram_bot_secret',
      true
    )
    addScalar(
      'PromptPayTelegramChatId',
      'payment_setting.promptpay_telegram_chat_id'
    )
    addScalar('PromptPayLineEnabled', 'payment_setting.promptpay_line_enabled')
    addScalar(
      'PromptPayLineAccessSecret',
      'payment_setting.promptpay_line_access_secret',
      true
    )
    addScalar('PromptPayLineGroupId', 'payment_setting.promptpay_line_group_id')
    addScalar(
      'PromptPayTransactionExport',
      'payment_setting.promptpay_transaction_export'
    )

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }
  }

  const saveOtherPaymentSettings = async () => {
    const values = form.getValues()
    const sanitized = {
      OtherPaymentEnabled: values.OtherPaymentEnabled as boolean,
      OtherPaymentCurrency: 'LAK',
      OtherPaymentRate: values.OtherPaymentRate as number,
      OtherPaymentMinTopUp: values.OtherPaymentMinTopUp as number,
      OtherPaymentAmountOptions: values.OtherPaymentAmountOptions.trim(),
      OtherPaymentMethods: values.OtherPaymentMethods.trim(),
      OtherPaymentTelegramEnabled:
        values.OtherPaymentTelegramEnabled as boolean,
      OtherPaymentTelegramBotSecret:
        values.OtherPaymentTelegramBotSecret.trim(),
      OtherPaymentTelegramChatId: values.OtherPaymentTelegramChatId.trim(),
      OtherPaymentLineEnabled: values.OtherPaymentLineEnabled as boolean,
      OtherPaymentLineAccessSecret:
        values.OtherPaymentLineAccessSecret.trim(),
      OtherPaymentLineGroupId: values.OtherPaymentLineGroupId.trim(),
      OtherPaymentConfirmSecret: values.OtherPaymentConfirmSecret.trim(),
    }

    const initial = {
      OtherPaymentEnabled: initialRef.current.OtherPaymentEnabled,
      OtherPaymentCurrency: 'LAK',
      OtherPaymentRate: initialRef.current.OtherPaymentRate,
      OtherPaymentMinTopUp: initialRef.current.OtherPaymentMinTopUp,
      OtherPaymentAmountOptions:
        initialRef.current.OtherPaymentAmountOptions.trim(),
      OtherPaymentMethods: initialRef.current.OtherPaymentMethods.trim(),
      OtherPaymentTelegramEnabled:
        initialRef.current.OtherPaymentTelegramEnabled,
      OtherPaymentTelegramBotSecret:
        initialRef.current.OtherPaymentTelegramBotSecret.trim(),
      OtherPaymentTelegramChatId:
        initialRef.current.OtherPaymentTelegramChatId.trim(),
      OtherPaymentLineEnabled: initialRef.current.OtherPaymentLineEnabled,
      OtherPaymentLineAccessSecret:
        initialRef.current.OtherPaymentLineAccessSecret.trim(),
      OtherPaymentLineGroupId: initialRef.current.OtherPaymentLineGroupId.trim(),
      OtherPaymentConfirmSecret:
        initialRef.current.OtherPaymentConfirmSecret.trim(),
    }

    const updates: Array<{ key: string; value: string | number | boolean }> = []
    const addScalar = (
      key: keyof typeof sanitized,
      optionKey: string,
      secret = false
    ) => {
      const nextValue = sanitized[key]
      const initialValue = initial[key]
      if (secret && typeof nextValue === 'string' && !nextValue) {
        return
      }
      if (nextValue !== initialValue) {
        updates.push({ key: optionKey, value: nextValue })
      }
    }

    addScalar('OtherPaymentEnabled', 'payment_setting.other_payment_enabled')
    addScalar('OtherPaymentCurrency', 'payment_setting.other_payment_currency')
    addScalar('OtherPaymentRate', 'payment_setting.other_payment_rate')
    addScalar('OtherPaymentMinTopUp', 'payment_setting.other_payment_min_topup')

    if (
      normalizeJsonForComparison(sanitized.OtherPaymentAmountOptions) !==
      normalizeJsonForComparison(initial.OtherPaymentAmountOptions)
    ) {
      updates.push({
        key: 'payment_setting.other_payment_amount_options',
        value: sanitized.OtherPaymentAmountOptions,
      })
    }

    if (
      normalizeJsonForComparison(sanitized.OtherPaymentMethods) !==
      normalizeJsonForComparison(initial.OtherPaymentMethods)
    ) {
      updates.push({
        key: 'payment_setting.other_payment_methods',
        value: sanitized.OtherPaymentMethods,
      })
    }

    addScalar(
      'OtherPaymentTelegramEnabled',
      'payment_setting.other_payment_telegram_enabled'
    )
    addScalar(
      'OtherPaymentTelegramBotSecret',
      'payment_setting.other_payment_telegram_bot_secret',
      true
    )
    addScalar(
      'OtherPaymentTelegramChatId',
      'payment_setting.other_payment_telegram_chat_id'
    )
    addScalar(
      'OtherPaymentLineEnabled',
      'payment_setting.other_payment_line_enabled'
    )
    addScalar(
      'OtherPaymentLineAccessSecret',
      'payment_setting.other_payment_line_access_secret',
      true
    )
    addScalar(
      'OtherPaymentLineGroupId',
      'payment_setting.other_payment_line_group_id'
    )
    addScalar(
      'OtherPaymentConfirmSecret',
      'payment_setting.other_payment_confirm_secret',
      true
    )

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }
  }

  const saveEpaySettings = async () => {
    const values = form.getValues()
    const sanitized = {
      PayAddress: removeTrailingSlash(values.PayAddress),
      EpayId: values.EpayId.trim(),
      EpayKey: values.EpayKey.trim(),
      CustomCallbackAddress: removeTrailingSlash(values.CustomCallbackAddress),
    }

    const initial = {
      PayAddress: removeTrailingSlash(initialRef.current.PayAddress),
      EpayId: initialRef.current.EpayId.trim(),
      EpayKey: initialRef.current.EpayKey.trim(),
      CustomCallbackAddress: removeTrailingSlash(
        initialRef.current.CustomCallbackAddress
      ),
    }

    const updates: Array<{ key: string; value: string }> = []

    if (sanitized.PayAddress !== initial.PayAddress) {
      updates.push({ key: 'PayAddress', value: sanitized.PayAddress })
    }

    if (sanitized.EpayId !== initial.EpayId) {
      updates.push({ key: 'EpayId', value: sanitized.EpayId })
    }

    if (sanitized.EpayKey && sanitized.EpayKey !== initial.EpayKey) {
      updates.push({ key: 'EpayKey', value: sanitized.EpayKey })
    }

    if (sanitized.CustomCallbackAddress !== initial.CustomCallbackAddress) {
      updates.push({
        key: 'CustomCallbackAddress',
        value: sanitized.CustomCallbackAddress,
      })
    }

    if (updates.length === 0) {
      return
    }

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }
  }

  const saveStripeSettings = async () => {
    const values = form.getValues()
    const sanitized = {
      StripeApiSecret: values.StripeApiSecret.trim(),
      StripeWebhookSecret: values.StripeWebhookSecret.trim(),
      StripePriceId: values.StripePriceId.trim(),
      StripeUnitPrice: values.StripeUnitPrice as number,
      StripeMinTopUp: values.StripeMinTopUp as number,
      StripePromotionCodesEnabled:
        values.StripePromotionCodesEnabled as boolean,
    }

    const initial = {
      StripeApiSecret: initialRef.current.StripeApiSecret.trim(),
      StripeWebhookSecret: initialRef.current.StripeWebhookSecret.trim(),
      StripePriceId: initialRef.current.StripePriceId.trim(),
      StripeUnitPrice: initialRef.current.StripeUnitPrice,
      StripeMinTopUp: initialRef.current.StripeMinTopUp,
      StripePromotionCodesEnabled:
        initialRef.current.StripePromotionCodesEnabled,
    }

    const updates: Array<{ key: string; value: string | number | boolean }> = []

    if (
      sanitized.StripeApiSecret &&
      sanitized.StripeApiSecret !== initial.StripeApiSecret
    ) {
      updates.push({ key: 'StripeApiSecret', value: sanitized.StripeApiSecret })
    }

    if (
      sanitized.StripeWebhookSecret &&
      sanitized.StripeWebhookSecret !== initial.StripeWebhookSecret
    ) {
      updates.push({
        key: 'StripeWebhookSecret',
        value: sanitized.StripeWebhookSecret,
      })
    }

    if (sanitized.StripePriceId !== initial.StripePriceId) {
      updates.push({ key: 'StripePriceId', value: sanitized.StripePriceId })
    }

    if (sanitized.StripeUnitPrice !== initial.StripeUnitPrice) {
      updates.push({ key: 'StripeUnitPrice', value: sanitized.StripeUnitPrice })
    }

    if (sanitized.StripeMinTopUp !== initial.StripeMinTopUp) {
      updates.push({ key: 'StripeMinTopUp', value: sanitized.StripeMinTopUp })
    }

    if (
      sanitized.StripePromotionCodesEnabled !==
      initial.StripePromotionCodesEnabled
    ) {
      updates.push({
        key: 'StripePromotionCodesEnabled',
        value: sanitized.StripePromotionCodesEnabled,
      })
    }

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }
  }

  const saveCreemSettings = async () => {
    const values = form.getValues()
    const sanitized = {
      CreemApiKey: values.CreemApiKey.trim(),
      CreemWebhookSecret: values.CreemWebhookSecret.trim(),
      CreemTestMode: values.CreemTestMode as boolean,
      CreemProducts: values.CreemProducts.trim(),
    }
    const initial = {
      CreemApiKey: initialRef.current.CreemApiKey.trim(),
      CreemWebhookSecret: initialRef.current.CreemWebhookSecret.trim(),
      CreemTestMode: initialRef.current.CreemTestMode,
      CreemProducts: initialRef.current.CreemProducts.trim(),
    }
    const updates: Array<{ key: string; value: string | boolean }> = []

    if (
      sanitized.CreemApiKey &&
      sanitized.CreemApiKey !== initial.CreemApiKey
    ) {
      updates.push({ key: 'CreemApiKey', value: sanitized.CreemApiKey })
    }
    if (
      sanitized.CreemWebhookSecret &&
      sanitized.CreemWebhookSecret !== initial.CreemWebhookSecret
    ) {
      updates.push({
        key: 'CreemWebhookSecret',
        value: sanitized.CreemWebhookSecret,
      })
    }
    if (sanitized.CreemTestMode !== initial.CreemTestMode) {
      updates.push({ key: 'CreemTestMode', value: sanitized.CreemTestMode })
    }
    if (
      normalizeJsonForComparison(sanitized.CreemProducts) !==
      normalizeJsonForComparison(initial.CreemProducts)
    ) {
      updates.push({ key: 'CreemProducts', value: sanitized.CreemProducts })
    }

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }
  }

  return (
    <SettingsSection title={t('Payment Gateway')}>
      {!complianceConfirmed ? (
        <Alert variant='destructive' className='mb-6'>
          <ShieldAlert className='h-4 w-4' />
          <AlertTitle>{t('Compliance confirmation required')}</AlertTitle>
          <AlertDescription>
            <div className='space-y-3'>
              <p>
                {t(
                  'Payment, redemption codes, subscription plans, and invitation rewards are locked until the root administrator confirms the compliance terms.'
                )}
              </p>
              <ol className='list-decimal space-y-1 pl-5'>
                {complianceStatements.map((statement) => (
                  <li key={statement}>{statement}</li>
                ))}
              </ol>
            </div>
          </AlertDescription>
          <AlertAction>
            <Button
              type='button'
              size='sm'
              variant='destructive'
              onClick={() => setShowComplianceDialog(true)}
            >
              {t('Confirm compliance')}
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <Alert className='mb-6'>
          <AlertTitle>{t('Compliance confirmed')}</AlertTitle>
          <AlertDescription>
            {t('Confirmed at {{time}} by user #{{userId}}', {
              time: complianceDefaults.confirmedAt
                ? new Date(
                    complianceDefaults.confirmedAt * 1000
                  ).toLocaleString()
                : '-',
              userId: complianceDefaults.confirmedBy || '-',
            })}
          </AlertDescription>
        </Alert>
      )}

      <RiskAcknowledgementDialog
        open={showComplianceDialog}
        onOpenChange={setShowComplianceDialog}
        title={t('Confirm compliance terms')}
        description={t(
          'This confirmation unlocks payment, redemption code, subscription plan, and invitation reward features. Please read the statements carefully.'
        )}
        items={complianceStatements}
        checklist={[complianceAgreementText]}
        confirmText={t('Confirm and enable')}
        isLoading={confirmComplianceMutation.isPending}
        onConfirm={() => confirmComplianceMutation.mutate()}
      />

      <Form {...form}>
        <SettingsForm
          onSubmit={(event) => event.preventDefault()}
          className={cn(
            'gap-y-8',
            !complianceConfirmed && 'pointer-events-none opacity-40'
          )}
          data-no-autosubmit='true'
        >
          {showLegacyPaymentGateways && (
            <div className='space-y-4'>
              <div>
                <h3 className='text-lg font-medium'>{t('General Settings')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t('Shared configuration for all payment gateways')}
                </p>
              </div>

              <div className='grid gap-6 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='Price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Price (local currency / USD)')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          min={0}
                          value={(field.value ?? 0) as number}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'How much to charge for each US dollar of balance (Epay)'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='MinTopUp'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Minimum top-up (USD)')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          min={0}
                          value={(field.value ?? 0) as number}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Smallest USD amount users can recharge (Epay)')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='PayMethods'
                render={({ field }) => (
                  <FormItem>
                    <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                      <FormLabel>{t('Payment methods')}</FormLabel>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setPayMethodsVisualMode(!payMethodsVisualMode)
                        }
                        className='w-full sm:w-auto'
                      >
                        {payMethodsVisualMode ? (
                          <>
                            <Code2 className='mr-2 h-3 w-3' />
                            {t('JSON Editor')}
                          </>
                        ) : (
                          <>
                            <Eye className='mr-2 h-3 w-3' />
                            {t('Visual Editor')}
                          </>
                        )}
                      </Button>
                    </div>
                    <FormControl>
                      {payMethodsVisualMode ? (
                        <PaymentMethodsVisualEditor
                          value={field.value}
                          onChange={field.onChange}
                        />
                      ) : (
                        <Textarea
                          rows={4}
                          placeholder={t(
                            '[{"name":"支付宝","type":"alipay","color":"#1677FF"}]'
                          )}
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Configure available payment methods. Provide a JSON array.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid gap-6 md:grid-cols-2 md:items-start'>
                <FormField
                  control={form.control}
                  name='AmountOptions'
                  render={({ field }) => (
                    <FormItem>
                      <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                        <FormLabel>{t('Top-up amount options')}</FormLabel>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setAmountOptionsVisualMode(!amountOptionsVisualMode)
                          }
                          className='w-full sm:w-auto'
                        >
                          {amountOptionsVisualMode ? (
                            <>
                              <Code2 className='mr-2 h-3 w-3' />
                              {t('JSON Editor')}
                            </>
                          ) : (
                            <>
                              <Eye className='mr-2 h-3 w-3' />
                              {t('Visual Editor')}
                            </>
                          )}
                        </Button>
                      </div>
                      <FormControl>
                        {amountOptionsVisualMode ? (
                          <AmountOptionsVisualEditor
                            value={field.value}
                            onChange={field.onChange}
                          />
                        ) : (
                          <Textarea
                            rows={4}
                            placeholder='[10, 20, 50, 100]'
                            {...field}
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
                          />
                        )}
                      </FormControl>
                      <FormDescription>
                        {t('Preset recharge amounts (JSON array)')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='AmountDiscount'
                  render={({ field }) => (
                    <FormItem>
                      <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                        <FormLabel>{t('Amount discount')}</FormLabel>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setAmountDiscountVisualMode(
                              !amountDiscountVisualMode
                            )
                          }
                          className='w-full sm:w-auto'
                        >
                          {amountDiscountVisualMode ? (
                            <>
                              <Code2 className='mr-2 h-3 w-3' />
                              {t('JSON Editor')}
                            </>
                          ) : (
                            <>
                              <Eye className='mr-2 h-3 w-3' />
                              {t('Visual Editor')}
                            </>
                          )}
                        </Button>
                      </div>
                      <FormControl>
                        {amountDiscountVisualMode ? (
                          <AmountDiscountVisualEditor
                            value={field.value}
                            onChange={field.onChange}
                          />
                        ) : (
                          <Textarea
                            rows={4}
                            placeholder='{"100":0.95,"200":0.9}'
                            {...field}
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
                          />
                        )}
                      </FormControl>
                      <FormDescription>
                        {t('Discount map by recharge amount (JSON object)')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  saveGeneralSettings()
                }}
                disabled={updateOption.isPending}
              >
                {updateOption.isPending
                  ? t('Saving...')
                  : t('Save general settings')}
              </Button>
            </div>
          )}

          {showLegacyPaymentGateways && <Separator />}

          <div className='space-y-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div>
                <h3 className='flex items-center gap-2 text-lg font-medium'>
                  <QrCode className='h-5 w-5' />
                  {t('Thai PromptPay / Bank Transfer')}
                </h3>
                <p className='text-muted-foreground text-sm'>
                  {t(
                    'Design the Thai bank transfer flow for PromptPay QR, slip upload, manager review, notifications, and transaction export.'
                  )}
                </p>
              </div>
              <FormField
                control={form.control}
                name='PromptPayEnabled'
                render={({ field }) => (
                  <FormItem className='flex min-w-56 flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel>{t('Enable PromptPay')}</FormLabel>
                      <FormDescription>
                        {t('Show this transfer method to members later')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Alert>
              <Banknote className='h-4 w-4' />
              <AlertTitle>{t('Phase 1 design settings')}</AlertTitle>
              <AlertDescription>
                {t(
                  'These settings prepare the manager payment design. Member QR generation, slip upload, auto verification, credit settlement, and transaction pages will be connected after you confirm this layout.'
                )}
              </AlertDescription>
            </Alert>

            <div className='grid gap-6 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='PromptPayMode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Verification mode')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select mode')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          <SelectItem value='manual'>
                            {t('Manual approval only')}
                          </SelectItem>
                          <SelectItem value='automatic'>
                            {t('Automatic slip verification only')}
                          </SelectItem>
                          <SelectItem value='both'>
                            {t('Automatic first, manual fallback')}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(
                        'Manual means manager approves slips; automatic means a slip verification API can credit members after a valid check.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='PromptPaySlipProvider'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Slip verification provider')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select provider')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          <SelectItem value='manual'>
                            {t('Manual / no API yet')}
                          </SelectItem>
                          <SelectItem value='slipok'>SlipOK</SelectItem>
                          <SelectItem value='slipmate'>Slipmate</SelectItem>
                          <SelectItem value='custom'>
                            {t('Custom API')}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(
                        'The provider will be used later to check slip QR/reference against bank data.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-6 md:grid-cols-3'>
              <FormField
                control={form.control}
                name='PromptPayAccountName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Receiving account name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('Account holder name')}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Shown on the member top-up page')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='PromptPayId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('PromptPay ID')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('Phone, national ID, or tax ID')}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Used to generate the member QR code later')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='PromptPayBankName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Receiving bank')}</FormLabel>
                    <FormControl>
                      <Input
                        list='promptpay-bank-options'
                        placeholder={t('Kasikorn Bank')}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <datalist id='promptpay-bank-options'>
                      <option value='กรุงเทพ (Bangkok Bank)' />
                      <option value='กสิกรไทย (Kasikorn Bank)' />
                      <option value='กรุงไทย (Krungthai Bank)' />
                      <option value='ทหารไทยธนชาต (TMBThanachart Bank)' />
                      <option value='ไทยพาณิชย์ (Siam Commercial Bank)' />
                      <option value='กรุงศรีอยุธยา (Bank of Ayudhya)' />
                      <option value='ออมสิน (Government Savings Bank)' />
                      <option value='เกียรตินาคินภัทร (Kiatnakin Phatra Bank)' />
                    </datalist>
                    <FormDescription>
                      {t('Displayed beside the QR and slip upload form')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-6 md:grid-cols-3'>
              <FormField
                control={form.control}
                name='PromptPayRate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Credit rate per THB')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        min={0}
                        value={(field.value ?? 0) as number}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Example: 1 THB = 3 credits')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='PromptPayMinTopUp'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Minimum transfer amount (THB)')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        min={0}
                        value={(field.value ?? 0) as number}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Smallest bank transfer amount members can submit')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='PromptPayAmountOptions'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Suggested transfer amounts')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder='[50,100,300,500,1000]'
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Preset THB amounts shown on the member page')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='rounded-lg border p-4'>
              <div className='mb-4 flex items-start gap-3'>
                <Calculator className='text-primary mt-0.5 h-5 w-5' />
                <div>
                  <div className='font-medium'>
                    {t('Exchange rate calculator')}
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    {t(
                      'Enter the transfer amount and the credit members should receive, then apply the calculated rate.'
                    )}
                  </p>
                </div>
              </div>
              <div className='grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end'>
                <FormItem>
                  <FormLabel>{t('Member pays (THB)')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min={0}
                      value={promptPayExchange.paid}
                      onChange={(event) =>
                        setPromptPayExchange((current) => ({
                          ...current,
                          paid: event.target.value,
                        }))
                      }
                    />
                  </FormControl>
                </FormItem>
                <FormItem>
                  <FormLabel>{t('Member receives credits')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min={0}
                      value={promptPayExchange.credit}
                      onChange={(event) =>
                        setPromptPayExchange((current) => ({
                          ...current,
                          credit: event.target.value,
                        }))
                      }
                    />
                  </FormControl>
                </FormItem>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() =>
                    applyExchangeRate(
                      promptPayExchange.paid,
                      promptPayExchange.credit,
                      'PromptPayRate'
                    )
                  }
                >
                  {t('Apply exchange rate')}
                </Button>
              </div>
            </div>

            <div className='grid gap-6 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='PromptPaySlipApiURL'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Slip verification API URL')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('https://api.example.com/verify-slip')}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Leave blank while using manual approval')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='PromptPaySlipApiKey'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Slip verification API key')}</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={t('Enter new key to update')}
                        autoComplete='new-password'
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Leave blank unless rotating the secret')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid gap-4 lg:grid-cols-3'>
              <FormField
                control={form.control}
                name='PromptPayTelegramEnabled'
                render={({ field }) => (
                  <FormItem className='rounded-lg border p-4'>
                    <div className='mb-4 flex items-center justify-between'>
                      <div>
                        <FormLabel className='flex items-center gap-2 text-base'>
                          <Bell className='h-4 w-4' />
                          {t('Telegram notifications')}
                        </FormLabel>
                        <FormDescription>
                          {t('Send every transfer to a Telegram group')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <div className='space-y-3'>
                      <FormField
                        control={form.control}
                        name='PromptPayTelegramBotSecret'
                        render={({ field: tokenField }) => (
                          <FormItem>
                            <FormLabel>{t('Bot token')}</FormLabel>
                            <FormControl>
                              <Input
                                type='password'
                                autoComplete='new-password'
                                placeholder={t('Enter new token to update')}
                                {...tokenField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='PromptPayTelegramChatId'
                        render={({ field: chatField }) => (
                          <FormItem>
                            <FormLabel>{t('Group chat ID')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder='-100xxxxxxxxxx'
                                {...chatField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='PromptPayLineEnabled'
                render={({ field }) => (
                  <FormItem className='rounded-lg border p-4'>
                    <div className='mb-4 flex items-center justify-between'>
                      <div>
                        <FormLabel className='flex items-center gap-2 text-base'>
                          <Bell className='h-4 w-4' />
                          {t('LINE group notifications')}
                        </FormLabel>
                        <FormDescription>
                          {t('Use LINE Messaging API, not LINE Notify')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <div className='space-y-3'>
                      <FormField
                        control={form.control}
                        name='PromptPayLineAccessSecret'
                        render={({ field: tokenField }) => (
                          <FormItem>
                            <FormLabel>{t('Channel access token')}</FormLabel>
                            <FormControl>
                              <Input
                                type='password'
                                autoComplete='new-password'
                                placeholder={t('Enter new token to update')}
                                {...tokenField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='PromptPayLineGroupId'
                        render={({ field: groupField }) => (
                          <FormItem>
                            <FormLabel>{t('LINE group ID')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder='Cxxxxxxxxxxxxxxxx'
                                {...groupField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='PromptPayTransactionExport'
                render={({ field }) => (
                  <FormItem className='flex flex-col justify-between rounded-lg border p-4'>
                    <div className='space-y-2'>
                      <FormLabel className='flex items-center gap-2 text-base'>
                        <FileSpreadsheet className='h-4 w-4' />
                        {t('Transaction export')}
                      </FormLabel>
                      <FormDescription>
                        {t(
                          'Keep every PromptPay transaction ready for CSV or Excel export from the manager page.'
                        )}
                      </FormDescription>
                    </div>
                    <div className='mt-6 flex items-center justify-between'>
                      <span className='text-muted-foreground text-sm'>
                        {t('Export enabled')}
                      </span>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className='bg-muted/30 grid gap-4 rounded-lg border p-4 md:grid-cols-4'>
              {[
                {
                  icon: QrCode,
                  title: t('Member enters THB'),
                  description: t('The member page creates a PromptPay QR.'),
                },
                {
                  icon: UploadCloud,
                  title: t('Member uploads slip'),
                  description: t('Slip image and bank name are saved.'),
                },
                {
                  icon: Banknote,
                  title: t('Verify or approve'),
                  description: t(
                    'API verifies first, manager reviews fallback.'
                  ),
                },
                {
                  icon: Bell,
                  title: t('Notify and export'),
                  description: t('Telegram/LINE receives the transaction log.'),
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className='space-y-2'>
                    <Icon className='text-primary h-5 w-5' />
                    <div className='font-medium'>{item.title}</div>
                    <p className='text-muted-foreground text-sm'>
                      {item.description}
                    </p>
                  </div>
                )
              })}
            </div>

            <Button
              type='button'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                savePromptPaySettings()
              }}
              disabled={updateOption.isPending}
            >
              {updateOption.isPending
                ? t('Saving...')
                : t('Save PromptPay settings')}
            </Button>
          </div>

          <Separator />

          <div className='space-y-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div>
                <h3 className='flex items-center gap-2 text-lg font-medium'>
                  <Banknote className='h-5 w-5' />
                  {t('Other Payment')}
                </h3>
                <p className='text-muted-foreground text-sm'>
                  {t(
                    'Separate Laos manual payment flow. Currency is fixed to LAK; members upload slips and admins approve manually or through bot confirmation.'
                  )}
                </p>
              </div>
              <FormField
                control={form.control}
                name='OtherPaymentEnabled'
                render={({ field }) => (
                  <SettingsSwitchItem className='min-w-56'>
                    <SettingsSwitchContent>
                      <FormLabel>{t('Enable Other Payment')}</FormLabel>
                      <FormDescription>
                        {t('Show Laos payment to members')}
                      </FormDescription>
                    </SettingsSwitchContent>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </SettingsSwitchItem>
                )}
              />
            </div>

            <Alert>
              <Bell className='h-4 w-4' />
              <AlertTitle>{t('Bot approval ready')}</AlertTitle>
              <AlertDescription>
                {t(
                  'Telegram can approve by replying 1 to the bot message. LINE can approve by sending 1 plus the trade number shown in the notification.'
                )}
              </AlertDescription>
            </Alert>

            <div className='grid gap-6 md:grid-cols-4'>
              <FormField
                control={form.control}
                name='OtherPaymentCurrency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Currency')}</FormLabel>
                    <FormControl>
                      <Input {...field} value='LAK' disabled />
                    </FormControl>
                    <FormDescription>
                      {t('Other Payment is Laos only')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='OtherPaymentRate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Credit rate per LAK')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.0001'
                        min={0}
                        value={(field.value ?? 0) as number}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Example: 1 LAK = 1 credit')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='OtherPaymentMinTopUp'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Minimum transfer amount (LAK)')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='1'
                        min={0}
                        value={(field.value ?? 0) as number}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Smallest Laos transfer members can submit')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='OtherPaymentAmountOptions'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Suggested LAK amounts')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder='[30000,50000,100000]'
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Preset LAK buttons shown to members')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='rounded-lg border p-4'>
              <div className='mb-4 flex items-start gap-3'>
                <Calculator className='text-primary mt-0.5 h-5 w-5' />
                <div>
                  <div className='font-medium'>
                    {t('Exchange rate calculator')}
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    {t(
                      'Enter the transfer amount and the credit members should receive, then apply the calculated rate.'
                    )}
                  </p>
                </div>
              </div>
              <div className='grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end'>
                <FormItem>
                  <FormLabel>{t('Member pays (LAK)')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='1'
                      min={0}
                      value={otherPaymentExchange.paid}
                      onChange={(event) =>
                        setOtherPaymentExchange((current) => ({
                          ...current,
                          paid: event.target.value,
                        }))
                      }
                    />
                  </FormControl>
                </FormItem>
                <FormItem>
                  <FormLabel>{t('Member receives credits')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min={0}
                      value={otherPaymentExchange.credit}
                      onChange={(event) =>
                        setOtherPaymentExchange((current) => ({
                          ...current,
                          credit: event.target.value,
                        }))
                      }
                    />
                  </FormControl>
                </FormItem>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() =>
                    applyExchangeRate(
                      otherPaymentExchange.paid,
                      otherPaymentExchange.credit,
                      'OtherPaymentRate'
                    )
                  }
                >
                  {t('Apply exchange rate')}
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name='OtherPaymentMethods'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Laos bank accounts')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={10}
                      placeholder='[{"id":"bcel","name":"BCEL","bank_name":"BCEL","account_name":"TinyToken","account_number":"123456789","qr_image_url":"https://example.com/bcel-qr.png","note":"Transfer exact amount and upload slip.","enabled":true}]'
                      {...field}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    {t(
                      'Each enabled item becomes one Laos payment choice on the member page. Put a QR image URL in qr_image_url.'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid gap-4 lg:grid-cols-3'>
              <FormField
                control={form.control}
                name='OtherPaymentTelegramEnabled'
                render={({ field }) => (
                  <FormItem className='rounded-lg border p-4'>
                    <div className='mb-4 flex items-center justify-between'>
                      <div>
                        <FormLabel className='flex items-center gap-2 text-base'>
                          <Bell className='h-4 w-4' />
                          {t('Telegram approval bot')}
                        </FormLabel>
                        <FormDescription>
                          {t('Send Laos slips to Telegram group')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <div className='space-y-3'>
                      <FormField
                        control={form.control}
                        name='OtherPaymentTelegramBotSecret'
                        render={({ field: tokenField }) => (
                          <FormItem>
                            <FormLabel>{t('Bot token')}</FormLabel>
                            <FormControl>
                              <Input
                                type='password'
                                autoComplete='new-password'
                                placeholder={t('Enter new token to update')}
                                {...tokenField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='OtherPaymentTelegramChatId'
                        render={({ field: chatField }) => (
                          <FormItem>
                            <FormLabel>{t('Group chat ID')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder='-100xxxxxxxxxx'
                                {...chatField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='OtherPaymentLineEnabled'
                render={({ field }) => (
                  <FormItem className='rounded-lg border p-4'>
                    <div className='mb-4 flex items-center justify-between'>
                      <div>
                        <FormLabel className='flex items-center gap-2 text-base'>
                          <Bell className='h-4 w-4' />
                          {t('LINE approval bot')}
                        </FormLabel>
                        <FormDescription>
                          {t('Send Laos payment notices to LINE group')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <div className='space-y-3'>
                      <FormField
                        control={form.control}
                        name='OtherPaymentLineAccessSecret'
                        render={({ field: tokenField }) => (
                          <FormItem>
                            <FormLabel>{t('Channel access token')}</FormLabel>
                            <FormControl>
                              <Input
                                type='password'
                                autoComplete='new-password'
                                placeholder={t('Enter new token to update')}
                                {...tokenField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='OtherPaymentLineGroupId'
                        render={({ field: groupField }) => (
                          <FormItem>
                            <FormLabel>{t('LINE group ID')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder='Cxxxxxxxxxxxxxxxx'
                                {...groupField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='OtherPaymentConfirmSecret'
                render={({ field }) => (
                  <FormItem className='rounded-lg border p-4'>
                    <FormLabel className='flex items-center gap-2 text-base'>
                      <ShieldAlert className='h-4 w-4' />
                      {t('Bot confirm secret')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        autoComplete='new-password'
                        placeholder={t('Enter new secret to update')}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Webhook URL: /api/payment/other/telegram/webhook?secret=YOUR_SECRET and /api/payment/other/line/webhook?secret=YOUR_SECRET'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type='button'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                saveOtherPaymentSettings()
              }}
              disabled={updateOption.isPending}
            >
              {updateOption.isPending
                ? t('Saving...')
                : t('Save Other Payment settings')}
            </Button>
          </div>

          {showLegacyPaymentGateways && <Separator />}

          {showLegacyPaymentGateways && (
            <div className='space-y-4'>
              <div>
                <h3 className='text-lg font-medium'>{t('Epay Gateway')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t('Configuration for Epay payment integration')}
                </p>
              </div>

              <div className='grid gap-6 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='PayAddress'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Epay endpoint')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('https://pay.example.com')}
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Base address provided by your Epay service')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='CustomCallbackAddress'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Callback address')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('https://gateway.example.com')}
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Optional callback override. Leave blank to use server address'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid gap-6 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='EpayId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Epay merchant ID')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='10001'
                          autoComplete='off'
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='EpayKey'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Epay secret key')}</FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder={t('Enter new key to update')}
                          autoComplete='new-password'
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Leave blank unless rotating the secret')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  saveEpaySettings()
                }}
                disabled={updateOption.isPending}
              >
                {updateOption.isPending
                  ? t('Saving...')
                  : t('Save Epay settings')}
              </Button>
            </div>
          )}

          {showLegacyPaymentGateways && <Separator />}

          {showLegacyPaymentGateways && (
            <div className='space-y-4'>
              <div>
                <h3 className='text-lg font-medium'>{t('Stripe Gateway')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t('Configuration for Stripe payment integration')}
                </p>
              </div>

              <div className='rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100'>
                <p className='mb-2 font-medium'>
                  {t('Webhook Configuration:')}
                </p>
                <ul className='list-inside list-disc space-y-1'>
                  <li>
                    {t('Webhook URL:')}{' '}
                    <code className='rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900'>
                      {'<ServerAddress>/api/stripe/webhook'}
                    </code>
                  </li>
                  <li>
                    {t('Required events:')}{' '}
                    <code className='rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900'>
                      {t('checkout.session.completed')}
                    </code>{' '}
                    {t('and')}{' '}
                    <code className='rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900'>
                      {t('checkout.session.expired')}
                    </code>
                  </li>
                  <li>
                    {t('Configure at:')}{' '}
                    <a
                      href='https://dashboard.stripe.com/developers'
                      target='_blank'
                      rel='noreferrer'
                      className='underline hover:no-underline'
                    >
                      {t('Stripe Dashboard')}
                    </a>
                  </li>
                </ul>
              </div>

              <div className='grid gap-6 md:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='StripeApiSecret'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('API secret')}</FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder={t('sk_xxx or rk_xxx')}
                          autoComplete='new-password'
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Stripe API key (leave blank unless updating)')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='StripeWebhookSecret'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Webhook secret')}</FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder={t('whsec_xxx')}
                          autoComplete='new-password'
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Webhook signing secret (leave blank unless updating)'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='StripePriceId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Price ID')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('price_xxx')}
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Stripe product price ID')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid gap-6 md:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='StripeUnitPrice'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('Unit price (local currency / USD)')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          min={0}
                          value={(field.value ?? 0) as number}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('e.g., 8 means 8 local currency per USD')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='StripeMinTopUp'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Minimum top-up (USD)')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          min={0}
                          value={(field.value ?? 0) as number}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Minimum recharge amount in USD')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='StripePromotionCodesEnabled'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base'>
                          {t('Promotion codes')}
                        </FormLabel>
                        <FormDescription>
                          {t('Allow users to enter promo codes')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  saveStripeSettings()
                }}
                disabled={updateOption.isPending}
              >
                {updateOption.isPending
                  ? t('Saving...')
                  : t('Save Stripe settings')}
              </Button>
            </div>
          )}

          {showLegacyPaymentGateways && <Separator />}

          {showLegacyPaymentGateways && (
            <div className='space-y-4'>
              <div>
                <h3 className='text-lg font-medium'>{t('Creem Gateway')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t('Configuration for Creem payment integration')}
                </p>
              </div>

              <div className='rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100'>
                <p className='mb-2 font-medium'>
                  {t('Webhook Configuration:')}
                </p>
                <ul className='list-inside list-disc space-y-1'>
                  <li>
                    {t('Webhook URL:')}{' '}
                    <code className='rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900'>
                      {'<ServerAddress>/api/creem/webhook'}
                    </code>
                  </li>
                  <li>{t('Configure in your Creem dashboard')}</li>
                </ul>
              </div>

              <div className='grid gap-6 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='CreemApiKey'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('API Key')}</FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder={t('Enter Creem API key')}
                          autoComplete='new-password'
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Creem API key (leave blank unless updating)')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='CreemWebhookSecret'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Webhook Secret')}</FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder={t('Enter webhook secret')}
                          autoComplete='new-password'
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Webhook signing secret (leave blank unless updating)'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='CreemTestMode'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>
                        {t('Test Mode')}
                      </FormLabel>
                      <FormDescription>
                        {t('Enable test mode for Creem payments')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='CreemProducts'
                render={({ field }) => (
                  <FormItem>
                    <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                      <FormLabel>{t('Products')}</FormLabel>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          setCreemProductsVisualMode(!creemProductsVisualMode)
                        }
                        className='w-full sm:w-auto'
                      >
                        {creemProductsVisualMode ? (
                          <>
                            <Code2 className='mr-2 h-3 w-3' />
                            {t('JSON Editor')}
                          </>
                        ) : (
                          <>
                            <Eye className='mr-2 h-3 w-3' />
                            {t('Visual Editor')}
                          </>
                        )}
                      </Button>
                    </div>
                    <FormControl>
                      {creemProductsVisualMode ? (
                        <CreemProductsVisualEditor
                          value={field.value}
                          onChange={field.onChange}
                        />
                      ) : (
                        <Textarea
                          rows={4}
                          placeholder='[{"name":"Basic","productId":"prod_xxx","price":10,"quota":500000,"currency":"USD"}]'
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      {t('Configure Creem products. Provide a JSON array.')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type='button'
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  saveCreemSettings()
                }}
                disabled={updateOption.isPending}
              >
                {updateOption.isPending
                  ? t('Saving...')
                  : t('Save Creem settings')}
              </Button>
            </div>
          )}

          {showLegacyPaymentGateways && (
            <Button type='submit' disabled={updateOption.isPending}>
              {updateOption.isPending ? t('Saving...') : t('Save all settings')}
            </Button>
          )}
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
