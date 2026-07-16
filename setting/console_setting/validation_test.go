package console_setting

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func announcementJSON(t *testing.T, content, extra string) string {
	t.Helper()

	value, err := json.Marshal([]map[string]interface{}{
		{
			"id":          1,
			"content":     content,
			"publishDate": "2026-07-16T15:01:00Z",
			"type":        "default",
			"extra":       extra,
		},
	})
	require.NoError(t, err)
	return string(value)
}

func TestValidateAnnouncementsCountsUnicodeCharacters(t *testing.T) {
	require.NoError(t, ValidateConsoleSettings(
		announcementJSON(t, strings.Repeat("ก", 500), ""),
		"Announcements",
	))

	err := ValidateConsoleSettings(
		announcementJSON(t, strings.Repeat("ก", 501), ""),
		"Announcements",
	)
	require.ErrorContains(t, err, "500")
}

func TestValidateAnnouncementExtraCountsUnicodeCharacters(t *testing.T) {
	require.NoError(t, ValidateConsoleSettings(
		announcementJSON(t, "ประกาศ", strings.Repeat("ก", 200)),
		"Announcements",
	))

	err := ValidateConsoleSettings(
		announcementJSON(t, "ประกาศ", strings.Repeat("ก", 201)),
		"Announcements",
	)
	require.ErrorContains(t, err, "200")
}
