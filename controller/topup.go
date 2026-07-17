package controller

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
)

func GetTopUpInfo(c *gin.Context) {
	complianceConfirmed := operation_setting.IsPaymentComplianceConfirmed()

	// 获取支付方式
	payMethods := operation_setting.PayMethods
	if !complianceConfirmed {
		payMethods = []map[string]string{}
	}

	// 如果启用了 Stripe 支付，添加到支付方法列表
	if isStripeTopUpEnabled() {
		// 检查是否已经包含 Stripe
		hasStripe := false
		for _, method := range payMethods {
			if method["type"] == "stripe" {
				hasStripe = true
				break
			}
		}

		if !hasStripe {
			stripeMethod := map[string]string{
				"name":      "Stripe",
				"type":      "stripe",
				"color":     "rgba(var(--semi-purple-5), 1)",
				"min_topup": strconv.Itoa(setting.StripeMinTopUp),
			}
			payMethods = append(payMethods, stripeMethod)
		}
	}

	// Waffo Pancake displayed above the legacy Waffo gateway.
	enableWaffoPancake := isWaffoPancakeTopUpEnabled()
	if enableWaffoPancake {
		hasWaffoPancake := false
		for _, method := range payMethods {
			if method["type"] == model.PaymentMethodWaffoPancake {
				hasWaffoPancake = true
				break
			}
		}

		if !hasWaffoPancake {
			payMethods = append(payMethods, map[string]string{
				"name":      "Waffo Pancake",
				"type":      model.PaymentMethodWaffoPancake,
				"color":     "rgba(var(--semi-orange-5), 1)",
				"min_topup": strconv.Itoa(setting.WaffoPancakeMinTopUp),
			})
		}
	}

	// 如果启用了 Waffo 支付，添加到支付方法列表
	enableWaffo := isWaffoTopUpEnabled()
	if enableWaffo {
		hasWaffo := false
		for _, method := range payMethods {
			if method["type"] == model.PaymentMethodWaffo {
				hasWaffo = true
				break
			}
		}

		if !hasWaffo {
			waffoMethod := map[string]string{
				"name":      "Waffo (Global Payment)",
				"type":      model.PaymentMethodWaffo,
				"color":     "rgba(var(--semi-blue-5), 1)",
				"min_topup": strconv.Itoa(setting.WaffoMinTopUp),
			}
			payMethods = append(payMethods, waffoMethod)
		}
	}

	paymentSetting := operation_setting.GetPaymentSetting()
	enablePromptPay := complianceConfirmed && paymentSetting.PromptPayEnabled
	enableOtherPayment := complianceConfirmed && paymentSetting.OtherPaymentEnabled
	otherPaymentMethods := make([]operation_setting.OtherPaymentMethod, 0, len(paymentSetting.OtherPaymentMethods))
	for _, method := range paymentSetting.OtherPaymentMethods {
		if method.Enabled {
			otherPaymentMethods = append(otherPaymentMethods, method)
		}
	}

	data := gin.H{
		"enable_online_topup":              isEpayTopUpEnabled(),
		"enable_stripe_topup":              isStripeTopUpEnabled(),
		"enable_creem_topup":               isCreemTopUpEnabled(),
		"enable_waffo_topup":               enableWaffo,
		"enable_waffo_pancake_topup":       enableWaffoPancake,
		"enable_promptpay_topup":           enablePromptPay,
		"promptpay_mode":                   paymentSetting.PromptPayMode,
		"promptpay_account_name":           paymentSetting.PromptPayAccountName,
		"promptpay_id":                     paymentSetting.PromptPayId,
		"promptpay_qr_id":                  paymentSetting.PromptPayQrId,
		"promptpay_bank_name":              paymentSetting.PromptPayBankName,
		"promptpay_instructions":           paymentSetting.PromptPayInstructions,
		"promptpay_rate":                   paymentSetting.PromptPayRate,
		"promptpay_min_topup":              paymentSetting.PromptPayMinTopUp,
		"promptpay_amount_options":         paymentSetting.PromptPayAmountOptions,
		"promptpay_slip_provider":          paymentSetting.PromptPaySlipProvider,
		"promptpay_transaction_export":     paymentSetting.PromptPayTransactionExport,
		"enable_other_payment_topup":       enableOtherPayment,
		"other_payment_currency":           paymentSetting.OtherPaymentCurrency,
		"other_payment_rate":               paymentSetting.OtherPaymentRate,
		"other_payment_min_topup":          paymentSetting.OtherPaymentMinTopUp,
		"other_payment_amount_options":     paymentSetting.OtherPaymentAmountOptions,
		"other_payment_methods":            otherPaymentMethods,
		"enable_redemption":                complianceConfirmed,
		"payment_compliance_confirmed":     complianceConfirmed,
		"payment_compliance_terms_version": operation_setting.CurrentComplianceTermsVersion,
		"waffo_pay_methods": func() interface{} {
			if enableWaffo {
				return setting.GetWaffoPayMethods()
			}
			return nil
		}(),
		"creem_products":          setting.CreemProducts,
		"pay_methods":             payMethods,
		"min_topup":               operation_setting.MinTopUp,
		"stripe_min_topup":        setting.StripeMinTopUp,
		"waffo_min_topup":         setting.WaffoMinTopUp,
		"waffo_pancake_min_topup": setting.WaffoPancakeMinTopUp,
		"amount_options":          paymentSetting.AmountOptions,
		"discount":                paymentSetting.AmountDiscount,
		"topup_link":              common.TopUpLink,
	}
	common.ApiSuccess(c, data)
}

type EpayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

type AmountRequest struct {
	Amount int64 `json:"amount"`
}

type otherPaymentTelegramUpdate struct {
	UpdateID int64 `json:"update_id"`
	Message  *struct {
		MessageID int    `json:"message_id"`
		Text      string `json:"text"`
		From      struct {
			ID int64 `json:"id"`
		} `json:"from"`
		Chat struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		ReplyToMessage *struct {
			MessageID int    `json:"message_id"`
			Caption   string `json:"caption"`
		} `json:"reply_to_message"`
	} `json:"message"`
}

var otherPaymentApprovalMessages sync.Map

func otherPaymentApprovalKey(chatID int64, messageID int) string {
	return fmt.Sprintf("%d:%d", chatID, messageID)
}

func telegramTopupWebhookSecret(botToken string) string {
	configured := strings.TrimSpace(operation_setting.GetPaymentSetting().OtherPaymentConfirmSecret)
	if configured != "" {
		return configured
	}
	sum := sha256.Sum256([]byte("tinyapi-topup:" + botToken))
	return fmt.Sprintf("%x", sum[:16])
}

func ensureTelegramTopupWebhook(botToken string) error {
	serverAddress := strings.TrimRight(strings.TrimSpace(system_setting.ServerAddress), "/")
	if botToken == "" {
		return errors.New("Telegram bot token is empty")
	}
	if !strings.HasPrefix(serverAddress, "https://") {
		return fmt.Errorf("ServerAddress must use HTTPS for Telegram webhook: %s", serverAddress)
	}

	webhookURL := fmt.Sprintf(
		"%s/api/payment/other/telegram/webhook?secret=%s",
		serverAddress,
		url.QueryEscape(telegramTopupWebhookSecret(botToken)),
	)
	form := url.Values{
		"url":             {webhookURL},
		"allowed_updates": {`["message"]`},
	}
	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/setWebhook", botToken)
	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("failed to build Telegram webhook request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := service.GetHttpClient().Do(req)
	if err != nil {
		return fmt.Errorf("failed to configure Telegram topup webhook: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("Telegram topup webhook returned HTTP %d", resp.StatusCode)
	}

	var parsed struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&parsed); err != nil {
		return fmt.Errorf("failed to decode Telegram webhook response: %w", err)
	}
	if !parsed.OK {
		return fmt.Errorf("Telegram rejected webhook: %s", parsed.Description)
	}
	return nil
}

func telegramApprovalBot(chatID int64) (string, bool) {
	paymentSetting := operation_setting.GetPaymentSetting()
	configs := []struct {
		enabled bool
		token   string
		chatID  string
	}{
		{
			enabled: paymentSetting.PromptPayTelegramEnabled,
			token:   paymentSetting.PromptPayTelegramBotSecret,
			chatID:  paymentSetting.PromptPayTelegramChatId,
		},
		{
			enabled: paymentSetting.OtherPaymentTelegramEnabled,
			token:   paymentSetting.OtherPaymentTelegramBotSecret,
			chatID:  paymentSetting.OtherPaymentTelegramChatId,
		},
	}
	for _, config := range configs {
		configuredChatID, err := strconv.ParseInt(strings.TrimSpace(config.chatID), 10, 64)
		if err == nil && config.enabled && config.token != "" && configuredChatID == chatID {
			return config.token, true
		}
	}
	return "", false
}

func isTelegramGroupAdmin(botToken string, chatID int64, userID int64) (bool, error) {
	endpoint := fmt.Sprintf(
		"https://api.telegram.org/bot%s/getChatMember?chat_id=%d&user_id=%d",
		botToken,
		chatID,
		userID,
	)
	resp, err := service.GetHttpClient().Get(endpoint)
	if err != nil {
		return false, fmt.Errorf("failed to verify Telegram admin: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return false, fmt.Errorf("Telegram getChatMember returned HTTP %d", resp.StatusCode)
	}

	var parsed struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
		Result      struct {
			Status string `json:"status"`
		} `json:"result"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&parsed); err != nil {
		return false, fmt.Errorf("failed to decode Telegram admin response: %w", err)
	}
	if !parsed.OK {
		return false, fmt.Errorf("Telegram rejected getChatMember: %s", parsed.Description)
	}
	return parsed.Result.Status == "administrator" || parsed.Result.Status == "creator", nil
}

func findOtherPaymentMethod(methodID string) (operation_setting.OtherPaymentMethod, bool) {
	for _, method := range operation_setting.GetPaymentSetting().OtherPaymentMethods {
		if method.Enabled && method.Id == methodID {
			return method, true
		}
	}
	return operation_setting.OtherPaymentMethod{}, false
}

func getOtherPaymentMethodCurrency(method operation_setting.OtherPaymentMethod, setting *operation_setting.PaymentSetting) string {
	currency := strings.TrimSpace(method.Currency)
	if currency == "" {
		currency = strings.TrimSpace(setting.OtherPaymentCurrency)
	}
	if currency == "" {
		return "LAK"
	}
	return strings.ToUpper(currency)
}

func getOtherPaymentMethodRate(method operation_setting.OtherPaymentMethod, setting *operation_setting.PaymentSetting) float64 {
	if method.Rate > 0 {
		return method.Rate
	}
	return setting.OtherPaymentRate
}

func getOtherPaymentMethodMinTopUp(method operation_setting.OtherPaymentMethod, setting *operation_setting.PaymentSetting) float64 {
	if method.MinTopUp > 0 {
		return method.MinTopUp
	}
	return setting.OtherPaymentMinTopUp
}

func saveTopupSlip(tradeNo string, header *multipart.FileHeader) (string, []byte, error) {
	file, err := header.Open()
	if err != nil {
		return "", nil, err
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, 6*1024*1024))
	if err != nil {
		return "", nil, err
	}
	if len(data) > 5*1024*1024 {
		return "", nil, fmt.Errorf("slip file too large")
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp", ".pdf":
	default:
		ext = ".bin"
	}

	dir := filepath.Join("data", "topup_slips")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", nil, err
	}

	path := filepath.Join(dir, tradeNo+ext)
	if err := os.WriteFile(path, data, 0644); err != nil {
		return "", nil, err
	}
	return path, data, nil
}

func notifyTelegramManualTopup(enabled bool, botToken string, chatID string, tradeNo string, text string, slipName string, slipBytes []byte) {
	if !enabled || botToken == "" || chatID == "" {
		return
	}

	if err := ensureTelegramTopupWebhook(botToken); err != nil {
		common.SysLog("failed to configure Telegram topup webhook: " + err.Error())
	}

	method := "sendDocument"
	fileField := "document"
	switch strings.ToLower(filepath.Ext(slipName)) {
	case ".jpg", ".jpeg", ".png", ".webp":
		method = "sendPhoto"
		fileField = "photo"
	}

	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/%s", botToken, method)
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("chat_id", chatID)
	_ = writer.WriteField("caption", text)
	part, err := writer.CreateFormFile(fileField, slipName)
	if err == nil {
		_, _ = part.Write(slipBytes)
	}
	_ = writer.Close()

	req, err := http.NewRequest(http.MethodPost, endpoint, &body)
	if err != nil {
		common.SysLog("failed to build Telegram topup request: " + err.Error())
		return
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := service.GetHttpClient()
	resp, err := client.Do(req)
	if err != nil {
		common.SysLog("failed to send Telegram topup notification: " + err.Error())
		return
	}
	defer resp.Body.Close()

	var parsed struct {
		OK     bool `json:"ok"`
		Result struct {
			MessageID int `json:"message_id"`
			Chat      struct {
				ID int64 `json:"id"`
			} `json:"chat"`
		} `json:"result"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&parsed)
	if parsed.OK && parsed.Result.MessageID != 0 {
		otherPaymentApprovalMessages.Store(
			otherPaymentApprovalKey(parsed.Result.Chat.ID, parsed.Result.MessageID),
			tradeNo,
		)
	}
}

func notifyTelegramOtherPayment(setting *operation_setting.PaymentSetting, tradeNo string, text string, slipName string, slipBytes []byte) {
	notifyTelegramManualTopup(
		setting.OtherPaymentTelegramEnabled,
		setting.OtherPaymentTelegramBotSecret,
		setting.OtherPaymentTelegramChatId,
		tradeNo,
		text,
		slipName,
		slipBytes,
	)
}

func notifyTelegramPromptPay(setting *operation_setting.PaymentSetting, tradeNo string, text string, slipName string, slipBytes []byte) {
	notifyTelegramManualTopup(
		setting.PromptPayTelegramEnabled,
		setting.PromptPayTelegramBotSecret,
		setting.PromptPayTelegramChatId,
		tradeNo,
		text,
		slipName,
		slipBytes,
	)
}

func notifyLineOtherPayment(setting *operation_setting.PaymentSetting, text string) {
	if !setting.OtherPaymentLineEnabled || setting.OtherPaymentLineAccessSecret == "" || setting.OtherPaymentLineGroupId == "" {
		return
	}

	payload := map[string]any{
		"to": setting.OtherPaymentLineGroupId,
		"messages": []map[string]string{
			{
				"type": "text",
				"text": strings.ReplaceAll(text, "<br>", "\n"),
			},
		},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, "https://api.line.me/v2/bot/message/push", bytes.NewReader(body))
	if err != nil {
		common.SysLog("failed to build LINE topup request: " + err.Error())
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+setting.OtherPaymentLineAccessSecret)

	resp, err := service.GetHttpClient().Do(req)
	if err != nil {
		common.SysLog("failed to send LINE topup notification: " + err.Error())
		return
	}
	defer resp.Body.Close()
}

func buildOtherPaymentNotification(tradeNo string, userID int, amount int64, creditAmount int64, method operation_setting.OtherPaymentMethod, bankFrom string, currency string) string {
	return fmt.Sprintf(
		"New manual top-up\nTrade: %s\nUser ID: %d\nAmount: %s %s\nCredit: %d\nMethod: %s\nBank from: %s\n\nTelegram: reply 1 to approve or 2 to reject\nOr send: 1 %s / 2 %s\nLINE confirm: send: 1 %s",
		tradeNo,
		userID,
		formatIntWithCommas(amount),
		currency,
		creditAmount,
		method.Name,
		bankFrom,
		tradeNo,
		tradeNo,
		tradeNo,
	)
}

func buildPromptPayNotification(tradeNo string, userID int, amount int64, creditAmount int64, bankFrom string) string {
	return fmt.Sprintf(
		"คำขอเติมเครดิต PromptPay ใหม่\nเลขที่รายการ: %s\nUser ID: %d\nยอดโอน: %s บาท\nเครดิตที่จะได้รับ: %d\nธนาคารต้นทาง: %s\n\nตอบกลับข้อความนี้ด้วย 1 เพื่ออนุมัติ หรือ 2 เพื่อปฏิเสธ\nหรือส่ง: 1 %s / 2 %s",
		tradeNo,
		userID,
		formatIntWithCommas(amount),
		creditAmount,
		bankFrom,
		tradeNo,
		tradeNo,
	)
}

func formatIntWithCommas(value int64) string {
	raw := strconv.FormatInt(value, 10)
	if len(raw) <= 3 {
		return raw
	}
	var out []byte
	for i, r := range raw {
		if i > 0 && (len(raw)-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, byte(r))
	}
	return string(out)
}

func confirmOtherPaymentTrade(tradeNo string, callerIp string) error {
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	return model.ManualCompleteTopUp(tradeNo, callerIp)
}

type telegramTopupAction string

const (
	telegramTopupApprove telegramTopupAction = "approve"
	telegramTopupReject  telegramTopupAction = "reject"
)

func parseTelegramTopupCommand(text string) (telegramTopupAction, string, bool) {
	fields := strings.Fields(strings.TrimSpace(text))
	if len(fields) == 0 {
		return "", "", false
	}

	command := strings.ToLower(strings.SplitN(fields[0], "@", 2)[0])
	var action telegramTopupAction
	switch command {
	case "1", "approve", "confirm", "/approve", "/confirm":
		action = telegramTopupApprove
	case "2", "reject", "deny", "/reject", "/deny":
		action = telegramTopupReject
	default:
		return "", "", false
	}

	if len(fields) >= 2 {
		return action, fields[1], true
	}
	return action, "", true
}

func parseOtherPaymentConfirmText(text string) string {
	action, tradeNo, ok := parseTelegramTopupCommand(text)
	if ok && action == telegramTopupApprove {
		return tradeNo
	}
	return ""
}

func tradeNoFromTelegramCaption(caption string) string {
	for _, line := range strings.Split(caption, "\n") {
		line = strings.TrimSpace(line)
		for _, prefix := range []string{"เลขที่รายการ:", "Trade:"} {
			if strings.HasPrefix(line, prefix) {
				return strings.TrimSpace(strings.TrimPrefix(line, prefix))
			}
		}
	}
	return ""
}

func sendTelegramCommandMessage(botToken string, chatID int64, replyToMessageID int, text string) {
	form := url.Values{
		"chat_id":             {strconv.FormatInt(chatID, 10)},
		"reply_to_message_id": {strconv.Itoa(replyToMessageID)},
		"text":                {text},
	}
	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)
	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		common.SysLog("failed to build Telegram command response: " + err.Error())
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := service.GetHttpClient().Do(req)
	if err != nil {
		common.SysLog("failed to send Telegram command response: " + err.Error())
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		common.SysLog(fmt.Sprintf("Telegram command response returned HTTP %d", resp.StatusCode))
	}
}

func telegramTopupActionLabel(action telegramTopupAction) string {
	if action == telegramTopupReject {
		return "ปฏิเสธ"
	}
	return "อนุมัติ"
}

func telegramTopupErrorMessage(action telegramTopupAction, tradeNo string, err error) string {
	switch {
	case errors.Is(err, model.ErrTopUpNotFound):
		return fmt.Sprintf("ไม่พบรายการ %s", tradeNo)
	case errors.Is(err, model.ErrManualTopUpProviderInvalid):
		return fmt.Sprintf("รายการ %s ไม่ใช่รายการโอนเงินแบบตรวจสอบโดยแอดมิน", tradeNo)
	case errors.Is(err, model.ErrTopUpStatusInvalid):
		return fmt.Sprintf("รายการ %s ถูกดำเนินการไปแล้ว ไม่สามารถ%sซ้ำได้", tradeNo, telegramTopupActionLabel(action))
	default:
		return fmt.Sprintf("ไม่สามารถ%sรายการ %s ได้: %s", telegramTopupActionLabel(action), tradeNo, err.Error())
	}
}

func RequestPromptPayTopUp(c *gin.Context) {
	paymentSetting := operation_setting.GetPaymentSetting()
	if !operation_setting.IsPaymentComplianceConfirmed() || !paymentSetting.PromptPayEnabled {
		common.ApiErrorMsg(c, "PromptPay is not enabled")
		return
	}

	amount, err := strconv.ParseInt(strings.TrimSpace(c.PostForm("amount")), 10, 64)
	if err != nil || amount <= 0 {
		common.ApiErrorMsg(c, "Invalid amount")
		return
	}
	if amount < int64(paymentSetting.PromptPayMinTopUp) {
		common.ApiErrorMsg(c, fmt.Sprintf("Minimum top-up is %d THB", int64(paymentSetting.PromptPayMinTopUp)))
		return
	}

	bankFrom := strings.TrimSpace(c.PostForm("bank_from"))
	if bankFrom == "" {
		common.ApiErrorMsg(c, "Bank is required")
		return
	}

	slip, err := c.FormFile("slip")
	if err != nil {
		common.ApiErrorMsg(c, "Slip file is required")
		return
	}

	creditAmount := int64(decimal.NewFromInt(amount).Mul(decimal.NewFromFloat(paymentSetting.PromptPayRate)).IntPart())
	if creditAmount <= 0 {
		common.ApiErrorMsg(c, "Invalid credit rate")
		return
	}

	userID := c.GetInt("id")
	tradeNo := fmt.Sprintf("THA%dNO%s%d", userID, common.GetRandomString(6), time.Now().Unix())
	_, slipBytes, err := saveTopupSlip(tradeNo, slip)
	if err != nil {
		common.ApiErrorMsg(c, "Failed to save slip: "+err.Error())
		return
	}

	topUp := &model.TopUp{
		UserId:          userID,
		Amount:          creditAmount,
		Money:           float64(amount),
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodPromptPay,
		PaymentProvider: model.PaymentProviderPromptPay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	message := buildPromptPayNotification(tradeNo, userID, amount, creditAmount, bankFrom)
	go notifyTelegramPromptPay(paymentSetting, tradeNo, message, slip.Filename, slipBytes)

	common.ApiSuccess(c, gin.H{
		"trade_no": tradeNo,
		"status":   common.TopUpStatusPending,
	})
}

func RequestOtherPaymentTopUp(c *gin.Context) {
	paymentSetting := operation_setting.GetPaymentSetting()
	if !operation_setting.IsPaymentComplianceConfirmed() || !paymentSetting.OtherPaymentEnabled {
		common.ApiErrorMsg(c, "Other payment is not enabled")
		return
	}

	amount, err := strconv.ParseInt(strings.TrimSpace(c.PostForm("amount")), 10, 64)
	if err != nil || amount <= 0 {
		common.ApiErrorMsg(c, "Invalid amount")
		return
	}

	methodID := strings.TrimSpace(c.PostForm("method_id"))
	method, ok := findOtherPaymentMethod(methodID)
	if !ok {
		common.ApiErrorMsg(c, "Payment method is not available")
		return
	}
	currency := getOtherPaymentMethodCurrency(method, paymentSetting)
	minTopUp := getOtherPaymentMethodMinTopUp(method, paymentSetting)
	rate := getOtherPaymentMethodRate(method, paymentSetting)

	if amount < int64(minTopUp) {
		common.ApiErrorMsg(c, fmt.Sprintf("Minimum top-up is %d %s", int64(minTopUp), currency))
		return
	}

	bankFrom := strings.TrimSpace(c.PostForm("bank_from"))
	if bankFrom == "" {
		bankFrom = method.BankName
	}

	creditAmount := int64(decimal.NewFromInt(amount).Mul(decimal.NewFromFloat(rate)).IntPart())
	if creditAmount <= 0 {
		common.ApiErrorMsg(c, "Invalid credit rate")
		return
	}

	slip, err := c.FormFile("slip")
	if err != nil {
		common.ApiErrorMsg(c, "Slip file is required")
		return
	}

	userID := c.GetInt("id")
	tradeNo := fmt.Sprintf("LAO%dNO%s%d", userID, common.GetRandomString(6), time.Now().Unix())
	_, slipBytes, err := saveTopupSlip(tradeNo, slip)
	if err != nil {
		common.ApiErrorMsg(c, "Failed to save slip: "+err.Error())
		return
	}

	topUp := &model.TopUp{
		UserId:          userID,
		Amount:          creditAmount,
		Money:           float64(amount),
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodOtherManual + ":" + method.Name,
		PaymentProvider: model.PaymentProviderOtherManual,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	message := buildOtherPaymentNotification(tradeNo, userID, amount, creditAmount, method, bankFrom, currency)
	go notifyTelegramOtherPayment(paymentSetting, tradeNo, message, slip.Filename, slipBytes)
	go notifyLineOtherPayment(paymentSetting, message)

	common.ApiSuccess(c, gin.H{
		"trade_no": tradeNo,
		"status":   common.TopUpStatusPending,
	})
}

func OtherPaymentTelegramWebhook(c *gin.Context) {
	var update otherPaymentTelegramUpdate
	if err := c.ShouldBindJSON(&update); err != nil || update.Message == nil {
		common.ApiSuccess(c, nil)
		return
	}

	botToken, ok := telegramApprovalBot(update.Message.Chat.ID)
	if !ok || c.Query("secret") != telegramTopupWebhookSecret(botToken) {
		c.Status(http.StatusUnauthorized)
		return
	}

	action, tradeNo, recognized := parseTelegramTopupCommand(update.Message.Text)
	if !recognized {
		common.ApiSuccess(c, nil)
		return
	}

	isAdmin, err := isTelegramGroupAdmin(botToken, update.Message.Chat.ID, update.Message.From.ID)
	if err != nil {
		common.SysLog(fmt.Sprintf("Telegram topup admin verification failed for update %d: %s", update.UpdateID, err.Error()))
		go sendTelegramCommandMessage(
			botToken,
			update.Message.Chat.ID,
			update.Message.MessageID,
			"ตรวจสอบสิทธิ์แอดมินไม่สำเร็จ กรุณาลองอีกครั้ง",
		)
		common.ApiSuccess(c, nil)
		return
	}
	if !isAdmin {
		go sendTelegramCommandMessage(
			botToken,
			update.Message.Chat.ID,
			update.Message.MessageID,
			"คำสั่งอนุมัติหรือปฏิเสธใช้ได้เฉพาะแอดมินของกลุ่ม",
		)
		common.ApiSuccess(c, nil)
		return
	}

	if tradeNo == "" && update.Message.ReplyToMessage != nil {
		if value, ok := otherPaymentApprovalMessages.Load(otherPaymentApprovalKey(update.Message.Chat.ID, update.Message.ReplyToMessage.MessageID)); ok {
			tradeNo, _ = value.(string)
		}
		if tradeNo == "" {
			tradeNo = tradeNoFromTelegramCaption(update.Message.ReplyToMessage.Caption)
		}
	}

	if tradeNo == "" {
		go sendTelegramCommandMessage(
			botToken,
			update.Message.Chat.ID,
			update.Message.MessageID,
			"ไม่พบเลขที่รายการ กรุณา reply ที่รูปสลิปด้วย 1 เพื่ออนุมัติ หรือ 2 เพื่อปฏิเสธ\nหรือส่ง 1 เลขที่รายการ / 2 เลขที่รายการ",
		)
		common.ApiSuccess(c, nil)
		return
	}

	switch action {
	case telegramTopupApprove:
		err = confirmOtherPaymentTrade(tradeNo, c.ClientIP())
	case telegramTopupReject:
		LockOrder(tradeNo)
		err = model.RejectManualTopUp(tradeNo)
		UnlockOrder(tradeNo)
	}
	if err != nil {
		go sendTelegramCommandMessage(
			botToken,
			update.Message.Chat.ID,
			update.Message.MessageID,
			telegramTopupErrorMessage(action, tradeNo, err),
		)
		common.ApiSuccess(c, nil)
		return
	}

	if update.Message.ReplyToMessage != nil {
		otherPaymentApprovalMessages.Delete(otherPaymentApprovalKey(update.Message.Chat.ID, update.Message.ReplyToMessage.MessageID))
	}

	resultText := fmt.Sprintf("ปฏิเสธรายการ %s แล้ว ไม่มีการเติมเครดิต", tradeNo)
	if action == telegramTopupApprove {
		resultText = fmt.Sprintf("อนุมัติรายการ %s สำเร็จ และเติมเครดิตให้ผู้ใช้แล้ว", tradeNo)
	}
	go sendTelegramCommandMessage(
		botToken,
		update.Message.Chat.ID,
		update.Message.MessageID,
		resultText,
	)
	common.ApiSuccess(c, nil)
}

func OtherPaymentLineWebhook(c *gin.Context) {
	paymentSetting := operation_setting.GetPaymentSetting()
	if paymentSetting.OtherPaymentConfirmSecret == "" || c.Query("secret") != paymentSetting.OtherPaymentConfirmSecret {
		c.Status(http.StatusUnauthorized)
		return
	}

	var payload struct {
		Events []struct {
			Message struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"message"`
		} `json:"events"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		common.ApiSuccess(c, nil)
		return
	}
	for _, event := range payload.Events {
		if event.Message.Type != "text" {
			continue
		}
		if tradeNo := parseOtherPaymentConfirmText(event.Message.Text); tradeNo != "" {
			if err := confirmOtherPaymentTrade(tradeNo, c.ClientIP()); err != nil {
				common.ApiError(c, err)
				return
			}
		}
	}
	common.ApiSuccess(c, nil)
}

func GetEpayClient() *epay.Client {
	if operation_setting.PayAddress == "" || operation_setting.EpayId == "" || operation_setting.EpayKey == "" {
		return nil
	}
	withUrl, err := epay.NewClient(&epay.Config{
		PartnerID: operation_setting.EpayId,
		Key:       operation_setting.EpayKey,
	}, operation_setting.PayAddress)
	if err != nil {
		return nil
	}
	return withUrl
}

func getPayMoney(amount int64, group string) float64 {
	dAmount := decimal.NewFromInt(amount)
	// 充值金额以“展示类型”为准：
	// - USD/CNY: 前端传 amount 为金额单位；TOKENS: 前端传 tokens，需要换成 USD 金额
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		dAmount = dAmount.Div(dQuotaPerUnit)
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	dTopupGroupRatio := decimal.NewFromFloat(topupGroupRatio)
	dPrice := decimal.NewFromFloat(operation_setting.Price)
	// apply optional preset discount by the original request amount (if configured), default 1.0
	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok {
		if ds > 0 {
			discount = ds
		}
	}
	dDiscount := decimal.NewFromFloat(discount)

	payMoney := dAmount.Mul(dPrice).Mul(dTopupGroupRatio).Mul(dDiscount)

	return payMoney.InexactFloat64()
}

func getMinTopup() int64 {
	minTopup := operation_setting.MinTopUp
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dMinTopup := decimal.NewFromInt(int64(minTopup))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		minTopup = int(dMinTopup.Mul(dQuotaPerUnit).IntPart())
	}
	return int64(minTopup)
}

func RequestEpay(c *gin.Context) {
	var req EpayRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < getMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney < 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	if !operation_setting.ContainsPayMethod(req.PaymentMethod) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "支付方式不存在"})
		return
	}

	callBackAddress := service.GetCallbackAddress()
	returnUrl, _ := url.Parse(paymentReturnPath("/console/log"))
	notifyUrl, _ := url.Parse(callBackAddress + "/api/user/epay/notify")
	tradeNo := fmt.Sprintf("%s%d", common.GetRandomString(6), time.Now().Unix())
	tradeNo = fmt.Sprintf("USR%dNO%s", id, tradeNo)
	client := GetEpayClient()
	if client == nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "当前管理员未配置支付信息"})
		return
	}
	uri, params, err := client.Purchase(&epay.PurchaseArgs{
		Type:           req.PaymentMethod,
		ServiceTradeNo: tradeNo,
		Name:           fmt.Sprintf("TUC%d", req.Amount),
		Money:          strconv.FormatFloat(payMoney, 'f', 2, 64),
		Device:         epay.PC,
		NotifyUrl:      notifyUrl,
		ReturnUrl:      returnUrl,
	})
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 拉起支付失败 user_id=%d trade_no=%s payment_method=%s amount=%d error=%q", id, tradeNo, req.PaymentMethod, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(int64(amount))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   req.PaymentMethod,
		PaymentProvider: model.PaymentProviderEpay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	err = topUp.Insert()
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 创建充值订单失败 user_id=%d trade_no=%s payment_method=%s amount=%d error=%q", id, tradeNo, req.PaymentMethod, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("易支付 充值订单创建成功 user_id=%d trade_no=%s payment_method=%s amount=%d money=%.2f uri=%q params=%q", id, tradeNo, req.PaymentMethod, req.Amount, payMoney, uri, common.GetJsonString(params)))
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": params, "url": uri})
}

// tradeNo lock
var orderLocks sync.Map
var createLock sync.Mutex

// refCountedMutex 带引用计数的互斥锁，确保最后一个使用者才从 map 中删除
type refCountedMutex struct {
	mu       sync.Mutex
	refCount int
}

// LockOrder 尝试对给定订单号加锁
func LockOrder(tradeNo string) {
	createLock.Lock()
	var rcm *refCountedMutex
	if v, ok := orderLocks.Load(tradeNo); ok {
		rcm = v.(*refCountedMutex)
	} else {
		rcm = &refCountedMutex{}
		orderLocks.Store(tradeNo, rcm)
	}
	rcm.refCount++
	createLock.Unlock()
	rcm.mu.Lock()
}

// UnlockOrder 释放给定订单号的锁
func UnlockOrder(tradeNo string) {
	v, ok := orderLocks.Load(tradeNo)
	if !ok {
		return
	}
	rcm := v.(*refCountedMutex)
	rcm.mu.Unlock()

	createLock.Lock()
	rcm.refCount--
	if rcm.refCount == 0 {
		orderLocks.Delete(tradeNo)
	}
	createLock.Unlock()
}

func EpayNotify(c *gin.Context) {
	if !isEpayWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("易支付 webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	var params map[string]string

	if c.Request.Method == "POST" {
		// POST 请求：从 POST body 解析参数
		if err := c.Request.ParseForm(); err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 webhook POST 表单解析失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
			_, _ = c.Writer.Write([]byte("fail"))
			return
		}
		params = lo.Reduce(lo.Keys(c.Request.PostForm), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.PostForm.Get(t)
			return r
		}, map[string]string{})
	} else {
		// GET 请求：从 URL Query 解析参数
		params = lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.URL.Query().Get(t)
			return r
		}, map[string]string{})
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("易支付 webhook 收到请求 path=%q client_ip=%s method=%s params=%q", c.Request.RequestURI, c.ClientIP(), c.Request.Method, common.GetJsonString(params)))

	if len(params) == 0 {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("易支付 webhook 参数为空 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	client := GetEpayClient()
	if client == nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 client 未初始化 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, err := c.Writer.Write([]byte("fail"))
		if err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 webhook 响应写入失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		}
		return
	}
	verifyInfo, err := client.Verify(params)
	if err == nil && verifyInfo.VerifyStatus {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("易支付 webhook 验签成功 trade_no=%s callback_type=%s trade_status=%s client_ip=%s verify_info=%q", verifyInfo.ServiceTradeNo, verifyInfo.Type, verifyInfo.TradeStatus, c.ClientIP(), common.GetJsonString(verifyInfo)))
		_, err := c.Writer.Write([]byte("success"))
		if err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 webhook 响应写入失败 trade_no=%s client_ip=%s error=%q", verifyInfo.ServiceTradeNo, c.ClientIP(), err.Error()))
		}
	} else {
		_, err := c.Writer.Write([]byte("fail"))
		if err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 webhook 响应写入失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		}
		if err != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("易支付 webhook 验签失败 path=%q client_ip=%s verify_error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		} else {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("易支付 webhook 验签失败 path=%q client_ip=%s verify_status=false", c.Request.RequestURI, c.ClientIP()))
		}
		return
	}

	if verifyInfo.TradeStatus == epay.StatusTradeSuccess {
		LockOrder(verifyInfo.ServiceTradeNo)
		defer UnlockOrder(verifyInfo.ServiceTradeNo)
		topUp := model.GetTopUpByTradeNo(verifyInfo.ServiceTradeNo)
		if topUp == nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("易支付 回调订单不存在 trade_no=%s callback_type=%s client_ip=%s verify_info=%q", verifyInfo.ServiceTradeNo, verifyInfo.Type, c.ClientIP(), common.GetJsonString(verifyInfo)))
			return
		}
		if topUp.PaymentProvider != model.PaymentProviderEpay {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("易支付 订单支付网关不匹配 trade_no=%s order_provider=%s callback_type=%s client_ip=%s", verifyInfo.ServiceTradeNo, topUp.PaymentProvider, verifyInfo.Type, c.ClientIP()))
			return
		}
		if topUp.Status == common.TopUpStatusPending {
			if topUp.PaymentMethod != verifyInfo.Type {
				logger.LogInfo(c.Request.Context(), fmt.Sprintf("易支付 实际支付方式与订单不同 trade_no=%s order_payment_method=%s actual_type=%s client_ip=%s", verifyInfo.ServiceTradeNo, topUp.PaymentMethod, verifyInfo.Type, c.ClientIP()))
				topUp.PaymentMethod = verifyInfo.Type
			}
			topUp.Status = common.TopUpStatusSuccess
			err := topUp.Update()
			if err != nil {
				logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 更新充值订单失败 trade_no=%s user_id=%d client_ip=%s error=%q topup=%q", topUp.TradeNo, topUp.UserId, c.ClientIP(), err.Error(), common.GetJsonString(topUp)))
				return
			}
			//user, _ := model.GetUserById(topUp.UserId, false)
			//user.Quota += topUp.Amount * 500000
			dAmount := decimal.NewFromInt(int64(topUp.Amount))
			dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
			quotaToAdd := int(dAmount.Mul(dQuotaPerUnit).IntPart())
			err = model.IncreaseUserQuota(topUp.UserId, quotaToAdd, true)
			if err != nil {
				logger.LogError(c.Request.Context(), fmt.Sprintf("易支付 更新用户额度失败 trade_no=%s user_id=%d client_ip=%s quota_to_add=%d error=%q topup=%q", topUp.TradeNo, topUp.UserId, c.ClientIP(), quotaToAdd, err.Error(), common.GetJsonString(topUp)))
				return
			}
			logger.LogInfo(c.Request.Context(), fmt.Sprintf("易支付 充值成功 trade_no=%s user_id=%d client_ip=%s quota_to_add=%d money=%.2f topup=%q", topUp.TradeNo, topUp.UserId, c.ClientIP(), quotaToAdd, topUp.Money, common.GetJsonString(topUp)))
			model.RecordTopupLog(topUp.UserId, fmt.Sprintf("使用在线充值成功，充值金额: %v，支付金额：%f", logger.LogQuota(quotaToAdd), topUp.Money), c.ClientIP(), topUp.PaymentMethod, "epay")
		}
	} else {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("易支付 webhook 忽略事件 trade_no=%s callback_type=%s trade_status=%s client_ip=%s verify_info=%q", verifyInfo.ServiceTradeNo, verifyInfo.Type, verifyInfo.TradeStatus, c.ClientIP(), common.GetJsonString(verifyInfo)))
	}
}

func RequestAmount(c *gin.Context) {
	var req AmountRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getMinTopup())})
		return
	}
	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func GetUserTopUps(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var (
		topups []*model.TopUp
		total  int64
		err    error
	)
	if keyword != "" {
		topups, total, err = model.SearchUserTopUps(userId, keyword, pageInfo)
	} else {
		topups, total, err = model.GetUserTopUps(userId, pageInfo)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

// GetAllTopUps 管理员获取全平台充值记录
func GetAllTopUps(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var (
		topups []*model.TopUp
		total  int64
		err    error
	)
	if keyword != "" {
		topups, total, err = model.SearchAllTopUps(keyword, pageInfo)
	} else {
		topups, total, err = model.GetAllTopUps(pageInfo)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

type AdminCompleteTopupRequest struct {
	TradeNo string `json:"trade_no"`
}

// AdminCompleteTopUp 管理员补单接口
func AdminCompleteTopUp(c *gin.Context) {
	var req AdminCompleteTopupRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TradeNo == "" {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	// 订单级互斥，防止并发补单
	LockOrder(req.TradeNo)
	defer UnlockOrder(req.TradeNo)

	if err := model.ManualCompleteTopUp(req.TradeNo, c.ClientIP()); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}
