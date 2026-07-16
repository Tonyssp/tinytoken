package controller

import "testing"

func TestParseUserLeaderboardEntries(t *testing.T) {
	entries, err := parseUserLeaderboardEntries(`[{"user_id":7,"display_name":"Tiny Pro"},{"type":"fake","enabled":false,"display_name":"Demo User","request_count":10,"used_quota":20}]`)
	if err != nil {
		t.Fatalf("parse valid entries: %v", err)
	}
	if len(entries) != 2 || entries[0].Type != "real" || entries[0].UserID != 7 || entries[0].DisplayName != "Tiny Pro" {
		t.Fatalf("unexpected entries: %#v", entries)
	}
	if entries[1].Type != "fake" || entries[1].Enabled == nil || *entries[1].Enabled || entries[1].RequestCount != 10 {
		t.Fatalf("unexpected entries: %#v", entries)
	}

	invalid := []string{
		`[{"type":"real","user_id":0,"display_name":"Invalid"}]`,
		`[{"user_id":7},{"user_id":7}]`,
		`[{"type":"fake","display_name":""}]`,
		`[{"type":"fake","display_name":"Demo","request_count":-1}]`,
		`not-json`,
	}
	for _, raw := range invalid {
		if _, err := parseUserLeaderboardEntries(raw); err == nil {
			t.Fatalf("expected invalid configuration for %q", raw)
		}
	}
}

func TestMaskLeaderboardName(t *testing.T) {
	tests := map[string]string{
		"":      "ผู้ใช้ TinyAPI",
		"A":     "A••",
		"AB":    "A•",
		"Tony":  "T•••y",
		"สมชาย": "ส•••ย",
	}
	for input, expected := range tests {
		if actual := maskLeaderboardName(input); actual != expected {
			t.Fatalf("maskLeaderboardName(%q) = %q, want %q", input, actual, expected)
		}
	}
}
