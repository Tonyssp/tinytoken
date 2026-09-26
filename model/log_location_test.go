package model

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestLocation(t *testing.T) {
	for _, tc := range []struct {
		name    string
		country string
		want    string
	}{
		{name: "valid country", country: "th", want: "TH"},
		{name: "unknown country", country: "XX", want: ""},
		{name: "invalid country", country: "TH;DROP", want: ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
			ctx.Request.RemoteAddr = "203.0.113.9:5000"
			ctx.Request.Header.Set("CF-IPCountry", tc.country)
			ip, country, path := requestLocation(ctx)
			if ip != "203.0.113.9" || country != tc.want || path != "/v1/chat/completions" {
				t.Fatalf("requestLocation() = %q, %q, %q", ip, country, path)
			}
		})
	}
}

func TestRequestLocationTruncatesPath(t *testing.T) {
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest("GET", "/"+strings.Repeat("a", 200), nil)
	_, _, path := requestLocation(ctx)
	if len(path) != 128 {
		t.Fatalf("path length = %d, want 128", len(path))
	}
}
