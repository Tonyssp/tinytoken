package service

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
)

func TestEstimateRequestTokenForLimitWhenBillingCountDisabled(t *testing.T) {
	previous := constant.CountToken
	constant.CountToken = false
	defer func() { constant.CountToken = previous }()

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	meta := &types.TokenCountMeta{CombineText: strings.Repeat("hello world ", 100)}
	info := &relaycommon.RelayInfo{
		RelayFormat: types.RelayFormatOpenAI,
		RelayMode:   relayconstant.RelayModeChatCompletions,
	}

	ordinary, err := EstimateRequestToken(c, meta, info)
	if err != nil || ordinary != 0 {
		t.Fatalf("ordinary estimate = %d, err = %v; want zero when disabled", ordinary, err)
	}
	forced, err := EstimateRequestTokenForLimit(c, meta, info)
	if err != nil {
		t.Fatalf("forced token estimate failed: %v", err)
	}
	if forced <= 0 {
		t.Fatalf("forced token estimate = %d; want positive input count", forced)
	}
}
