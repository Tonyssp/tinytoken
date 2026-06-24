package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseTelegramTopupCommand(t *testing.T) {
	tests := []struct {
		name       string
		text       string
		action     telegramTopupAction
		tradeNo    string
		recognized bool
	}{
		{name: "approve reply", text: "1", action: telegramTopupApprove, recognized: true},
		{name: "approve with trade", text: "1 TRADE-123", action: telegramTopupApprove, tradeNo: "TRADE-123", recognized: true},
		{name: "reject reply", text: "2", action: telegramTopupReject, recognized: true},
		{name: "reject with trade", text: "2 TRADE-456", action: telegramTopupReject, tradeNo: "TRADE-456", recognized: true},
		{name: "approve command", text: "/approve@tiny_admin_bot TRADE-789", action: telegramTopupApprove, tradeNo: "TRADE-789", recognized: true},
		{name: "reject command", text: "/reject TRADE-999", action: telegramTopupReject, tradeNo: "TRADE-999", recognized: true},
		{name: "normal group message", text: "hello", recognized: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			action, tradeNo, recognized := parseTelegramTopupCommand(tt.text)
			assert.Equal(t, tt.action, action)
			assert.Equal(t, tt.tradeNo, tradeNo)
			assert.Equal(t, tt.recognized, recognized)
		})
	}
}

func TestTradeNoFromTelegramCaption(t *testing.T) {
	assert.Equal(t, "THA1ABC", tradeNoFromTelegramCaption("คำขอเติมเครดิต\nเลขที่รายการ: THA1ABC\nUser ID: 1"))
	assert.Equal(t, "LAO1ABC", tradeNoFromTelegramCaption("New top-up\nTrade: LAO1ABC\nUser ID: 2"))
}
