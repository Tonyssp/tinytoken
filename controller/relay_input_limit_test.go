package controller

import (
	"testing"

	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
)

func TestInputLimitRelayIncludesCodexResponses(t *testing.T) {
	tests := []struct {
		name   string
		format types.RelayFormat
		mode   int
		want   bool
	}{
		{"chat completions", types.RelayFormatOpenAI, relayconstant.RelayModeChatCompletions, true},
		{"responses", types.RelayFormatOpenAIResponses, relayconstant.RelayModeResponses, true},
		{"responses compact", types.RelayFormatOpenAIResponsesCompaction, relayconstant.RelayModeResponsesCompact, true},
		{"images are not text context", types.RelayFormatOpenAIImage, relayconstant.RelayModeImagesGenerations, false},
		{"mismatched route", types.RelayFormatOpenAI, relayconstant.RelayModeResponses, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isInputLimitRelay(tt.format, tt.mode); got != tt.want {
				t.Fatalf("isInputLimitRelay(%v, %d) = %v, want %v", tt.format, tt.mode, got, tt.want)
			}
		})
	}
}
