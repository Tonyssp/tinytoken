package model

type UserLeaderboardUsage struct {
	UserID           int    `json:"user_id"`
	RequestCount     int64  `json:"request_count"`
	UsedQuota        int64  `json:"used_quota"`
	PromptTokens     int64  `json:"prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens"`
	TopModel         string `json:"top_model"`
}

type userLeaderboardModelUsage struct {
	UserID       int
	ModelName    string
	RequestCount int64
}

func GetUserLeaderboardUsage(userIDs []int, startTime int64, limit int) ([]UserLeaderboardUsage, error) {
	query := LOG_DB.Table("logs").
		Select("user_id, COUNT(*) AS request_count, COALESCE(SUM(quota), 0) AS used_quota, COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS completion_tokens").
		Where("type = ?", LogTypeConsume)
	if startTime > 0 {
		query = query.Where("created_at >= ?", startTime)
	}
	if len(userIDs) > 0 {
		query = query.Where("user_id IN ?", userIDs)
	}

	var usage []UserLeaderboardUsage
	query = query.Group("user_id").Order("used_quota DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Scan(&usage).Error; err != nil {
		return nil, err
	}
	if len(usage) == 0 {
		return usage, nil
	}

	resolvedUserIDs := make([]int, 0, len(usage))
	for _, item := range usage {
		resolvedUserIDs = append(resolvedUserIDs, item.UserID)
	}

	modelQuery := LOG_DB.Table("logs").
		Select("user_id, model_name, COUNT(*) AS request_count").
		Where("type = ? AND model_name <> '' AND user_id IN ?", LogTypeConsume, resolvedUserIDs)
	if startTime > 0 {
		modelQuery = modelQuery.Where("created_at >= ?", startTime)
	}

	var modelUsage []userLeaderboardModelUsage
	if err := modelQuery.Group("user_id, model_name").Scan(&modelUsage).Error; err != nil {
		return nil, err
	}

	topModels := make(map[int]userLeaderboardModelUsage, len(usage))
	for _, item := range modelUsage {
		current, exists := topModels[item.UserID]
		if !exists || item.RequestCount > current.RequestCount {
			topModels[item.UserID] = item
		}
	}
	for i := range usage {
		usage[i].TopModel = topModels[usage[i].UserID].ModelName
	}

	return usage, nil
}

func GetLeaderboardUsersByIDs(userIDs []int) (map[int]*User, error) {
	usersByID := make(map[int]*User, len(userIDs))
	if len(userIDs) == 0 {
		return usersByID, nil
	}

	var users []*User
	if err := DB.Model(&User{}).
		Where("id IN ?", userIDs).
		Omit("password").
		Find(&users).Error; err != nil {
		return nil, err
	}
	for _, user := range users {
		usersByID[user.Id] = user
	}
	return usersByID, nil
}

func GetLeaderboardFallbackUsers(limit int) ([]*User, error) {
	var users []*User
	err := DB.Model(&User{}).
		Where("status = ? AND role = ?", 1, 1).
		Order("used_quota DESC").
		Limit(limit).
		Omit("password").
		Find(&users).Error
	return users, err
}
