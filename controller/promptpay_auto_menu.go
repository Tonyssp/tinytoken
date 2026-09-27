package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

type telegramBotCommand struct {
	Command     string `json:"command"`
	Description string `json:"description"`
}

var promptPayAdminCommands = []telegramBotCommand{
	{Command: "auto", Description: "เปิดหรือปิด Auto Approve: on/off"},
	{Command: "auto_status", Description: "ดูสถานะและกฎ Auto Approve"},
	{Command: "auto_time", Description: "ตั้งช่วงเวลา HH:MM HH:MM"},
	{Command: "auto_timezone", Description: "ตั้งเขตเวลา เช่น Asia/Bangkok"},
	{Command: "auto_user", Description: "จัดการผู้ใช้: add/remove/list"},
	{Command: "auto_max", Description: "ตั้งยอดเติมเงินสูงสุดเป็นบาท"},
	{Command: "auto_id", Description: "ดู Telegram ID ของฉัน"},
}

func setPromptPayTelegramCommands(ctx context.Context, client *http.Client, endpoint string, chatID int64) error {
	scope, err := json.Marshal(map[string]interface{}{"type": "chat_administrators", "chat_id": chatID})
	if err != nil {
		return err
	}
	commands, err := json.Marshal(promptPayAdminCommands)
	if err != nil {
		return err
	}
	form := url.Values{"scope": {string(scope)}, "commands": {string(commands)}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Telegram setMyCommands returned HTTP %d", resp.StatusCode)
	}
	var result struct {
		OK     bool `json:"ok"`
		Result bool `json:"result"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&result); err != nil {
		return err
	}
	if !result.OK || !result.Result {
		return errors.New("Telegram rejected the command menu")
	}
	return nil
}

func EnsurePromptPayTelegramCommands() {
	setting := operation_setting.GetPaymentSetting()
	if !setting.PromptPayTelegramEnabled {
		return
	}
	botToken := strings.TrimSpace(setting.PromptPayTelegramBotSecret)
	chatID, err := strconv.ParseInt(strings.TrimSpace(setting.PromptPayTelegramChatId), 10, 64)
	if botToken == "" || err != nil || chatID == 0 {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/setMyCommands", botToken)
	if err := setPromptPayTelegramCommands(ctx, service.GetHttpClient(), endpoint, chatID); err != nil {
		common.SysLog("failed to update PromptPay Telegram admin command menu: " + err.Error())
		return
	}
	common.SysLog("PromptPay Telegram admin command menu updated")
}
