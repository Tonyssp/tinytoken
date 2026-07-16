/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { api } from '@/lib/api'
import type { HomePageContentResponse, HomeTrustMetrics } from './types'

// ============================================================================
// Home Page APIs
// ============================================================================

/**
 * Get custom home page content
 * Returns Markdown/HTML content or iframe URL
 */
export async function getHomePageContent(): Promise<HomePageContentResponse> {
  const res = await api.get('/api/home_page_content')
  return res.data
}

export async function getHomeTrustMetrics(): Promise<HomeTrustMetrics> {
  const startedAt = performance.now()
  const statusResponse = await api.get('/api/status')
  const latencyMs = Math.max(1, Math.round(performance.now() - startedAt))

  const [pricingResult, uptimeResult] = await Promise.allSettled([
    api.get('/api/pricing'),
    api.get('/api/uptime/status'),
  ])

  const models =
    pricingResult.status === 'fulfilled' &&
    Array.isArray(pricingResult.value.data?.data)
      ? pricingResult.value.data.data
      : []
  const uptimeGroups =
    uptimeResult.status === 'fulfilled' &&
    Array.isArray(uptimeResult.value.data?.data)
      ? uptimeResult.value.data.data
      : []
  const monitors = uptimeGroups.flatMap((group) =>
    Array.isArray(group?.monitors) ? group.monitors : []
  )

  return {
    online:
      statusResponse.status === 200 &&
      (monitors.length === 0 ||
        monitors.every((monitor) => monitor.status === 1)),
    modelCount: models.length,
    latencyMs,
    monitorCount: monitors.length,
  }
}
