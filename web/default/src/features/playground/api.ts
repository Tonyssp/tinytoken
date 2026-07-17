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
import { API_ENDPOINTS } from './constants'
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelOption,
  GroupOption,
} from './types'

type PricingModelGroup = {
  model_name?: string
  enable_groups?: string[]
}

type PricingResponse = {
  success?: boolean
  data?: PricingModelGroup[]
}

/**
 * Send chat completion request (non-streaming)
 */
export async function sendChatCompletion(
  payload: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const res = await api.post(API_ENDPOINTS.CHAT_COMPLETIONS, payload, {
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return res.data
}

/**
 * Get user available models
 */
export async function getUserModels(group?: string): Promise<ModelOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_MODELS, {
    params: group ? { group } : undefined,
  })
  const { data } = res

  if (!data.success || !Array.isArray(data.data)) {
    return []
  }

  let models = data.data as string[]

  // Older backend builds ignore ?group=, so keep a frontend fallback based on
  // pricing metadata. New backend builds already return the filtered list.
  if (group) {
    try {
      const pricingRes = await api.get<PricingResponse>('/api/pricing')
      const pricingModels = pricingRes.data.data || []
      const allowed = new Set(
        pricingModels
          .filter((model) => {
            const groups = Array.isArray(model.enable_groups)
              ? model.enable_groups
              : []
            return groups.includes(group) || groups.includes('all')
          })
          .map((model) => model.model_name)
          .filter((modelName): modelName is string => Boolean(modelName))
      )

      if (allowed.size > 0) {
        models = models.filter((model) => allowed.has(model))
      }
    } catch {
      // If pricing is unavailable, keep the backend model list.
    }
  }

  return models.map((model: string) => ({
    label: model,
    value: model,
  }))
}

/**
 * Get user groups
 */
export async function getUserGroups(): Promise<GroupOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_GROUPS)
  const { data } = res

  if (!data.success || !data.data) {
    return []
  }

  const groupData = data.data as Record<string, { desc: string; ratio: number }>

  // label is for button display (name only); desc is for dropdown content
  return Object.entries(groupData).map(([group, info]) => ({
    label: group,
    value: group,
    ratio: info.ratio,
    desc: info.desc,
  }))
}
