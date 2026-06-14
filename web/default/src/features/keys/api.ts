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
import type {
  ApiKey,
  ApiResponse,
  GetApiKeysParams,
  GetApiKeysResponse,
  SearchApiKeysParams,
  ApiKeyFormData,
} from './types'

// ============================================================================
// API Key Management
// ============================================================================

// Get paginated API keys list
export async function getApiKeys(
  params: GetApiKeysParams = {}
): Promise<GetApiKeysResponse> {
  const { p = 1, size = 10 } = params
  const res = await api.get(`/api/token/?p=${p}&size=${size}`)
  return res.data
}

// Search API keys by keyword or token (with pagination)
export async function searchApiKeys(
  params: SearchApiKeysParams
): Promise<GetApiKeysResponse> {
  const { keyword = '', token = '', p, size } = params
  const queryParams = new URLSearchParams()
  if (keyword) queryParams.set('keyword', keyword)
  if (token) queryParams.set('token', token)
  if (p != null) queryParams.set('p', String(p))
  if (size != null) queryParams.set('size', String(size))
  const res = await api.get(`/api/token/search?${queryParams.toString()}`)
  return res.data
}

// Get single API key by ID
export async function getApiKey(id: number): Promise<ApiResponse<ApiKey>> {
  const res = await api.get(`/api/token/${id}`)
  return res.data
}

// Create a new API key
export async function createApiKey(
  data: ApiKeyFormData
): Promise<ApiResponse<ApiKey>> {
  const res = await api.post('/api/token/', data)
  return res.data
}

// Update an existing API key
export async function updateApiKey(
  data: ApiKeyFormData & { id: number }
): Promise<ApiResponse<ApiKey>> {
  const res = await api.put('/api/token/', data)
  return res.data
}

// Delete a single API key
export async function deleteApiKey(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/token/${id}/`)
  return res.data
}

// Batch delete multiple API keys
export async function batchDeleteApiKeys(
  ids: number[]
): Promise<ApiResponse<number>> {
  const res = await api.post('/api/token/batch', { ids })
  return res.data
}

// Update API key status (enable/disable)
export async function updateApiKeyStatus(
  id: number,
  status: number
): Promise<ApiResponse<ApiKey>> {
  const res = await api.put('/api/token/?status_only=true', { id, status })
  return res.data
}

// Fetch the real (unmasked) key for a token by ID
export async function fetchTokenKey(
  id: number
): Promise<{ success: boolean; message?: string; data?: { key: string } }> {
  const res = await api.post(`/api/token/${id}/key`)
  return res.data
}

// Batch fetch real (unmasked) keys for multiple tokens
export async function fetchTokenKeysBatch(ids: number[]): Promise<{
  success: boolean
  message?: string
  data?: { keys: Record<number, string> }
}> {
  const res = await api.post('/api/token/batch/keys', { ids })
  return res.data
}

// Test whether an API key can authenticate against the OpenAI-compatible models endpoint
export async function testApiKeyConnection(token: string): Promise<{
  success: boolean
  message?: string
  modelCount?: number
}> {
  try {
    const res = await fetch('/v1/models', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}`,
      }
    }

    const data = (await res.json()) as { data?: unknown[] }
    return {
      success: true,
      modelCount: Array.isArray(data.data) ? data.data.length : undefined,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

function resolveModelsEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim()
  if (!trimmed) return '/v1/models'
  return trimmed
    .replace(/\/chat\/completions\/?$/, '/models')
    .replace(/\/completions\/?$/, '/models')
}

export async function fetchApiKeyTestModels(
  token: string,
  endpoint = '/v1/chat/completions'
): Promise<{
  success: boolean
  message?: string
  models: string[]
}> {
  try {
    const res = await fetch(resolveModelsEndpoint(endpoint), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}`,
        models: [],
      }
    }

    const data = (await res.json()) as {
      data?: Array<{ id?: unknown; name?: unknown; model?: unknown }>
    }
    const models = Array.isArray(data.data)
      ? data.data
          .map((item) => item.id ?? item.name ?? item.model)
          .filter((value): value is string => typeof value === 'string')
      : []

    return {
      success: true,
      models,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : undefined,
      models: [],
    }
  }
}

export async function sendApiKeyTestMessage(params: {
  token: string
  endpoint: string
  model: string
  message: string
}): Promise<{
  success: boolean
  message?: string
  responseText?: string
  raw?: unknown
  elapsedMs?: number
}> {
  const startedAt = performance.now()

  try {
    const res = await fetch(params.endpoint.trim() || '/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          {
            role: 'user',
            content: params.message,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    })
    const elapsedMs = Math.round(performance.now() - startedAt)
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const errorMessage =
        data && typeof data === 'object' && 'error' in data
          ? JSON.stringify((data as { error: unknown }).error)
          : `HTTP ${res.status}`
      return {
        success: false,
        message: errorMessage,
        raw: data,
        elapsedMs,
      }
    }

    const responseText =
      data &&
      typeof data === 'object' &&
      'choices' in data &&
      Array.isArray((data as { choices?: unknown }).choices)
        ? (
            (data as { choices: Array<{ message?: { content?: unknown } }> })
              .choices[0]?.message?.content ?? ''
          )
        : ''

    return {
      success: true,
      responseText: typeof responseText === 'string' ? responseText : '',
      raw: data,
      elapsedMs,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : undefined,
      elapsedMs: Math.round(performance.now() - startedAt),
    }
  }
}
