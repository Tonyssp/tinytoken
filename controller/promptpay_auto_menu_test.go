package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSetPromptPayTelegramCommandsUsesAdminChatScope(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.NoError(t, r.ParseForm())
		var scope struct {
			Type   string `json:"type"`
			ChatID int64  `json:"chat_id"`
		}
		require.NoError(t, json.Unmarshal([]byte(r.FormValue("scope")), &scope))
		assert.Equal(t, "chat_administrators", scope.Type)
		assert.Equal(t, int64(-1003925472809), scope.ChatID)
		var commands []telegramBotCommand
		require.NoError(t, json.Unmarshal([]byte(r.FormValue("commands")), &commands))
		assert.Len(t, commands, len(promptPayAdminCommands))
		for _, command := range commands {
			_, recognized := parseAutoCommand("/" + command.Command)
			assert.True(t, recognized, command.Command)
			assert.NotEmpty(t, command.Description)
		}
		_, _ = w.Write([]byte(`{"ok":true,"result":true}`))
	}))
	defer server.Close()
	require.NoError(t, setPromptPayTelegramCommands(t.Context(), server.Client(), server.URL, -1003925472809))
}

func TestSetPromptPayTelegramCommandsRejectsFailedResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"ok":false,"result":false}`))
	}))
	defer server.Close()
	require.Error(t, setPromptPayTelegramCommands(t.Context(), server.Client(), server.URL, -1003925472809))
}
