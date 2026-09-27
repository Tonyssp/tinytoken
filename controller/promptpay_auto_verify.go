package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/shopspring/decimal"
)

var slipOKBranchPattern = regexp.MustCompile(`^/api/line/apikey/[A-Za-z0-9_-]+/?$`)
var slipOKReferencePattern = regexp.MustCompile(`^[A-Za-z0-9_-]{8,128}$`)

func slipOKConfigured(setting *operation_setting.PaymentSetting) bool {
	if setting == nil || !setting.PromptPayEnabled || !setting.PromptPayTelegramEnabled ||
		strings.TrimSpace(setting.PromptPayTelegramBotSecret) == "" ||
		strings.TrimSpace(setting.PromptPayTelegramChatId) == "" ||
		!strings.EqualFold(setting.PromptPaySlipProvider, "slipok") ||
		strings.TrimSpace(setting.PromptPaySlipApiKey) == "" {
		return false
	}
	endpoint, err := url.Parse(strings.TrimSpace(setting.PromptPaySlipApiURL))
	_, chatErr := strconv.ParseInt(strings.TrimSpace(setting.PromptPayTelegramChatId), 10, 64)
	return err == nil && chatErr == nil && endpoint.Scheme == "https" && endpoint.Host == "api.slipok.com" &&
		endpoint.User == nil && endpoint.RawQuery == "" && endpoint.Fragment == "" &&
		slipOKBranchPattern.MatchString(endpoint.Path)
}

type slipOKCheckResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Success           bool        `json:"success"`
		TransRef          string      `json:"transRef"`
		TransDate         string      `json:"transDate"`
		TransTime         string      `json:"transTime"`
		TransTimestamp    string      `json:"transTimestamp"`
		ReceivingBank     string      `json:"receivingBank"`
		CountryCode       string      `json:"countryCode"`
		PaidLocalCurrency string      `json:"paidLocalCurrency"`
		Amount            json.Number `json:"amount"`
		Receiver          struct {
			Account struct {
				Value string `json:"value"`
			} `json:"account"`
			Proxy struct {
				Value string `json:"value"`
			} `json:"proxy"`
		} `json:"receiver"`
	} `json:"data"`
}

func slipOKPaymentTime(data slipOKCheckResponse) (time.Time, error) {
	if data.Data.TransTimestamp != "" {
		return time.Parse(time.RFC3339Nano, data.Data.TransTimestamp)
	}
	location, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		return time.Time{}, err
	}
	return time.ParseInLocation("20060102 15:04:05", data.Data.TransDate+" "+data.Data.TransTime, location)
}

func validatedSlipOKReference(data slipOKCheckResponse, topUp *model.TopUp, now time.Time) (string, error) {
	if topUp == nil || !data.Success || !data.Data.Success ||
		!slipOKReferencePattern.MatchString(data.Data.TransRef) ||
		data.Data.CountryCode != "TH" || data.Data.ReceivingBank == "" ||
		(data.Data.Receiver.Account.Value == "" && data.Data.Receiver.Proxy.Value == "") ||
		(data.Data.PaidLocalCurrency != "" && data.Data.PaidLocalCurrency != "764") {
		return "", errors.New("slip verification is incomplete")
	}
	amount, err := decimal.NewFromString(data.Data.Amount.String())
	if err != nil || !amount.Equal(decimal.NewFromFloat(topUp.Money)) {
		return "", errors.New("slip amount differs from top-up")
	}
	paidAt, err := slipOKPaymentTime(data)
	if err != nil || paidAt.Before(time.Unix(topUp.CreateTime, 0).Add(-time.Hour)) || paidAt.After(now.Add(5*time.Minute)) {
		return "", errors.New("slip payment time is outside the safe order window")
	}
	return data.Data.TransRef, nil
}

func verifySlipOK(ctx context.Context, client *http.Client, endpoint, apiKey, filename string, slip []byte, topUp *model.TopUp, now time.Time) (string, error) {
	if topUp == nil || len(slip) == 0 || len(slip) > 5*1024*1024 {
		return "", errors.New("invalid slip")
	}
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".jpg", ".jpeg", ".png", ".webp", ".jfif":
	default:
		return "", errors.New("unsupported slip format")
	}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("files", filepath.Base(filename))
	if err != nil {
		return "", err
	}
	if _, err := part.Write(slip); err != nil {
		return "", err
	}
	if err := writer.WriteField("log", "true"); err != nil {
		return "", err
	}
	if err := writer.WriteField("amount", strconv.FormatInt(int64(topUp.Money), 10)); err != nil {
		return "", err
	}
	if err := writer.Close(); err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("x-authorization", apiKey)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("SlipOK returned HTTP %d", resp.StatusCode)
	}
	var parsed slipOKCheckResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&parsed); err != nil {
		return "", err
	}
	return validatedSlipOKReference(parsed, topUp, now)
}

func tryAutoApprovePromptPay(topUp *model.TopUp, filename string, slip []byte, callerIP string) {
	cfg, err := model.GetPromptPayAutoConfig()
	if err != nil || !cfg.Allows(topUp, time.Now()) {
		return
	}
	setting := operation_setting.GetPaymentSetting()
	if !slipOKConfigured(setting) {
		return
	}
	client := &http.Client{
		Timeout:       10 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	ref, err := verifySlipOK(ctx, client, setting.PromptPaySlipApiURL, setting.PromptPaySlipApiKey, filename, slip, topUp, time.Now())
	if err != nil {
		common.SysLog("PromptPay auto verification left pending trade=" + topUp.TradeNo + " reason=" + err.Error())
		return
	}
	approved, err := model.AutoCompletePromptPayTopUp(topUp.TradeNo, callerIP, ref)
	if err != nil || !approved {
		if err != nil {
			common.SysLog("PromptPay auto approval left pending trade=" + topUp.TradeNo + " because the database or rule check failed")
		}
		return
	}
	chatID, err := strconv.ParseInt(strings.TrimSpace(setting.PromptPayTelegramChatId), 10, 64)
	if err == nil {
		sendTelegramCommandMessage(setting.PromptPayTelegramBotSecret, chatID, 0,
			fmt.Sprintf("Auto Approved\nTransaction: %s\nUser ID: %d\nAmount: %.0f THB\nCredit: %d\nReason: verified PromptPay slip and Auto Approve rule matched", topUp.TradeNo, topUp.UserId, topUp.Money, topUp.Amount))
	}
}
