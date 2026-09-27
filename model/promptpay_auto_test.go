package model

import (
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func readyAutoConfig(now time.Time) PromptPayAutoConfig {
	return PromptPayAutoConfig{
		Enabled:        true,
		Start:          now.Add(-time.Hour).UTC().Format("15:04"),
		End:            now.Add(time.Hour).UTC().Format("15:04"),
		Timezone:       "UTC",
		AllowedUserIDs: []int{701},
		MaxAmountTHB:   100,
	}
}

func TestPromptPayAutoConfigAndEligibility(t *testing.T) {
	truncateTables(t)
	now := time.Date(2026, 9, 27, 1, 0, 0, 0, time.UTC)
	cfg := PromptPayAutoConfig{
		Enabled: true, Start: "23:00", End: "08:00", Timezone: "Asia/Bangkok",
		AllowedUserIDs: []int{701}, MaxAmountTHB: 100,
	}
	_, err := UpdatePromptPayAutoConfig(func(saved *PromptPayAutoConfig) error { *saved = cfg; return nil })
	require.NoError(t, err)
	loaded, err := GetPromptPayAutoConfig()
	require.NoError(t, err)
	assert.Equal(t, cfg, loaded)
	topup := &TopUp{UserId: 701, Money: 35, TradeNo: "THA701NOABC1231790455621", Status: common.TopUpStatusPending, PaymentProvider: PaymentProviderPromptPay}
	assert.True(t, loaded.Allows(topup, time.Date(2026, 9, 26, 17, 0, 0, 0, time.UTC))) // 00:00 Bangkok
	assert.True(t, loaded.Allows(topup, time.Date(2026, 9, 27, 0, 59, 0, 0, time.UTC))) // 07:59 Bangkok
	assert.False(t, loaded.Allows(topup, now))                                          // 08:00 Bangkok
	blocked := loaded
	blocked.Enabled = false
	assert.False(t, blocked.Allows(topup, now.Add(-time.Minute)))
	blocked = loaded
	blocked.AllowedUserIDs = []int{702}
	assert.False(t, blocked.Allows(topup, now.Add(-time.Minute)))
	blocked = loaded
	blocked.MaxAmountTHB = 34
	assert.False(t, blocked.Allows(topup, now.Add(-time.Minute)))
	blocked = loaded
	blocked.Timezone = "invalid/zone"
	assert.False(t, blocked.Allows(topup, now.Add(-time.Minute)))
	blocked = loaded
	blocked.Start = "not-a-time"
	assert.False(t, blocked.Allows(topup, now.Add(-time.Minute)))
	blocked = loaded
	blocked.Start, blocked.End = "00:00", "08:00"
	assert.True(t, blocked.Allows(topup, now.Add(-time.Minute)))
	topup.TradeNo = "invalid"
	assert.False(t, blocked.Allows(topup, now.Add(-time.Minute)))
}

func TestAutoAndManualApproveOnce(t *testing.T) {
	truncateTables(t)
	now := time.Now()
	_, err := UpdatePromptPayAutoConfig(func(cfg *PromptPayAutoConfig) error { *cfg = readyAutoConfig(now); return nil })
	require.NoError(t, err)
	insertUserForPaymentGuardTest(t, 701, 100)
	topup := &TopUp{UserId: 701, Amount: 30, Money: 30, TradeNo: "THA701NOABC1231790455622", PaymentMethod: PaymentMethodPromptPay,
		PaymentProvider: PaymentProviderPromptPay, Status: common.TopUpStatusPending, CreateTime: now.Unix()}
	require.NoError(t, topup.Insert())
	start := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		<-start
		_, _ = AutoCompletePromptPayTopUp(topup.TradeNo, "", "bank-ref-race-123")
	}()
	go func() {
		defer wg.Done()
		<-start
		_, _ = ManualCompleteTopUpFromTelegram(topup.TradeNo, "", 99887)
	}()
	close(start)
	wg.Wait()
	wantAdded := int(decimal.NewFromInt(30).Mul(decimal.NewFromFloat(common.QuotaPerUnit)).IntPart())
	assert.Equal(t, 100+wantAdded, getUserQuotaForPaymentGuardTest(t, 701))
	completed := GetTopUpByTradeNo(topup.TradeNo)
	require.NotNil(t, completed)
	assert.Equal(t, common.TopUpStatusSuccess, completed.Status)
	var audit TopUpApproval
	require.NoError(t, DB.Where("top_up_id = ?", completed.Id).First(&audit).Error)
	assert.Contains(t, []string{"AUTO", "MANUAL"}, audit.Method)
	if audit.Method == "MANUAL" {
		assert.Equal(t, int64(99887), audit.TelegramAdminID)
	}
	var approvalLogs int64
	require.NoError(t, DB.Model(&Log{}).Where("type = ? AND content LIKE ?", LogTypeTopup, "%"+topup.TradeNo+"%").Count(&approvalLogs).Error)
	assert.EqualValues(t, 1, approvalLogs)
	approved, err := ManualCompleteTopUpFromTelegram(topup.TradeNo, "", 99887)
	require.NoError(t, err)
	assert.False(t, approved)
	assert.Equal(t, 100+wantAdded, getUserQuotaForPaymentGuardTest(t, 701))
}

func TestAutoRejectsRepeatedBankReference(t *testing.T) {
	truncateTables(t)
	_, err := UpdatePromptPayAutoConfig(func(cfg *PromptPayAutoConfig) error { *cfg = readyAutoConfig(time.Now()); return nil })
	require.NoError(t, err)
	insertUserForPaymentGuardTest(t, 701, 100)
	trades := []string{"THA701NOABC1231790455623", "THA701NOABC1231790455624"}
	for _, trade := range trades {
		require.NoError(t, (&TopUp{UserId: 701, Amount: 30, Money: 30, TradeNo: trade, PaymentMethod: PaymentMethodPromptPay,
			PaymentProvider: PaymentProviderPromptPay, Status: common.TopUpStatusPending, CreateTime: time.Now().Unix()}).Insert())
	}
	approved, err := AutoCompletePromptPayTopUp(trades[0], "", "same-bank-ref-123")
	require.NoError(t, err)
	assert.True(t, approved)
	approved, err = AutoCompletePromptPayTopUp(trades[1], "", "same-bank-ref-123")
	require.Error(t, err)
	assert.False(t, approved)
	assert.Equal(t, common.TopUpStatusPending, GetTopUpByTradeNo(trades[1]).Status)
	wantAdded := int(decimal.NewFromInt(30).Mul(decimal.NewFromFloat(common.QuotaPerUnit)).IntPart())
	assert.Equal(t, 100+wantAdded, getUserQuotaForPaymentGuardTest(t, 701))
}

func TestAutoOffLeavesPendingAndManualStillWorks(t *testing.T) {
	truncateTables(t)
	_, err := UpdatePromptPayAutoConfig(func(cfg *PromptPayAutoConfig) error { *cfg = readyAutoConfig(time.Now()); return nil })
	require.NoError(t, err)
	require.NoError(t, DisablePromptPayAutoConfig())
	insertUserForPaymentGuardTest(t, 701, 100)
	topup := &TopUp{UserId: 701, Amount: 25, Money: 25, TradeNo: "THA701NOABC1231790455625", PaymentMethod: PaymentMethodPromptPay,
		PaymentProvider: PaymentProviderPromptPay, Status: common.TopUpStatusPending, CreateTime: time.Now().Unix()}
	require.NoError(t, topup.Insert())
	approved, err := AutoCompletePromptPayTopUp(topup.TradeNo, "", "bank-ref-off-123")
	require.Error(t, err)
	assert.False(t, approved)
	assert.Equal(t, common.TopUpStatusPending, GetTopUpByTradeNo(topup.TradeNo).Status)
	assert.Equal(t, 100, getUserQuotaForPaymentGuardTest(t, 701))
	approved, err = ManualCompleteTopUpFromTelegram(topup.TradeNo, "", 99887)
	require.NoError(t, err)
	assert.True(t, approved)
	completed := GetTopUpByTradeNo(topup.TradeNo)
	var audit TopUpApproval
	require.NoError(t, DB.Where("top_up_id = ?", completed.Id).First(&audit).Error)
	assert.Equal(t, "MANUAL", audit.Method)
	assert.Equal(t, int64(99887), audit.TelegramAdminID)
}

func TestAutoConfigInvalidFailsClosed(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.Create(&Option{Key: promptPayAutoOptionKey, Value: "not-json"}).Error)
	_, err := GetPromptPayAutoConfig()
	require.Error(t, err)
	insertUserForPaymentGuardTest(t, 701, 100)
	topup := &TopUp{UserId: 701, Amount: 25, Money: 25, TradeNo: "THA701NOABC1231790455626", PaymentMethod: PaymentMethodPromptPay,
		PaymentProvider: PaymentProviderPromptPay, Status: common.TopUpStatusPending, CreateTime: time.Now().Unix()}
	require.NoError(t, topup.Insert())
	approved, err := AutoCompletePromptPayTopUp(topup.TradeNo, "", "valid-bank-ref-123")
	require.Error(t, err)
	assert.False(t, approved)
	assert.Equal(t, common.TopUpStatusPending, GetTopUpByTradeNo(topup.TradeNo).Status)
	assert.Equal(t, 100, getUserQuotaForPaymentGuardTest(t, 701))
	require.NoError(t, DisablePromptPayAutoConfig())
	cfg, err := GetPromptPayAutoConfig()
	require.NoError(t, err)
	assert.False(t, cfg.Enabled)
}
