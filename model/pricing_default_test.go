package model

import "testing"

func TestDefaultVendorNamePrefersGPTOverSpark(t *testing.T) {
	tests := []struct {
		model string
		want  string
	}{
		{"gpt-5.3-codex-spark", "OpenAI"},
		{"gpt-6-sol", "OpenAI"},
		{"spark-max", "讯飞"},
		{"claude-opus-5", "Anthropic"},
	}
	for _, test := range tests {
		if got := defaultVendorName(test.model); got != test.want {
			t.Errorf("defaultVendorName(%q) = %q, want %q", test.model, got, test.want)
		}
	}
}
