package model

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestGetUsageSummaryFiltersUserAndDate(t *testing.T) {
	truncateTables(t)
	now := time.Now().Unix()
	logs := []Log{
		{UserId: 7, Username: "alice", CreatedAt: now - 60, Type: LogTypeConsume, ModelName: "gpt-5.5", Group: "default", RequestPath: "/v1/responses", PromptTokens: 100, CompletionTokens: 20, Quota: 50, UseTime: 12},
		{UserId: 7, Username: "alice", CreatedAt: now - 30, Type: LogTypeError, ModelName: "gpt-5.5", Group: "default", RequestPath: "/v1/responses", UseTime: 4},
		{UserId: 8, Username: "bob", CreatedAt: now - 20, Type: LogTypeConsume, ModelName: "gpt-6-sol", Group: "other", RequestPath: "/v1/chat/completions", PromptTokens: 500, Quota: 200},
		{UserId: 7, Username: "alice", CreatedAt: now - 86400, Type: LogTypeConsume, ModelName: "old", Group: "default", PromptTokens: 900, Quota: 500},
	}
	require.NoError(t, LOG_DB.Create(&logs).Error)

	summary, err := GetUsageSummary(7, "", now-3600, now)
	require.NoError(t, err)
	require.Equal(t, int64(2), summary.Totals.Requests)
	require.Equal(t, int64(120), summary.Totals.Tokens)
	require.Equal(t, int64(50), summary.Totals.Quota)
	require.Equal(t, 8.0, summary.Totals.AvgSeconds)
	require.Equal(t, []UsageSummaryGroup{{Name: "gpt-5.5", Requests: 2, Tokens: 120, Quota: 50}}, summary.Models)
	require.Equal(t, []UsageSummaryGroup{{Name: "/v1/responses", Requests: 2, Tokens: 120, Quota: 50}}, summary.Endpoints)

	adminSummary, err := GetUsageSummary(0, "bob", now-3600, now)
	require.NoError(t, err)
	require.Equal(t, int64(1), adminSummary.Totals.Requests)
	require.Equal(t, int64(500), adminSummary.Totals.Tokens)
}
