package model

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
)

const observedStatusBuckets = 18
const observedBucketSeconds = int64(24 * time.Hour / observedStatusBuckets / time.Second)

type ObservedChannelStatus struct {
	Name        string
	SuccessRate float64
	HasRequests bool
	Status      int
	History     []int
}

type observedLogBucket struct {
	ChannelId int
	Bucket    int
	Type      int
	Count     int64
	Latest    int64
}

type observedChannel struct {
	Id   int
	Type int
}

type observedCounts struct {
	success int64
	errors  int64
}

func observedStatus(counts observedCounts) int {
	total := counts.success + counts.errors
	if total == 0 {
		return -1
	}
	rate := float64(counts.success) / float64(total)
	if rate >= 0.95 {
		return 1
	}
	if rate >= 0.8 {
		return 2
	}
	return 0
}

// GetObservedChannelStatus summarizes logged API outcomes, not active uptime probes.
func GetObservedChannelStatus(ctx context.Context, now time.Time) ([]ObservedChannelStatus, error) {
	var channels []observedChannel
	if err := DB.WithContext(ctx).Model(&Channel{}).
		Select("id, type").Where("status = ?", common.ChannelStatusEnabled).
		Scan(&channels).Error; err != nil {
		return nil, err
	}
	if len(channels) == 0 {
		return []ObservedChannelStatus{}, nil
	}

	channelTypes := make(map[int]int, len(channels))
	providers := make(map[int]*struct {
		counts  observedCounts
		buckets [observedStatusBuckets]observedCounts
		latest  int64
	})
	for _, channel := range channels {
		channelTypes[channel.Id] = channel.Type
		if providers[channel.Type] == nil {
			providers[channel.Type] = &struct {
				counts  observedCounts
				buckets [observedStatusBuckets]observedCounts
				latest  int64
			}{}
		}
	}

	start := now.Unix() - int64(24*time.Hour/time.Second)
	bucketExpr := fmt.Sprintf("(created_at - %d) / %d", start, observedBucketSeconds)
	var rows []observedLogBucket
	err := LOG_DB.WithContext(ctx).Model(&Log{}).
		Select("channel_id, "+bucketExpr+" AS bucket, type, COUNT(*) AS count, MAX(created_at) AS latest").
		Where("created_at >= ? AND created_at <= ? AND type IN ? AND channel_id IN ?",
			start, now.Unix(), []int{LogTypeConsume, LogTypeError}, mapKeys(channelTypes)).
		Group("channel_id, " + bucketExpr + ", type").Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for _, row := range rows {
		if row.Bucket < 0 || row.Bucket >= observedStatusBuckets {
			continue
		}
		provider := providers[channelTypes[row.ChannelId]]
		if provider == nil {
			continue
		}
		if row.Type == LogTypeConsume {
			provider.counts.success += row.Count
			provider.buckets[row.Bucket].success += row.Count
		} else {
			provider.counts.errors += row.Count
			provider.buckets[row.Bucket].errors += row.Count
		}
		if row.Latest > provider.latest {
			provider.latest = row.Latest
		}
	}

	types := make([]int, 0, len(providers))
	for channelType := range providers {
		types = append(types, channelType)
	}
	sort.Ints(types)
	results := make([]ObservedChannelStatus, 0, len(types))
	for _, channelType := range types {
		provider := providers[channelType]
		total := provider.counts.success + provider.counts.errors
		item := ObservedChannelStatus{
			Name:        constant.GetChannelTypeName(channelType),
			HasRequests: total > 0,
			Status:      -1,
			History:     make([]int, observedStatusBuckets),
		}
		if total > 0 {
			item.SuccessRate = float64(provider.counts.success) / float64(total)
		}
		for i, counts := range provider.buckets {
			item.History[i] = observedStatus(counts)
		}
		if provider.latest >= now.Unix()-int64(time.Hour/time.Second) {
			item.Status = observedStatus(provider.buckets[observedStatusBuckets-1])
		}
		results = append(results, item)
	}
	return results, nil
}

func mapKeys(values map[int]int) []int {
	keys := make([]int, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	return keys
}
