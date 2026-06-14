package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

type PaymentSetting struct {
	AmountOptions  []int           `json:"amount_options"`
	AmountDiscount map[int]float64 `json:"amount_discount"` // 充值金额对应的折扣，例如 100 元 0.9 表示 100 元充值享受 9 折优惠

	PromptPayEnabled           bool    `json:"promptpay_enabled"`
	PromptPayMode              string  `json:"promptpay_mode"`
	PromptPayAccountName       string  `json:"promptpay_account_name"`
	PromptPayId                string  `json:"promptpay_id"`
	PromptPayBankName          string  `json:"promptpay_bank_name"`
	PromptPayRate              float64 `json:"promptpay_rate"`
	PromptPayMinTopUp          float64 `json:"promptpay_min_topup"`
	PromptPayAmountOptions     []int   `json:"promptpay_amount_options"`
	PromptPaySlipProvider      string  `json:"promptpay_slip_provider"`
	PromptPaySlipApiURL        string  `json:"promptpay_slip_api_url"`
	PromptPaySlipApiKey        string  `json:"promptpay_slip_api_key"`
	PromptPayTelegramEnabled   bool    `json:"promptpay_telegram_enabled"`
	PromptPayTelegramBotSecret string  `json:"promptpay_telegram_bot_secret"`
	PromptPayTelegramChatId    string  `json:"promptpay_telegram_chat_id"`
	PromptPayLineEnabled       bool    `json:"promptpay_line_enabled"`
	PromptPayLineAccessSecret  string  `json:"promptpay_line_access_secret"`
	PromptPayLineGroupId       string  `json:"promptpay_line_group_id"`
	PromptPayTransactionExport bool    `json:"promptpay_transaction_export"`

	OtherPaymentEnabled           bool                 `json:"other_payment_enabled"`
	OtherPaymentCurrency          string               `json:"other_payment_currency"`
	OtherPaymentRate              float64              `json:"other_payment_rate"`
	OtherPaymentMinTopUp          float64              `json:"other_payment_min_topup"`
	OtherPaymentAmountOptions     []int                `json:"other_payment_amount_options"`
	OtherPaymentMethods           []OtherPaymentMethod `json:"other_payment_methods"`
	OtherPaymentTelegramEnabled   bool                 `json:"other_payment_telegram_enabled"`
	OtherPaymentTelegramBotSecret string               `json:"other_payment_telegram_bot_secret"`
	OtherPaymentTelegramChatId    string               `json:"other_payment_telegram_chat_id"`
	OtherPaymentLineEnabled       bool                 `json:"other_payment_line_enabled"`
	OtherPaymentLineAccessSecret  string               `json:"other_payment_line_access_secret"`
	OtherPaymentLineGroupId       string               `json:"other_payment_line_group_id"`
	OtherPaymentConfirmSecret     string               `json:"other_payment_confirm_secret"`

	ComplianceConfirmed    bool   `json:"compliance_confirmed"`
	ComplianceTermsVersion string `json:"compliance_terms_version"`
	ComplianceConfirmedAt  int64  `json:"compliance_confirmed_at"`
	ComplianceConfirmedBy  int    `json:"compliance_confirmed_by"`
	ComplianceConfirmedIP  string `json:"compliance_confirmed_ip"`
}

type OtherPaymentMethod struct {
	Id            string `json:"id"`
	Name          string `json:"name"`
	BankName      string `json:"bank_name"`
	AccountName   string `json:"account_name"`
	AccountNumber string `json:"account_number"`
	QRImageURL    string `json:"qr_image_url"`
	Note          string `json:"note"`
	Enabled       bool   `json:"enabled"`
}

const CurrentComplianceTermsVersion = "v1"

// 默认配置
var paymentSetting = PaymentSetting{
	AmountOptions:              []int{10, 20, 50, 100, 200, 500},
	AmountDiscount:             map[int]float64{},
	PromptPayMode:              "manual",
	PromptPayRate:              3,
	PromptPayMinTopUp:          20,
	PromptPayAmountOptions:     []int{50, 100, 300, 500, 1000},
	PromptPaySlipProvider:      "manual",
	PromptPayTransactionExport: true,
	OtherPaymentEnabled:        true,
	OtherPaymentCurrency:       "LAK",
	OtherPaymentRate:           1,
	OtherPaymentMinTopUp:       30000,
	OtherPaymentAmountOptions:  []int{30000, 50000, 100000},
	OtherPaymentMethods: []OtherPaymentMethod{
		{Id: "bcel", Name: "BCEL", BankName: "BCEL", Enabled: true},
		{Id: "ldb", Name: "LDB", BankName: "Lao Development Bank", Enabled: true},
		{Id: "jdb", Name: "JDB", BankName: "Joint Development Bank", Enabled: true},
		{Id: "apb", Name: "APB", BankName: "Agricultural Promotion Bank", Enabled: true},
		{Id: "stbank", Name: "ST Bank", BankName: "ST Bank", Enabled: true},
		{Id: "phongsavanh", Name: "Phongsavanh Bank", BankName: "Phongsavanh Bank", Enabled: true},
		{Id: "laoviet", Name: "LaoVietBank", BankName: "LaoVietBank", Enabled: true},
	},
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("payment_setting", &paymentSetting)
}

func GetPaymentSetting() *PaymentSetting {
	return &paymentSetting
}

func IsPaymentComplianceConfirmed() bool {
	return paymentSetting.ComplianceConfirmed &&
		paymentSetting.ComplianceTermsVersion == CurrentComplianceTermsVersion
}
