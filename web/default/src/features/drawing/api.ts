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

export type DrawingResult = {
  id: string
  url?: string
  b64?: string
  revisedPrompt?: string
}

type OpenAIImageItem = {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

type OpenAIImageResponse = {
  data?: OpenAIImageItem[]
}

export type GenerateImagePayload = {
  token: string
  model: string
  prompt: string
  size: string
  quality: string
  count: number
  referenceImage?: File | null
}

function mapImageResponse(data: OpenAIImageResponse): DrawingResult[] {
  return (data.data || []).map((item, index) => ({
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${index}`,
    url: item.url,
    b64: item.b64_json,
    revisedPrompt: item.revised_prompt,
  }))
}

export async function generateImage(
  payload: GenerateImagePayload
): Promise<DrawingResult[]> {
  const headers = {
    Authorization: `Bearer ${payload.token}`,
  }

  if (payload.referenceImage) {
    const form = new FormData()
    form.append('model', payload.model)
    form.append('prompt', payload.prompt)
    form.append('image', payload.referenceImage)
    form.append('n', String(payload.count))
    if (payload.size !== 'auto') {
      form.append('size', payload.size)
    }
    if (payload.quality !== 'auto') {
      form.append('quality', payload.quality)
    }

    const res = await api.post<OpenAIImageResponse>('/v1/images/edits', form, {
      headers,
      skipErrorHandler: true,
    } as Record<string, unknown>)
    return mapImageResponse(res.data)
  }

  const body: Record<string, unknown> = {
    model: payload.model,
    prompt: payload.prompt,
    n: payload.count,
  }
  if (payload.size !== 'auto') {
    body.size = payload.size
  }
  if (payload.quality !== 'auto') {
    body.quality = payload.quality
  }

  const res = await api.post<OpenAIImageResponse>(
    '/v1/images/generations',
    body,
    {
      headers,
      skipErrorHandler: true,
    } as Record<string, unknown>
  )
  return mapImageResponse(res.data)
}
