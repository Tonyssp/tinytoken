package oauth

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestResolveGenericOAuthRedirectURI(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const fallback = "https://api.tinyapi.org/oauth/google"

	tests := []struct {
		name        string
		redirectURI string
		origin      string
		referer     string
		host        string
		expected    string
	}{
		{
			name:        "uses matching frontend origin",
			redirectURI: "https://tinyapi.org/oauth/google",
			origin:      "https://tinyapi.org",
			expected:    "https://tinyapi.org/oauth/google",
		},
		{
			name:        "uses matching frontend referer",
			redirectURI: "https://tinyapi.org/oauth/google",
			referer:     "https://tinyapi.org/oauth/google?code=test",
			expected:    "https://tinyapi.org/oauth/google",
		},
		{
			name:        "uses matching request host",
			redirectURI: "https://tinyapi.org/oauth/google",
			host:        "tinyapi.org",
			expected:    "https://tinyapi.org/oauth/google",
		},
		{
			name:        "rejects a different origin",
			redirectURI: "https://evil.example/oauth/google",
			origin:      "https://tinyapi.org",
			expected:    fallback,
		},
		{
			name:        "rejects an unexpected callback path",
			redirectURI: "https://tinyapi.org/oauth/other",
			origin:      "https://tinyapi.org",
			expected:    fallback,
		},
		{
			name:        "falls back when redirect uri is absent",
			redirectURI: "",
			origin:      "https://tinyapi.org",
			expected:    fallback,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(recorder)
			request := httptest.NewRequest(
				"GET",
				"/api/oauth/google?redirect_uri="+tt.redirectURI,
				nil,
			)
			request.Header.Set("Origin", tt.origin)
			request.Header.Set("Referer", tt.referer)
			if tt.host != "" {
				request.Host = tt.host
			}
			context.Request = request

			assert.Equal(
				t,
				tt.expected,
				resolveGenericOAuthRedirectURI(context, "google", fallback),
			)
		})
	}
}
