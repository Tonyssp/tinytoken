package controller

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/console_setting"

	"github.com/gin-gonic/gin"
	"golang.org/x/sync/errgroup"
)

const (
	requestTimeout   = 30 * time.Second
	httpTimeout      = 10 * time.Second
	uptimeKeySuffix  = "_24"
	apiStatusPath    = "/api/status-page/"
	apiHeartbeatPath = "/api/status-page/heartbeat/"
)

type Monitor struct {
	Name            string  `json:"name"`
	Uptime          float64 `json:"uptime"`
	Status          int     `json:"status"`
	Group           string  `json:"group,omitempty"`
	UptimeAvailable bool    `json:"uptimeAvailable"`
	History         []int   `json:"history,omitempty"`
}

type UptimeGroupResult struct {
	CategoryName string    `json:"categoryName"`
	Source       string    `json:"source,omitempty"`
	Monitors     []Monitor `json:"monitors"`
}

var observedStatusCache struct {
	sync.Mutex
	updatedAt time.Time
	groups    []UptimeGroupResult
}

func getObservedStatus(ctx context.Context) ([]UptimeGroupResult, error) {
	observedStatusCache.Lock()
	defer observedStatusCache.Unlock()
	if time.Since(observedStatusCache.updatedAt) < 2*time.Minute {
		return observedStatusCache.groups, nil
	}
	items, err := model.GetObservedChannelStatus(ctx, time.Now())
	if err != nil {
		return nil, err
	}
	monitors := make([]Monitor, 0, len(items))
	for _, item := range items {
		monitors = append(monitors, Monitor{
			Name:            item.Name,
			Uptime:          item.SuccessRate,
			Status:          item.Status,
			UptimeAvailable: item.HasRequests,
			History:         item.History,
		})
	}
	observedStatusCache.groups = []UptimeGroupResult{{
		CategoryName: "API providers",
		Source:       "observed",
		Monitors:     monitors,
	}}
	observedStatusCache.updatedAt = time.Now()
	return observedStatusCache.groups, nil
}

func getAndDecode(ctx context.Context, client *http.Client, url string, dest interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return errors.New("non-200 status")
	}

	return json.NewDecoder(resp.Body).Decode(dest)
}

func fetchGroupData(ctx context.Context, client *http.Client, groupConfig map[string]interface{}) UptimeGroupResult {
	url, _ := groupConfig["url"].(string)
	slug, _ := groupConfig["slug"].(string)
	categoryName, _ := groupConfig["categoryName"].(string)

	result := UptimeGroupResult{
		CategoryName: categoryName,
		Monitors:     []Monitor{},
	}

	if url == "" || slug == "" {
		return result
	}

	baseURL := strings.TrimSuffix(url, "/")

	var statusData struct {
		PublicGroupList []struct {
			ID          int    `json:"id"`
			Name        string `json:"name"`
			MonitorList []struct {
				ID   int    `json:"id"`
				Name string `json:"name"`
			} `json:"monitorList"`
		} `json:"publicGroupList"`
	}

	var heartbeatData struct {
		HeartbeatList map[string][]struct {
			Status int `json:"status"`
		} `json:"heartbeatList"`
		UptimeList map[string]float64 `json:"uptimeList"`
	}

	g, gCtx := errgroup.WithContext(ctx)
	g.Go(func() error {
		return getAndDecode(gCtx, client, baseURL+apiStatusPath+slug, &statusData)
	})
	g.Go(func() error {
		return getAndDecode(gCtx, client, baseURL+apiHeartbeatPath+slug, &heartbeatData)
	})

	if g.Wait() != nil {
		return result
	}

	for _, pg := range statusData.PublicGroupList {
		if len(pg.MonitorList) == 0 {
			continue
		}

		for _, m := range pg.MonitorList {
			monitor := Monitor{
				Name:   m.Name,
				Group:  pg.Name,
				Status: -1,
			}

			monitorID := strconv.Itoa(m.ID)

			if uptime, exists := heartbeatData.UptimeList[monitorID+uptimeKeySuffix]; exists {
				monitor.Uptime = uptime
				monitor.UptimeAvailable = true
			}

			if heartbeats, exists := heartbeatData.HeartbeatList[monitorID]; exists && len(heartbeats) > 0 {
				monitor.Status = heartbeats[0].Status
				for index := min(len(heartbeats), 18) - 1; index >= 0; index-- {
					monitor.History = append(monitor.History, heartbeats[index].Status)
				}
			}

			result.Monitors = append(result.Monitors, monitor)
		}
	}

	return result
}

func GetUptimeKumaStatus(c *gin.Context) {
	groups := console_setting.GetUptimeKumaGroups()
	if len(groups) == 0 {
		results, err := getObservedStatus(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Unable to load channel status"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": results})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	client := &http.Client{Timeout: httpTimeout}
	results := make([]UptimeGroupResult, len(groups))

	g, gCtx := errgroup.WithContext(ctx)
	for i, group := range groups {
		i, group := i, group
		g.Go(func() error {
			results[i] = fetchGroupData(gCtx, client, group)
			return nil
		})
	}

	g.Wait()
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": results})
}
