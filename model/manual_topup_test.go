package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRejectManualTopUp(t *testing.T) {
	truncateTables(t)
	insertUserForPaymentGuardTest(t, 501, 100)

	topUp := &TopUp{
		UserId:          501,
		Amount:          50,
		Money:           50,
		TradeNo:         "promptpay-reject-test",
		PaymentMethod:   PaymentMethodPromptPay,
		PaymentProvider: PaymentProviderPromptPay,
		Status:          common.TopUpStatusPending,
		CreateTime:      time.Now().Unix(),
	}
	require.NoError(t, topUp.Insert())

	require.NoError(t, RejectManualTopUp(topUp.TradeNo))
	rejected := GetTopUpByTradeNo(topUp.TradeNo)
	require.NotNil(t, rejected)
	assert.Equal(t, common.TopUpStatusFailed, rejected.Status)
	assert.NotZero(t, rejected.CompleteTime)
	assert.Equal(t, 100, getUserQuotaForPaymentGuardTest(t, 501))

	require.NoError(t, RejectManualTopUp(topUp.TradeNo))
	assert.Equal(t, 100, getUserQuotaForPaymentGuardTest(t, 501))
}

func TestRejectManualTopUpRejectsNonManualProvider(t *testing.T) {
	truncateTables(t)
	insertUserForPaymentGuardTest(t, 502, 100)
	insertTopUpForPaymentGuardTest(t, "stripe-reject-test", 502, PaymentProviderStripe)

	err := RejectManualTopUp("stripe-reject-test")
	require.ErrorIs(t, err, ErrManualTopUpProviderInvalid)
	assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, "stripe-reject-test"))
	assert.Equal(t, 100, getUserQuotaForPaymentGuardTest(t, 502))
}
