package model

import (
	"context"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/require"
)

func TestGetObservedChannelStatus(t *testing.T) {
	truncateTables(t)
	now := time.Unix(1_790_000_000, 0)
	channels := []Channel{
		{Id: 1101, Type: constant.ChannelTypeOpenAI, Key: "test", Name: "private-openai", Status: common.ChannelStatusEnabled},
		{Id: 1102, Type: constant.ChannelTypeOpenAI, Key: "test", Name: "private-openai-two", Status: common.ChannelStatusEnabled},
		{Id: 1103, Type: constant.ChannelTypeGemini, Key: "test", Name: "private-gemini", Status: common.ChannelStatusEnabled},
		{Id: 1104, Type: constant.ChannelTypeAnthropic, Key: "test", Name: "disabled", Status: common.ChannelStatusManuallyDisabled},
	}
	require.NoError(t, DB.Create(&channels).Error)
	logs := []Log{
		{ChannelId: 1101, Type: LogTypeConsume, CreatedAt: now.Unix() - 30},
		{ChannelId: 1102, Type: LogTypeConsume, CreatedAt: now.Unix() - 60},
		{ChannelId: 1101, Type: LogTypeError, CreatedAt: now.Unix() - 90},
		{ChannelId: 1103, Type: LogTypeConsume, CreatedAt: now.Unix() - 2*3600},
		{ChannelId: 1104, Type: LogTypeError, CreatedAt: now.Unix() - 30},
		{ChannelId: 1101, Type: LogTypeConsume, CreatedAt: now.Unix() - 25*3600},
		{ChannelId: 1101, Type: LogTypeConsume, CreatedAt: now.Unix() + 60},
	}
	require.NoError(t, LOG_DB.Create(&logs).Error)

	statuses, err := GetObservedChannelStatus(context.Background(), now)
	require.NoError(t, err)
	require.Len(t, statuses, 2)
	require.Equal(t, "OpenAI", statuses[0].Name)
	require.True(t, statuses[0].HasRequests)
	require.InDelta(t, 2.0/3.0, statuses[0].SuccessRate, 0.0001)
	require.Equal(t, 0, statuses[0].Status)
	require.Equal(t, 0, statuses[0].History[17])
	require.Equal(t, "Gemini", statuses[1].Name)
	require.Equal(t, -1, statuses[1].Status)
	require.Len(t, statuses[1].History, observedStatusBuckets)
}

func TestObservedStatusWithoutRequests(t *testing.T) {
	require.Equal(t, -1, observedStatus(observedCounts{}))
	require.Equal(t, 1, observedStatus(observedCounts{success: 19, errors: 1}))
	require.Equal(t, 2, observedStatus(observedCounts{success: 9, errors: 1}))
	require.Equal(t, 0, observedStatus(observedCounts{errors: 1}))
}
