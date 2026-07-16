package controller

import (
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const userLeaderboardLimit = 20

type userLeaderboardConfigEntry struct {
	Type             string `json:"type"`
	Enabled          *bool  `json:"enabled,omitempty"`
	UserID           int    `json:"user_id,omitempty"`
	DisplayName      string `json:"display_name"`
	RequestCount     int64  `json:"request_count,omitempty"`
	UsedQuota        int64  `json:"used_quota,omitempty"`
	PromptTokens     int64  `json:"prompt_tokens,omitempty"`
	CompletionTokens int64  `json:"completion_tokens,omitempty"`
	CacheWriteTokens int64  `json:"cache_write_tokens,omitempty"`
	CacheReadTokens  int64  `json:"cache_read_tokens,omitempty"`
	TopModel         string `json:"top_model,omitempty"`
}

type userLeaderboardCandidate struct {
	UserID           int    `json:"user_id"`
	Username         string `json:"username"`
	DisplayName      string `json:"display_name"`
	RequestCount     int64  `json:"request_count"`
	UsedQuota        int64  `json:"used_quota"`
	PromptTokens     int64  `json:"prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens"`
	CacheWriteTokens int64  `json:"cache_write_tokens"`
	CacheReadTokens  int64  `json:"cache_read_tokens"`
	TopModel         string `json:"top_model"`
}

type publicUserLeaderboardEntry struct {
	Rank             int    `json:"rank"`
	Type             string `json:"type"`
	DisplayName      string `json:"display_name"`
	RequestCount     int64  `json:"request_count"`
	UsedQuota        int64  `json:"used_quota"`
	PromptTokens     int64  `json:"prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens"`
	CacheWriteTokens int64  `json:"cache_write_tokens"`
	CacheReadTokens  int64  `json:"cache_read_tokens"`
	TopModel         string `json:"top_model"`
}

func getUserLeaderboardOption(key, fallback string) string {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	value, exists := common.OptionMap[key]
	if !exists {
		return fallback
	}
	return common.Interface2String(value)
}

func parseUserLeaderboardEntries(raw string) ([]userLeaderboardConfigEntry, error) {
	entries := make([]userLeaderboardConfigEntry, 0)
	if strings.TrimSpace(raw) == "" {
		return entries, nil
	}
	if err := common.UnmarshalJsonStr(raw, &entries); err != nil {
		return nil, fmt.Errorf("invalid user leaderboard configuration: %w", err)
	}
	if len(entries) > userLeaderboardLimit {
		return nil, fmt.Errorf("user leaderboard supports at most %d users", userLeaderboardLimit)
	}
	seenRealUsers := make(map[int]struct{}, len(entries))
	for i := range entries {
		entry := &entries[i]
		entry.Type = strings.TrimSpace(strings.ToLower(entry.Type))
		if entry.Type == "" {
			if entry.UserID > 0 {
				entry.Type = "real"
			} else {
				entry.Type = "fake"
			}
		}
		if entry.Type != "real" && entry.Type != "fake" {
			return nil, fmt.Errorf("leaderboard entry type must be real or fake")
		}
		if utf8.RuneCountInString(strings.TrimSpace(entry.DisplayName)) > 40 {
			return nil, fmt.Errorf("public display name must not exceed 40 characters")
		}
		if utf8.RuneCountInString(strings.TrimSpace(entry.TopModel)) > 80 {
			return nil, fmt.Errorf("top model must not exceed 80 characters")
		}
		if entry.RequestCount < 0 || entry.UsedQuota < 0 || entry.PromptTokens < 0 ||
			entry.CompletionTokens < 0 || entry.CacheWriteTokens < 0 || entry.CacheReadTokens < 0 {
			return nil, fmt.Errorf("leaderboard metrics must not be negative")
		}
		if entry.Type == "real" {
			if entry.UserID <= 0 {
				return nil, fmt.Errorf("user_id must be positive")
			}
			if _, exists := seenRealUsers[entry.UserID]; exists {
				return nil, fmt.Errorf("duplicate user_id: %d", entry.UserID)
			}
			seenRealUsers[entry.UserID] = struct{}{}
		} else if strings.TrimSpace(entry.DisplayName) == "" {
			return nil, fmt.Errorf("fake leaderboard entry requires a display name")
		}
	}
	return entries, nil
}

func userLeaderboardEntryEnabled(entry userLeaderboardConfigEntry) bool {
	return entry.Enabled == nil || *entry.Enabled
}

func validateUserLeaderboardEntries(raw string) error {
	_, err := parseUserLeaderboardEntries(raw)
	return err
}

func userLeaderboardStartTime(period string) (int64, error) {
	now := time.Now()
	switch period {
	case "today":
		return now.Add(-24 * time.Hour).Unix(), nil
	case "week":
		return now.Add(-7 * 24 * time.Hour).Unix(), nil
	case "month":
		return now.Add(-30 * 24 * time.Hour).Unix(), nil
	case "year":
		return now.Add(-365 * 24 * time.Hour).Unix(), nil
	case "all":
		return 0, nil
	default:
		return 0, fmt.Errorf("invalid leaderboard period")
	}
}

func maskLeaderboardName(value string) string {
	runes := []rune(strings.TrimSpace(value))
	if len(runes) == 0 {
		return "ผู้ใช้ TinyAPI"
	}
	if len(runes) == 1 {
		return string(runes[0]) + "••"
	}
	if len(runes) == 2 {
		return string(runes[0]) + "•"
	}
	return string(runes[0]) + "•••" + string(runes[len(runes)-1])
}

func GetUserLeaderboardCandidates(c *gin.Context) {
	period := c.DefaultQuery("period", "month")
	startTime, err := userLeaderboardStartTime(period)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	usage, err := model.GetUserLeaderboardUsage(nil, startTime, 100)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	if len(usage) == 0 {
		users, fallbackErr := model.GetLeaderboardFallbackUsers(100)
		if fallbackErr != nil {
			common.ApiError(c, fallbackErr)
			return
		}
		candidates := make([]userLeaderboardCandidate, 0, len(users))
		for _, user := range users {
			candidates = append(candidates, userLeaderboardCandidate{
				UserID:       user.Id,
				Username:     user.Username,
				DisplayName:  user.DisplayName,
				RequestCount: int64(user.RequestCount),
				UsedQuota:    int64(user.UsedQuota),
			})
		}
		common.ApiSuccess(c, candidates)
		return
	}

	userIDs := make([]int, 0, len(usage))
	for _, item := range usage {
		userIDs = append(userIDs, item.UserID)
	}
	usersByID, err := model.GetLeaderboardUsersByIDs(userIDs)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	candidates := make([]userLeaderboardCandidate, 0, len(usage))
	for _, item := range usage {
		user := usersByID[item.UserID]
		if user == nil {
			continue
		}
		candidates = append(candidates, userLeaderboardCandidate{
			UserID:           user.Id,
			Username:         user.Username,
			DisplayName:      user.DisplayName,
			RequestCount:     item.RequestCount,
			UsedQuota:        item.UsedQuota,
			PromptTokens:     item.PromptTokens,
			CompletionTokens: item.CompletionTokens,
			TopModel:         item.TopModel,
		})
	}
	common.ApiSuccess(c, candidates)
}

func GetPublicUserLeaderboard(c *gin.Context) {
	period := c.DefaultQuery("period", "month")
	startTime, err := userLeaderboardStartTime(period)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	enabled := getUserLeaderboardOption("UserLeaderboardEnabled", "false") == "true"
	entries, err := parseUserLeaderboardEntries(getUserLeaderboardOption("UserLeaderboardEntries", "[]"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if !enabled || len(entries) == 0 {
		common.ApiSuccess(c, gin.H{"enabled": enabled, "period": period, "users": []publicUserLeaderboardEntry{}})
		return
	}

	userIDs := make([]int, 0, len(entries))
	for _, entry := range entries {
		if entry.Type == "real" && userLeaderboardEntryEnabled(entry) {
			userIDs = append(userIDs, entry.UserID)
		}
	}
	usage := make([]model.UserLeaderboardUsage, 0)
	if len(userIDs) > 0 {
		usage, err = model.GetUserLeaderboardUsage(userIDs, startTime, 0)
		if err != nil {
			common.ApiError(c, err)
			return
		}
	}
	usageByID := make(map[int]model.UserLeaderboardUsage, len(usage))
	for _, item := range usage {
		usageByID[item.UserID] = item
	}
	usersByID, err := model.GetLeaderboardUsersByIDs(userIDs)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	publicEntries := make([]publicUserLeaderboardEntry, 0, len(entries))
	for _, entry := range entries {
		if !userLeaderboardEntryEnabled(entry) {
			continue
		}
		if entry.Type == "fake" {
			publicEntries = append(publicEntries, publicUserLeaderboardEntry{
				Rank:             len(publicEntries) + 1,
				Type:             "fake",
				DisplayName:      strings.TrimSpace(entry.DisplayName),
				RequestCount:     entry.RequestCount,
				UsedQuota:        entry.UsedQuota,
				PromptTokens:     entry.PromptTokens,
				CompletionTokens: entry.CompletionTokens,
				CacheWriteTokens: entry.CacheWriteTokens,
				CacheReadTokens:  entry.CacheReadTokens,
				TopModel:         strings.TrimSpace(entry.TopModel),
			})
			continue
		}

		user := usersByID[entry.UserID]
		if user == nil {
			continue
		}
		name := strings.TrimSpace(entry.DisplayName)
		if name == "" {
			name = maskLeaderboardName(user.Username)
		}
		item := usageByID[entry.UserID]
		publicEntries = append(publicEntries, publicUserLeaderboardEntry{
			Rank:             len(publicEntries) + 1,
			Type:             "real",
			DisplayName:      name,
			RequestCount:     item.RequestCount,
			UsedQuota:        item.UsedQuota,
			PromptTokens:     item.PromptTokens,
			CompletionTokens: item.CompletionTokens,
			TopModel:         item.TopModel,
		})
	}

	common.ApiSuccess(c, gin.H{"enabled": true, "period": period, "users": publicEntries})
}
