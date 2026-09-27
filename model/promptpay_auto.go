package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"regexp"
	"sort"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const promptPayAutoOptionKey = "PromptPayAutoApprove"

const (
	PromptPayAutoModeVerified  = "verified"
	PromptPayAutoModeWhitelist = "whitelist"
)

var promptPayTradePattern = regexp.MustCompile(`^THA[1-9][0-9]*NO[A-Za-z0-9]{6}[0-9]{10,}$`)
var promptPayBankReferencePattern = regexp.MustCompile(`^[A-Za-z0-9_-]{8,128}$`)
var promptPayWhitelistReferencePattern = regexp.MustCompile(`^wl_[a-f0-9]{64}$`)

type PromptPayAutoConfig struct {
	Enabled        bool   `json:"enabled"`
	Mode           string `json:"mode"`
	Start          string `json:"start"`
	End            string `json:"end"`
	Timezone       string `json:"timezone"`
	AllowedUserIDs []int  `json:"allowed_user_ids"`
	MaxAmountTHB   int64  `json:"max_amount_thb"`
}

func (cfg PromptPayAutoConfig) EffectiveMode() string {
	if cfg.Mode == "" {
		return PromptPayAutoModeVerified
	}
	return cfg.Mode
}

func (cfg PromptPayAutoConfig) validateReady() (*time.Location, int, int, error) {
	if mode := cfg.EffectiveMode(); mode != PromptPayAutoModeVerified && mode != PromptPayAutoModeWhitelist {
		return nil, 0, 0, errors.New("invalid auto approval mode")
	}
	if cfg.MaxAmountTHB <= 0 || len(cfg.AllowedUserIDs) == 0 {
		return nil, 0, 0, errors.New("set a positive maximum and at least one user")
	}
	start, err := time.Parse("15:04", cfg.Start)
	if err != nil || start.Format("15:04") != cfg.Start {
		return nil, 0, 0, errors.New("invalid start time")
	}
	end, err := time.Parse("15:04", cfg.End)
	if err != nil || end.Format("15:04") != cfg.End || cfg.Start == cfg.End {
		return nil, 0, 0, errors.New("invalid end time")
	}
	location, err := time.LoadLocation(cfg.Timezone)
	if err != nil || cfg.Timezone == "" {
		return nil, 0, 0, errors.New("invalid timezone")
	}
	for _, id := range cfg.AllowedUserIDs {
		if id <= 0 {
			return nil, 0, 0, errors.New("invalid user ID")
		}
	}
	return location, start.Hour()*60 + start.Minute(), end.Hour()*60 + end.Minute(), nil
}

func (cfg PromptPayAutoConfig) Allows(topUp *TopUp, now time.Time) bool {
	if !cfg.Enabled || topUp == nil || topUp.PaymentProvider != PaymentProviderPromptPay ||
		topUp.Status != common.TopUpStatusPending || topUp.UserId <= 0 ||
		topUp.Money <= 0 || math.IsNaN(topUp.Money) || math.IsInf(topUp.Money, 0) ||
		topUp.Money != math.Trunc(topUp.Money) || topUp.Money > float64(cfg.MaxAmountTHB) ||
		!promptPayTradePattern.MatchString(topUp.TradeNo) {
		return false
	}
	location, start, end, err := cfg.validateReady()
	if err != nil {
		return false
	}
	allowed := false
	for _, id := range cfg.AllowedUserIDs {
		if id == topUp.UserId {
			allowed = true
			break
		}
	}
	if !allowed {
		return false
	}
	local := now.In(location)
	minute := local.Hour()*60 + local.Minute()
	if start < end {
		return minute >= start && minute < end
	}
	return minute >= start || minute < end
}

func decodePromptPayAutoConfig(value string) (PromptPayAutoConfig, error) {
	var cfg PromptPayAutoConfig
	if err := json.Unmarshal([]byte(value), &cfg); err != nil {
		return PromptPayAutoConfig{}, err
	}
	return cfg, nil
}

func readPromptPayAutoConfig(tx *gorm.DB, lock bool) (PromptPayAutoConfig, error) {
	query := tx.Where(&Option{Key: promptPayAutoOptionKey})
	if lock {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	var option Option
	if err := query.First(&option).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return PromptPayAutoConfig{}, nil
		}
		return PromptPayAutoConfig{}, err
	}
	return decodePromptPayAutoConfig(option.Value)
}

func GetPromptPayAutoConfig() (PromptPayAutoConfig, error) {
	return readPromptPayAutoConfig(DB, false)
}

func UpdatePromptPayAutoConfig(change func(*PromptPayAutoConfig) error) (PromptPayAutoConfig, error) {
	var updated PromptPayAutoConfig
	err := DB.Transaction(func(tx *gorm.DB) error {
		cfg, err := readPromptPayAutoConfig(tx, true)
		if err != nil {
			return err
		}
		if err := change(&cfg); err != nil {
			return err
		}
		sort.Ints(cfg.AllowedUserIDs)
		encoded, err := json.Marshal(cfg)
		if err != nil {
			return err
		}
		option := Option{Key: promptPayAutoOptionKey, Value: string(encoded)}
		if err := tx.Save(&option).Error; err != nil {
			return err
		}
		updated = cfg
		return nil
	})
	return updated, err
}

func DisablePromptPayAutoConfig() error {
	_, err := UpdatePromptPayAutoConfig(func(cfg *PromptPayAutoConfig) error {
		cfg.Enabled = false
		return nil
	})
	if err == nil {
		return nil
	}
	// A malformed saved rule must not prevent an emergency shutoff.
	return DB.Model(&Option{}).Where(&Option{Key: promptPayAutoOptionKey}).
		Update("value", `{"enabled":false}`).Error
}

func RequirePromptPayAutoReady(cfg PromptPayAutoConfig) error {
	_, _, _, err := cfg.validateReady()
	if err != nil {
		return fmt.Errorf("auto approval is not ready: %w", err)
	}
	return nil
}
