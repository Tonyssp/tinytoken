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
import { SettingsPage } from '../components/settings-page'
import type { BillingSettings } from '../types'
import {
  BILLING_DEFAULT_SECTION,
  getBillingSectionContent,
  getBillingSectionMeta,
} from './section-registry.tsx'

const defaultBillingSettings: BillingSettings = {
  QuotaForNewUser: 0,
  PreConsumedQuota: 0,
  QuotaForInviter: 0,
  QuotaForInvitee: 0,
  TopUpLink: '',
  'general_setting.docs_link': '',
  'quota_setting.enable_free_model_pre_consume': true,
  QuotaPerUnit: 500000,
  USDExchangeRate: 7,
  'general_setting.quota_display_type': 'USD',
  'general_setting.custom_currency_symbol': '¤',
  'general_setting.custom_currency_exchange_rate': 1,
  DisplayInCurrencyEnabled: true,
  DisplayTokenStatEnabled: true,
  ModelPrice: '',
  ModelRatio: '',
  CacheRatio: '',
  CreateCacheRatio: '',
  CompletionRatio: '',
  ImageRatio: '',
  AudioRatio: '',
  AudioCompletionRatio: '',
  ExposeRatioEnabled: false,
  'billing_setting.billing_mode': '{}',
  'billing_setting.billing_expr': '{}',
  'tool_price_setting.prices': '{}',
  TopupGroupRatio: '',
  GroupRatio: '',
  UserUsableGroups: '',
  GroupGroupRatio: '',
  AutoGroups: '',
  DefaultUseAutoGroup: false,
  'group_ratio_setting.group_special_usable_group': '{}',
  PayAddress: '',
  EpayId: '',
  EpayKey: '',
  Price: 7.3,
  MinTopUp: 1,
  CustomCallbackAddress: '',
  PayMethods: '',
  'payment_setting.amount_options': '',
  'payment_setting.amount_discount': '',
  'payment_setting.promptpay_enabled': false,
  'payment_setting.promptpay_mode': 'manual',
  'payment_setting.promptpay_account_name': '',
  'payment_setting.promptpay_id': '',
  'payment_setting.promptpay_bank_name': 'Kasikorn Bank',
  'payment_setting.promptpay_rate': 3,
  'payment_setting.promptpay_min_topup': 20,
  'payment_setting.promptpay_amount_options': '[50,100,300,500,1000]',
  'payment_setting.promptpay_slip_provider': 'manual',
  'payment_setting.promptpay_slip_api_url': '',
  'payment_setting.promptpay_slip_api_key': '',
  'payment_setting.promptpay_telegram_enabled': false,
  'payment_setting.promptpay_telegram_bot_secret': '',
  'payment_setting.promptpay_telegram_chat_id': '',
  'payment_setting.promptpay_line_enabled': false,
  'payment_setting.promptpay_line_access_secret': '',
  'payment_setting.promptpay_line_group_id': '',
  'payment_setting.promptpay_transaction_export': true,
  'payment_setting.other_payment_enabled': true,
  'payment_setting.other_payment_currency': 'LAK',
  'payment_setting.other_payment_rate': 1,
  'payment_setting.other_payment_min_topup': 30000,
  'payment_setting.other_payment_amount_options': '[30000,50000,100000]',
  'payment_setting.other_payment_methods':
    '[{"id":"bcel","name":"BCEL","bank_name":"BCEL","account_name":"","account_number":"","qr_image_url":"","note":"","enabled":true},{"id":"ldb","name":"LDB","bank_name":"Lao Development Bank","account_name":"","account_number":"","qr_image_url":"","note":"","enabled":true},{"id":"jdb","name":"JDB","bank_name":"Joint Development Bank","account_name":"","account_number":"","qr_image_url":"","note":"","enabled":true}]',
  'payment_setting.other_payment_telegram_enabled': false,
  'payment_setting.other_payment_telegram_bot_secret': '',
  'payment_setting.other_payment_telegram_chat_id': '',
  'payment_setting.other_payment_line_enabled': false,
  'payment_setting.other_payment_line_access_secret': '',
  'payment_setting.other_payment_line_group_id': '',
  'payment_setting.other_payment_confirm_secret': '',
  'payment_setting.compliance_confirmed': false,
  'payment_setting.compliance_terms_version': '',
  'payment_setting.compliance_confirmed_at': 0,
  'payment_setting.compliance_confirmed_by': 0,
  'payment_setting.compliance_confirmed_ip': '',
  StripeApiSecret: '',
  StripeWebhookSecret: '',
  StripePriceId: '',
  StripeUnitPrice: 8.0,
  StripeMinTopUp: 1,
  StripePromotionCodesEnabled: false,
  CreemApiKey: '',
  CreemWebhookSecret: '',
  CreemTestMode: false,
  CreemProducts: '[]',
  WaffoEnabled: false,
  WaffoApiKey: '',
  WaffoPrivateKey: '',
  WaffoPublicCert: '',
  WaffoSandboxPublicCert: '',
  WaffoSandboxApiKey: '',
  WaffoSandboxPrivateKey: '',
  WaffoSandbox: false,
  WaffoMerchantId: '',
  WaffoCurrency: 'USD',
  WaffoUnitPrice: 1,
  WaffoMinTopUp: 1,
  WaffoNotifyUrl: '',
  WaffoReturnUrl: '',
  WaffoPayMethods: '[]',
  WaffoPancakeMerchantID: '',
  WaffoPancakePrivateKey: '',
  WaffoPancakeReturnURL: '',
  WaffoPancakeStoreID: '',
  WaffoPancakeProductID: '',
  'checkin_setting.enabled': false,
  'checkin_setting.min_quota': 1000,
  'checkin_setting.max_quota': 10000,
}

export function BillingSettings() {
  return (
    <SettingsPage
      routePath='/_authenticated/system-settings/billing/$section'
      defaultSettings={defaultBillingSettings}
      defaultSection={BILLING_DEFAULT_SECTION}
      getSectionContent={getBillingSectionContent}
      getSectionMeta={getBillingSectionMeta}
    />
  )
}
