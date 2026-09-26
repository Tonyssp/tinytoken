package model

import (
	"time"

	"gorm.io/gorm"
)

type UsageSummaryTotals struct {
	Requests   int64   `json:"requests"`
	Tokens     int64   `json:"tokens"`
	Quota      int64   `json:"quota"`
	AvgSeconds float64 `json:"avg_seconds"`
}

type UsageSummaryGroup struct {
	Name     string `json:"name"`
	Requests int64  `json:"requests"`
	Tokens   int64  `json:"tokens"`
	Quota    int64  `json:"quota"`
}

type UsageSummary struct {
	Totals    UsageSummaryTotals  `json:"totals"`
	Models    []UsageSummaryGroup `json:"models"`
	Groups    []UsageSummaryGroup `json:"groups"`
	Endpoints []UsageSummaryGroup `json:"endpoints"`
}

func GetUsageSummary(userId int, username string, start, end int64) (UsageSummary, error) {
	now := time.Now().Unix()
	if end == 0 || end > now {
		end = now
	}
	if start == 0 {
		start = end - 30*24*3600
	} else if start < end-90*24*3600 {
		start = end - 90*24*3600
	}
	base := func() *gorm.DB {
		query := LOG_DB.Model(&Log{}).Where("type IN ? AND created_at BETWEEN ? AND ?", []int{LogTypeConsume, LogTypeError}, start, end)
		if userId > 0 {
			query = query.Where("user_id = ?", userId)
		} else if username != "" {
			query = query.Where("username = ?", username)
		}
		return query
	}
	summary := UsageSummary{
		Models:    []UsageSummaryGroup{},
		Groups:    []UsageSummaryGroup{},
		Endpoints: []UsageSummaryGroup{},
	}
	if err := base().Select("COUNT(*) AS requests, COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS tokens, COALESCE(SUM(quota), 0) AS quota, COALESCE(AVG(use_time), 0) AS avg_seconds").Scan(&summary.Totals).Error; err != nil {
		return summary, err
	}
	selectGroups := "model_name AS name, COUNT(*) AS requests, COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS tokens, COALESCE(SUM(quota), 0) AS quota"
	if err := base().Select(selectGroups).Group("model_name").Order("requests DESC").Limit(12).Scan(&summary.Models).Error; err != nil {
		return summary, err
	}
	selectGroups = logGroupCol + " AS name, COUNT(*) AS requests, COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS tokens, COALESCE(SUM(quota), 0) AS quota"
	if err := base().Select(selectGroups).Group("group").Order("requests DESC").Limit(12).Scan(&summary.Groups).Error; err != nil {
		return summary, err
	}
	selectGroups = "request_path AS name, COUNT(*) AS requests, COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS tokens, COALESCE(SUM(quota), 0) AS quota"
	if err := base().Where("request_path <> ''").Select(selectGroups).Group("request_path").Order("requests DESC").Limit(12).Scan(&summary.Endpoints).Error; err != nil {
		return summary, err
	}
	return summary, nil
}
