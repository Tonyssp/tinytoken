package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
)

func TestFilterPricingVendors(t *testing.T) {
	pricing := []model.Pricing{{ModelName: "gpt-5.3-codex-spark", VendorID: 2}}
	vendors := []model.PricingVendor{
		{ID: 2, Name: "OpenAI"},
		{ID: 3, Name: "讯飞"},
	}
	got := filterPricingVendors(pricing, vendors)
	if len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("filterPricingVendors() = %+v, want only OpenAI", got)
	}
}
