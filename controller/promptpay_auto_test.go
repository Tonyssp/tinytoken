package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestAutoCommandAuthorization(t *testing.T) {
	response, handled := processAutoCommand("/auto_id", 789, false)
	assert.True(t, handled)
	assert.Contains(t, response, "789")
	for _, command := range []string{"/auto on", "/auto_user add 789"} {
		response, handled := processAutoCommand(command, 789, false)
		assert.True(t, handled)
		assert.Contains(t, response, "แอดมินของกลุ่ม")
	}
	fields, recognized := parseAutoCommand("/auto@tiny_bot off")
	assert.True(t, recognized)
	assert.Equal(t, []string{"/auto", "off"}, fields)
}

func TestAuthorizedAutoCommandsPersistAndDisable(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Option{}))
	previousDB := model.DB
	model.DB = db
	t.Cleanup(func() { model.DB = previousDB })
	setting := operation_setting.GetPaymentSetting()
	previousSetting := *setting
	t.Cleanup(func() { *setting = previousSetting })
	setting.PromptPayEnabled = true
	setting.PromptPayTelegramEnabled = true
	setting.PromptPayTelegramBotSecret = "test-token"
	setting.PromptPayTelegramChatId = "-1001"
	setting.PromptPaySlipProvider = "slipok"
	setting.PromptPaySlipApiURL = "https://api.slipok.com/api/line/apikey/branch123"
	setting.PromptPaySlipApiKey = "test-key"
	for _, command := range []string{
		"/auto_timezone Asia/Bangkok", "/auto_time 23:00 08:00", "/auto_user add 41", "/auto_max 100", "/auto on",
	} {
		response, handled := processAutoCommand(command, 123, true)
		require.True(t, handled)
		require.NotContains(t, response, "ไม่สำเร็จ", command)
	}
	cfg, err := model.GetPromptPayAutoConfig()
	require.NoError(t, err)
	assert.True(t, cfg.Enabled)
	assert.Equal(t, []int{41}, cfg.AllowedUserIDs)
	response, handled := processAutoCommand("/auto_user add 123", 999, false)
	assert.True(t, handled)
	assert.Contains(t, response, "แอดมินของกลุ่ม")
	response, handled = processAutoCommand("/auto off", 999, false)
	assert.True(t, handled)
	assert.Contains(t, response, "แอดมินของกลุ่ม")
	cfg, err = model.GetPromptPayAutoConfig()
	require.NoError(t, err)
	assert.True(t, cfg.Enabled)
	response, handled = processAutoCommand("/auto off", 123, true)
	assert.True(t, handled)
	assert.Contains(t, response, "OFF")
	cfg, err = model.GetPromptPayAutoConfig()
	require.NoError(t, err)
	assert.False(t, cfg.Enabled)
}

func TestWhitelistModeCanEnableWithoutSlipOKAndSwitchingDisables(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Option{}))
	previousDB := model.DB
	model.DB = db
	t.Cleanup(func() { model.DB = previousDB })
	setting := operation_setting.GetPaymentSetting()
	previousSetting := *setting
	t.Cleanup(func() { *setting = previousSetting })
	setting.PromptPayEnabled = true
	setting.PromptPayTelegramEnabled = true
	setting.PromptPayTelegramBotSecret = "test-token"
	setting.PromptPayTelegramChatId = "-1001"
	setting.PromptPaySlipProvider = "manual"
	setting.PromptPaySlipApiURL = ""
	setting.PromptPaySlipApiKey = ""
	for _, command := range []string{
		"/auto_timezone Asia/Bangkok", "/auto_time 02:00 08:00", "/auto_user add 41", "/auto_max 60",
		"/auto_mode whitelist", "/auto on",
	} {
		response, handled := processAutoCommand(command, 123, true)
		require.True(t, handled)
		require.NotContains(t, response, "ไม่สำเร็จ", command)
	}
	response, _ := processAutoCommand("/auto_status", 123, true)
	assert.Contains(t, response, "Auto Approve: ON")
	assert.Contains(t, response, "Mode: whitelist")
	assert.Contains(t, response, "NOT USED")
	response, _ = processAutoCommand("/auto_mode verified", 123, true)
	assert.Contains(t, response, "Auto Approve: OFF")
	response, _ = processAutoCommand("/auto on", 123, true)
	assert.Contains(t, response, "SlipOK")
	response, _ = processAutoCommand("/auto_mode whitelist", 999, false)
	assert.Contains(t, response, "แอดมินของกลุ่ม")
	cfg, err := model.GetPromptPayAutoConfig()
	require.NoError(t, err)
	assert.Equal(t, model.PromptPayAutoModeVerified, cfg.EffectiveMode())
	assert.False(t, cfg.Enabled)
}

func TestSlipOKConfigurationIsStrict(t *testing.T) {
	setting := &operation_setting.PaymentSetting{
		PromptPayEnabled: true, PromptPayTelegramEnabled: true,
		PromptPayTelegramBotSecret: "test-token", PromptPayTelegramChatId: "-1001",
		PromptPaySlipProvider: "slipok", PromptPaySlipApiURL: "https://api.slipok.com/api/line/apikey/branch123",
		PromptPaySlipApiKey: "test-key",
	}
	assert.True(t, slipOKConfigured(setting))
	setting.PromptPaySlipApiURL = "http://api.slipok.com/api/line/apikey/branch123"
	assert.False(t, slipOKConfigured(setting))
	setting.PromptPaySlipApiURL = "https://api.slipok.com.evil.example/api/line/apikey/branch123"
	assert.False(t, slipOKConfigured(setting))
	setting.PromptPaySlipApiURL = "https://api.slipok.com/api/line/apikey/branch123"
	setting.PromptPaySlipProvider = "manual"
	assert.False(t, slipOKConfigured(setting))
}

func TestSlipOKVerification(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	topup := &model.TopUp{Money: 35, CreateTime: now.Add(-time.Minute).Unix()}
	response := map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"success": true, "transRef": "010092101507665143", "transTimestamp": now.Format(time.RFC3339),
			"receivingBank": "006", "countryCode": "TH", "amount": 35,
			"receiver": map[string]interface{}{"account": map[string]string{"value": "xxx-x-x3109-x"}},
		},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, "test-key", r.Header.Get("x-authorization"))
		require.NoError(t, r.ParseMultipartForm(6*1024*1024))
		require.Equal(t, "true", r.FormValue("log"))
		require.Equal(t, "35", r.FormValue("amount"))
		if strings.Contains(r.URL.Path, "reject") {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		require.NoError(t, json.NewEncoder(w).Encode(response))
	}))
	defer server.Close()
	ref, err := verifySlipOK(t.Context(), server.Client(), server.URL, "test-key", "slip.png", []byte("image"), topup, now)
	require.NoError(t, err)
	assert.Equal(t, "010092101507665143", ref)
	_, err = verifySlipOK(t.Context(), server.Client(), server.URL+"/reject", "test-key", "slip.png", []byte("image"), topup, now)
	require.Error(t, err)
	response["data"].(map[string]interface{})["amount"] = 34
	_, err = verifySlipOK(t.Context(), server.Client(), server.URL, "test-key", "slip.png", []byte("image"), topup, now)
	require.Error(t, err)
	response["data"].(map[string]interface{})["amount"] = 35
	response["data"].(map[string]interface{})["success"] = false
	_, err = verifySlipOK(t.Context(), server.Client(), server.URL, "test-key", "slip.png", []byte("image"), topup, now)
	require.Error(t, err)
}
