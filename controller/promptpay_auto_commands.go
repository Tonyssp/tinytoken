package controller

import (
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

func telegramAutoAdminIDs(configured string) (map[int64]bool, bool) {
	if strings.TrimSpace(configured) == "" {
		return nil, false
	}
	ids := make(map[int64]bool)
	for _, item := range strings.Split(configured, ",") {
		id, err := strconv.ParseInt(strings.TrimSpace(item), 10, 64)
		if err != nil || id <= 0 {
			return nil, false
		}
		ids[id] = true
	}
	return ids, len(ids) > 0
}

func authorizedTelegramAutoAdmin(userID int64, configured string) bool {
	ids, ok := telegramAutoAdminIDs(configured)
	return ok && ids[userID]
}

func parseAutoCommand(text string) ([]string, bool) {
	fields := strings.Fields(strings.TrimSpace(text))
	if len(fields) == 0 {
		return nil, false
	}
	name := strings.ToLower(strings.SplitN(fields[0], "@", 2)[0])
	switch name {
	case "/auto", "/auto_time", "/auto_user", "/auto_max", "/auto_status", "/auto_timezone", "/auto_id":
		fields[0] = name
		return fields, true
	default:
		return nil, false
	}
}

func isPromptPayAutoBot(chatID int64, token string) bool {
	setting := operation_setting.GetPaymentSetting()
	configuredID, err := strconv.ParseInt(strings.TrimSpace(setting.PromptPayTelegramChatId), 10, 64)
	return err == nil && setting.PromptPayTelegramEnabled &&
		configuredID == chatID && strings.TrimSpace(setting.PromptPayTelegramBotSecret) == token
}

func promptPayAutoStatus() string {
	cfg, err := model.GetPromptPayAutoConfig()
	if err != nil {
		return "Auto Approve: OFF (configuration unavailable)"
	}
	state := "OFF"
	if cfg.Enabled {
		state = "ON"
	}
	adminIDsReady := false
	_, adminIDsReady = telegramAutoAdminIDs(os.Getenv("TELEGRAM_ADMIN_IDS"))
	providerReady := slipOKConfigured(operation_setting.GetPaymentSetting())
	if cfg.Enabled {
		if err := model.RequirePromptPayAutoReady(cfg); err != nil || !adminIDsReady || !providerReady {
			state = "ON (paused: rule, authorization, or verification unavailable)"
		}
	}
	users := "none"
	if len(cfg.AllowedUserIDs) > 0 {
		ids := append([]int(nil), cfg.AllowedUserIDs...)
		sort.Ints(ids)
		values := make([]string, len(ids))
		for i, id := range ids {
			values[i] = strconv.Itoa(id)
		}
		users = strings.Join(values, ", ")
	}
	start, end, timezone := cfg.Start, cfg.End, cfg.Timezone
	if start == "" {
		start = "not set"
	}
	if end == "" {
		end = "not set"
	}
	if timezone == "" {
		timezone = "not set"
	}
	provider := "not configured"
	if providerReady {
		provider = "SlipOK configured"
	}
	return fmt.Sprintf("Auto Approve: %s\nTime: %s - %s\nTimezone: %s\nAllowed Users: %s\nMaximum Amount: %d THB\nPayment verification: %s", state, start, end, timezone, users, cfg.MaxAmountTHB, provider)
}

func processAutoCommand(text string, telegramID int64) (string, bool) {
	fields, recognized := parseAutoCommand(text)
	if !recognized {
		return "", false
	}
	if fields[0] == "/auto_id" {
		if len(fields) != 1 || telegramID <= 0 {
			return "ใช้ /auto_id จากบัญชี Telegram ของคุณ", true
		}
		return fmt.Sprintf("Telegram ID ของคุณ: %d", telegramID), true
	}
	if !authorizedTelegramAutoAdmin(telegramID, os.Getenv("TELEGRAM_ADMIN_IDS")) {
		return "ไม่อนุญาต: Telegram ID นี้ไม่มีสิทธิ์ตั้งค่า Auto Approve", true
	}
	if fields[0] == "/auto_status" {
		if len(fields) != 1 {
			return "ใช้ /auto_status", true
		}
		return promptPayAutoStatus(), true
	}
	if fields[0] == "/auto" && len(fields) == 2 && strings.EqualFold(fields[1], "off") {
		if err := model.DisablePromptPayAutoConfig(); err != nil {
			return "ปิด Auto Approve ไม่สำเร็จ: ฐานข้อมูลไม่พร้อม กรุณาหยุดบริการจนกว่าจะตรวจสอบได้", true
		}
		return "Auto Approve: OFF", true
	}
	if fields[0] == "/auto_user" && len(fields) == 2 && strings.EqualFold(fields[1], "list") {
		return promptPayAutoStatus(), true
	}
	if fields[0] == "/auto" && len(fields) == 2 && strings.EqualFold(fields[1], "on") {
		if !slipOKConfigured(operation_setting.GetPaymentSetting()) {
			return "ยังเปิด Auto Approve ไม่ได้: ต้องตั้งค่า SlipOK API พร้อมผูกบัญชีผู้รับเพื่อตรวจสลิปจริงก่อน", true
		}
		_, err := model.UpdatePromptPayAutoConfig(func(cfg *model.PromptPayAutoConfig) error {
			if err := model.RequirePromptPayAutoReady(*cfg); err != nil {
				return err
			}
			cfg.Enabled = true
			return nil
		})
		if err != nil {
			return "เปิด Auto Approve ไม่สำเร็จ: " + err.Error(), true
		}
		return promptPayAutoStatus(), true
	}
	var change func(*model.PromptPayAutoConfig) error
	switch fields[0] {
	case "/auto_time":
		if len(fields) != 3 {
			return "ใช้ /auto_time HH:MM HH:MM", true
		}
		start, end := fields[1], fields[2]
		startTime, e1 := time.Parse("15:04", start)
		endTime, e2 := time.Parse("15:04", end)
		if e1 != nil || e2 != nil || startTime.Format("15:04") != start || endTime.Format("15:04") != end || start == end {
			return "เวลาไม่ถูกต้องหรือช่วงเวลาเป็นศูนย์", true
		}
		change = func(cfg *model.PromptPayAutoConfig) error { cfg.Start, cfg.End = start, end; return nil }
	case "/auto_timezone":
		if len(fields) != 2 {
			return "ใช้ /auto_timezone Asia/Bangkok", true
		}
		zone := fields[1]
		if _, err := time.LoadLocation(zone); err != nil || zone == "Local" {
			return "Timezone ไม่ถูกต้อง กรุณาใช้ชื่อ IANA เช่น Asia/Bangkok", true
		}
		change = func(cfg *model.PromptPayAutoConfig) error { cfg.Timezone = zone; return nil }
	case "/auto_max":
		if len(fields) != 2 {
			return "ใช้ /auto_max จำนวนเงินบาท", true
		}
		amount, err := strconv.ParseInt(fields[1], 10, 64)
		if err != nil || amount <= 0 || amount > 1000000 {
			return "ยอดสูงสุดต้องเป็นจำนวนเต็ม 1 ถึง 1,000,000 บาท", true
		}
		change = func(cfg *model.PromptPayAutoConfig) error { cfg.MaxAmountTHB = amount; return nil }
	case "/auto_user":
		if len(fields) != 3 {
			return "ใช้ /auto_user add USER_ID หรือ /auto_user remove USER_ID", true
		}
		id, err := strconv.Atoi(fields[2])
		if err != nil || id <= 0 {
			return "User ID ไม่ถูกต้อง", true
		}
		switch strings.ToLower(fields[1]) {
		case "add":
			change = func(cfg *model.PromptPayAutoConfig) error {
				for _, existing := range cfg.AllowedUserIDs {
					if existing == id {
						return nil
					}
				}
				if len(cfg.AllowedUserIDs) >= 1000 {
					return fmt.Errorf("user allowlist is full")
				}
				cfg.AllowedUserIDs = append(cfg.AllowedUserIDs, id)
				return nil
			}
		case "remove":
			change = func(cfg *model.PromptPayAutoConfig) error {
				for i, existing := range cfg.AllowedUserIDs {
					if existing == id {
						cfg.AllowedUserIDs = append(cfg.AllowedUserIDs[:i], cfg.AllowedUserIDs[i+1:]...)
						break
					}
				}
				if len(cfg.AllowedUserIDs) == 0 {
					cfg.Enabled = false
				}
				return nil
			}
		default:
			return "ใช้ /auto_user add USER_ID หรือ /auto_user remove USER_ID", true
		}
	default:
		return "คำสั่งไม่ถูกต้อง: /auto on|off, /auto_time, /auto_timezone, /auto_user, /auto_max, /auto_status", true
	}
	if _, err := model.UpdatePromptPayAutoConfig(change); err != nil {
		return "บันทึกการตั้งค่าไม่สำเร็จ: " + err.Error(), true
	}
	return promptPayAutoStatus(), true
}
