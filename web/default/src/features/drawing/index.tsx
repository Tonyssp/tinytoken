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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from 'react'
import {
  Download,
  Eye,
  ImageIcon,
  ImagePlus,
  Loader2,
  MessageSquareText,
  Paintbrush,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/dialog'
import { ModelGroupSelector } from '@/components/model-group-selector'
import { getUserGroups, getUserModels } from '@/features/playground/api'
import type { GroupOption, ModelOption } from '@/features/playground/types'
import { generateImage, type DrawingResult } from './api'
import {
  deleteDrawingSession,
  loadDrawingSessions,
  saveDrawingSession,
  type DrawingSession,
} from './storage'

const MAX_REFERENCE_IMAGE_SIZE = 20 * 1024 * 1024

type GenerationTurn = {
  id: string
  prompt: string
  referenceName?: string
  referenceUrl?: string
  referenceBlob?: Blob
  results: DrawingResult[]
  status: 'loading' | 'success' | 'error'
  error?: string
  current: number
  total: number
}

function createDrawingId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isImageModel(model: string) {
  const value = model.toLowerCase()
  return (
    value.includes('image') ||
    value.includes('dall') ||
    value.includes('flux') ||
    value.includes('midjourney') ||
    value.includes('mj')
  )
}

function formatSessionTime(timestamp: number) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function getImageSrc(result: DrawingResult) {
  if (result.url) return result.url
  if (result.b64) return `data:image/png;base64,${result.b64}`
  return ''
}

function getSessionPrompt(turns: GenerationTurn[], prompt: string) {
  const previousPrompts = turns
    .filter((turn) => turn.status === 'success' && turn.results.length > 0)
    .slice(-3)
    .map((turn) => turn.prompt.trim())
    .filter(Boolean)

  if (previousPrompts.length === 0) return prompt

  return [
    'Continue the same visual subject, identity, style, and details from the previous image in this conversation.',
    'Previous requests:',
    ...previousPrompts.map((item, index) => `${index + 1}. ${item}`),
    'Current request:',
    prompt,
  ].join('\n')
}

async function drawingResultToFile(result: DrawingResult) {
  try {
    if (result.b64) {
      const encoded = result.b64.includes(',')
        ? result.b64.slice(result.b64.indexOf(',') + 1)
        : result.b64
      const binary = window.atob(encoded)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }
      return new File([bytes], 'session-reference.png', { type: 'image/png' })
    }

    if (!result.url) return null

    const response = await fetch(result.url)
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return null
    return new File([blob], 'session-reference.png', {
      type: blob.type || 'image/png',
    })
  } catch {
    return null
  }
}

function getRequestId(message: string) {
  return message.match(/request(?:_ori)?_id:\s*([A-Za-z0-9-]+)/i)?.[1] || ''
}

function getDrawingErrorMessage(error: unknown) {
  const fallback = 'สร้างรูปภาพไม่สำเร็จ กรุณาตรวจสอบกลุ่มและโมเดลที่เลือก'
  if (!error || typeof error !== 'object') return fallback

  const response = (
    error as {
      response?: {
        status?: number
        data?: {
          error?: { code?: string; message?: string; type?: string }
          code?: string
          message?: string
        }
      }
    }
  ).response
  const errorCode = String(
    response?.data?.error?.code || response?.data?.code || ''
  )
  const upstreamMessage =
    response?.data?.error?.message || response?.data?.message
  const rawMessage =
    upstreamMessage || (error instanceof Error ? error.message : '')
  const normalizedError = `${errorCode} ${rawMessage}`.toLowerCase()

  if (
    errorCode === 'insufficient_user_quota' ||
    normalizedError.includes('insufficient_user_quota') ||
    normalizedError.includes('quota is not enough') ||
    normalizedError.includes('insufficient quota') ||
    normalizedError.includes('insufficient credit') ||
    normalizedError.includes('insufficient balance') ||
    normalizedError.includes('เครดิตไม่เพียงพอ') ||
    normalizedError.includes('余额不足') ||
    normalizedError.includes('额度不足')
  ) {
    return 'เครดิตคุณไม่พอ กรุณาเติมเครดิต'
  }

  if (response?.status === 503) {
    return 'กลุ่มที่เลือกไม่มีช่องทางรองรับโมเดลหรือการแก้ไขรูปภาพนี้ กรุณาเลือกกลุ่ม/โมเดลอื่น หรือติดต่อผู้ดูแลให้เปิด endpoint รูปภาพ'
  }

  if (response?.status === 403) {
    return 'บัญชีนี้ไม่มีสิทธิ์ใช้โมเดลหรือกลุ่มที่เลือก'
  }

  const requestId = getRequestId(rawMessage)
  const requestIdSuffix = requestId ? ` (Request ID: ${requestId})` : ''

  if (
    rawMessage.includes('价格') ||
    rawMessage.toLowerCase().includes('has not been priced')
  ) {
    return `ผู้ดูแลยังไม่ได้กำหนดราคาสำหรับโมเดลนี้ กรุณาติดต่อผู้ดูแลให้เปิดใช้งานโมเดล${requestIdSuffix}`
  }

  if (/[\u3400-\u9fff]/u.test(rawMessage)) {
    return `ผู้ให้บริการต้นทางปฏิเสธคำขอ กรุณาลองใหม่หรือติดต่อผู้ดูแล${requestIdSuffix}`
  }

  return rawMessage || fallback
}

export function Drawing() {
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [modelsByGroup, setModelsByGroup] = useState<
    Record<string, ModelOption[]>
  >({})
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('auto')
  const [quality, setQuality] = useState('auto')
  const [count, setCount] = useState('1')
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referencePreviewUrl, setReferencePreviewUrl] = useState('')
  const [turns, setTurns] = useState<GenerationTurn[]>([])
  const [sessions, setSessions] = useState<DrawingSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState(createDrawingId)
  const [activeSessionCreatedAt, setActiveSessionCreatedAt] = useState(() =>
    Date.now()
  )
  const [sessionsReady, setSessionsReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewImage, setPreviewImage] = useState<{
    src: string
    alt: string
  } | null>(null)
  const [generationProgress, setGenerationProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const turnReferenceUrlsRef = useRef<string[]>([])
  const dragDepthRef = useRef(0)
  const generationLockRef = useRef(false)

  const selectedModelExists = useMemo(
    () => models.some((model) => model.value === selectedModel),
    [models, selectedModel]
  )

  useEffect(() => {
    void getUserGroups()
      .then(async (items) => {
        const entries = await Promise.all(
          items.map(async (group) => {
            const groupModels = await getUserModels(group.value)
            return [
              group.value,
              groupModels.filter((model) => isImageModel(model.value)),
            ] as const
          })
        )
        const catalog = Object.fromEntries(entries)
        const imageGroups = items.filter(
          (group) => (catalog[group.value]?.length || 0) > 0
        )

        setModelsByGroup(catalog)
        setGroups(imageGroups)
        setSelectedGroup((current) =>
          imageGroups.some((group) => group.value === current)
            ? current
            : imageGroups[0]?.value || ''
        )
      })
      .catch(() => {
        setModelsByGroup({})
        setGroups([])
        setSelectedGroup('')
      })
  }, [])

  useEffect(() => {
    const imageModels = modelsByGroup[selectedGroup] || []
    setModels(imageModels)
    setSelectedModel((current) =>
      imageModels.some((model) => model.value === current)
        ? current
        : imageModels[0]?.value || ''
    )
  }, [modelsByGroup, selectedGroup])

  useEffect(() => {
    void loadDrawingSessions()
      .then(setSessions)
      .catch(() => {
        toast.error('โหลดประวัติบทสนทนาไม่สำเร็จ')
      })
      .finally(() => setSessionsReady(true))
  }, [])

  useEffect(() => {
    if (!sessionsReady || turns.length === 0) return

    const timeout = window.setTimeout(() => {
      const now = Date.now()
      const session: DrawingSession = {
        id: activeSessionId,
        title: turns[0].prompt.slice(0, 42),
        createdAt: activeSessionCreatedAt,
        updatedAt: now,
        turns: turns.map(({ referenceUrl: _referenceUrl, ...turn }) => turn),
      }

      void saveDrawingSession(session)
        .then(setSessions)
        .catch(() => {
          toast.error('บันทึกประวัติบทสนทนาไม่สำเร็จ')
        })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [activeSessionCreatedAt, activeSessionId, sessionsReady, turns])

  useEffect(() => {
    return () => {
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl)
    }
  }, [referencePreviewUrl])

  useEffect(() => {
    return () => {
      turnReferenceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const setReferenceFile = useCallback(
    (file: File | null) => {
      if (!file) {
        if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl)
        setReferenceImage(null)
        setReferencePreviewUrl('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น')
        return
      }
      if (file.size > MAX_REFERENCE_IMAGE_SIZE) {
        toast.error('รูปอ้างอิงต้องมีขนาดไม่เกิน 20 MB')
        return
      }

      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl)
      setReferenceImage(file)
      setReferencePreviewUrl(URL.createObjectURL(file))
    },
    [referencePreviewUrl]
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      dragDepthRef.current = 0
      setDragActive(false)
      const image = Array.from(event.dataTransfer.files).find((file) =>
        file.type.startsWith('image/')
      )
      if (image) setReferenceFile(image)
      else toast.error('กรุณาลากไฟล์รูปภาพมาวาง')
    },
    [setReferenceFile]
  )

  const handlePageDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (!event.dataTransfer.types.includes('Files')) return
      dragDepthRef.current += 1
      setDragActive(true)
    },
    []
  )

  const handlePageDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handlePageDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setDragActive(false)
    },
    []
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLElement>) => {
      const image = Array.from(event.clipboardData.items)
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile()
      if (!image) return

      event.preventDefault()
      setReferenceFile(image)
      toast.success('วางรูปอ้างอิงแล้ว')
    },
    [setReferenceFile]
  )

  const releaseTurnReferenceUrls = useCallback(() => {
    turnReferenceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    turnReferenceUrlsRef.current = []
  }, [])

  const startNewSession = useCallback(() => {
    if (loading) {
      toast.error('กรุณารอให้การสร้างรูปภาพปัจจุบันเสร็จก่อน')
      return
    }

    releaseTurnReferenceUrls()
    setReferenceFile(null)
    setPrompt('')
    setTurns([])
    setActiveSessionId(createDrawingId())
    setActiveSessionCreatedAt(Date.now())
  }, [loading, releaseTurnReferenceUrls, setReferenceFile])

  const selectSession = useCallback(
    (session: DrawingSession) => {
      if (loading || session.id === activeSessionId) return

      releaseTurnReferenceUrls()
      setReferenceFile(null)
      const restoredTurns = session.turns.map((turn) => {
        const referenceUrl = turn.referenceBlob
          ? URL.createObjectURL(turn.referenceBlob)
          : undefined
        if (referenceUrl) turnReferenceUrlsRef.current.push(referenceUrl)

        return {
          ...turn,
          referenceUrl,
          status: turn.status === 'loading' ? ('error' as const) : turn.status,
          error:
            turn.status === 'loading'
              ? 'งานนี้หยุดลงก่อนสร้างรูปภาพเสร็จ กรุณาส่งใหม่'
              : turn.error,
        }
      })

      setTurns(restoredTurns)
      setActiveSessionId(session.id)
      setActiveSessionCreatedAt(session.createdAt)
    },
    [activeSessionId, loading, releaseTurnReferenceUrls, setReferenceFile]
  )

  const removeSession = useCallback(
    (sessionId: string) => {
      if (loading) return
      void deleteDrawingSession(sessionId)
        .then((items) => {
          setSessions(items)
          if (sessionId === activeSessionId) startNewSession()
        })
        .catch(() => toast.error('ลบบทสนทนาไม่สำเร็จ'))
    },
    [activeSessionId, loading, startNewSession]
  )

  const clearHistory = useCallback(() => {
    if (loading || turns.length === 0) return
    void deleteDrawingSession(activeSessionId)
      .then((items) => {
        setSessions(items)
        startNewSession()
      })
      .catch(() => toast.error('ล้างประวัติไม่สำเร็จ'))
  }, [activeSessionId, loading, startNewSession, turns.length])

  const handleGenerate = useCallback(async () => {
    const cleanPrompt = prompt.trim()

    if (generationLockRef.current || loading) return
    if (!cleanPrompt) {
      toast.error('กรุณาใส่พรอมป์สำหรับสร้างรูปภาพ')
      return
    }
    if (!selectedModel) {
      toast.error('กรุณาเลือกโมเดลสร้างรูปภาพ')
      return
    }

    generationLockRef.current = true
    const latestSuccessfulTurn = [...turns]
      .reverse()
      .find((turn) => turn.status === 'success' && turn.results.length > 0)
    const latestResult = latestSuccessfulTurn?.results.at(-1)
    const automaticReference =
      !referenceImage && latestResult
        ? await drawingResultToFile(latestResult)
        : null
    const submittedReference = referenceImage || automaticReference
    const usesSessionMemory = !referenceImage && Boolean(automaticReference)
    const submittedPrompt = getSessionPrompt(turns, cleanPrompt)
    const requestedCount = Math.max(1, Number(count) || 1)
    const turnId = createDrawingId()
    const turnReferenceUrl = referenceImage
      ? URL.createObjectURL(referenceImage)
      : usesSessionMemory && latestResult
        ? getImageSrc(latestResult)
        : undefined
    if (referenceImage && turnReferenceUrl) {
      turnReferenceUrlsRef.current.push(turnReferenceUrl)
    }

    setTurns((previous) => [
      ...previous,
      {
        id: turnId,
        prompt: cleanPrompt,
        referenceName:
          referenceImage?.name ||
          (usesSessionMemory ? 'รูปจากบทสนทนาก่อนหน้า' : undefined),
        referenceUrl: turnReferenceUrl,
        referenceBlob: referenceImage || undefined,
        results: [],
        status: 'loading',
        current: 1,
        total: requestedCount,
      },
    ])

    setPrompt('')
    setReferenceFile(null)

    let generatedCount = 0

    setLoading(true)
    setGenerationProgress({ current: 1, total: requestedCount })
    try {
      for (let index = 0; index < requestedCount; index += 1) {
        setGenerationProgress({ current: index + 1, total: requestedCount })
        setTurns((previous) =>
          previous.map((turn) =>
            turn.id === turnId ? { ...turn, current: index + 1 } : turn
          )
        )

        const generated = await generateImage({
          group: selectedGroup,
          model: selectedModel,
          prompt: submittedPrompt,
          size,
          quality,
          count: 1,
          referenceImage: submittedReference,
        })

        if (generated.length === 0) {
          throw new Error('upstream ไม่ได้ส่งรูปภาพกลับมา')
        }

        generatedCount += generated.length
        setTurns((previous) =>
          previous.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  results: [...turn.results, ...generated],
                  current: index + 1,
                }
              : turn
          )
        )
      }

      setTurns((previous) =>
        previous.map((turn) =>
          turn.id === turnId ? { ...turn, status: 'success' } : turn
        )
      )
      toast.success(`สร้างรูปภาพสำเร็จ ${generatedCount} รูป`)
    } catch (error) {
      const message = getDrawingErrorMessage(error)
      setTurns((previous) =>
        previous.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                status: 'error',
                error:
                  generatedCount > 0
                    ? `สร้างได้ ${generatedCount}/${requestedCount} รูป แล้วหยุด: ${message}`
                    : message,
              }
            : turn
        )
      )
      toast.error(
        generatedCount > 0
          ? `สร้างได้ ${generatedCount}/${requestedCount} รูป แล้วหยุด: ${message}`
          : message
      )
    } finally {
      setGenerationProgress(null)
      setLoading(false)
      generationLockRef.current = false
    }
  }, [
    count,
    loading,
    prompt,
    quality,
    referenceImage,
    selectedModel,
    selectedGroup,
    setReferenceFile,
    size,
    turns,
  ])

  return (
    <div
      className='bg-background relative flex h-full min-h-0 w-full flex-1 overflow-hidden'
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {dragActive && (
        <div className='bg-background/90 pointer-events-none absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm'>
          <div className='border-primary bg-primary/5 text-primary flex min-h-56 w-[min(90%,720px)] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 text-center shadow-lg'>
            <Upload className='size-12' />
            <div>
              <p className='text-xl font-semibold'>วางรูปอ้างอิงได้เลย</p>
              <p className='text-muted-foreground mt-1 text-sm'>
                ลากรูปมาวางตรงไหนก็ได้ในหน้าสร้างรูปภาพ
              </p>
            </div>
          </div>
        </div>
      )}

      <aside className='bg-muted/20 hidden w-80 shrink-0 flex-col border-r lg:flex'>
        <div className='max-h-[58%] shrink-0 overflow-y-auto border-b p-3'>
          <Card className='rounded-xl shadow-sm'>
            <CardHeader className='space-y-2'>
              <div className='flex items-center gap-2'>
                <div className='bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl'>
                  <Paintbrush className='size-5' />
                </div>
                <div>
                  <CardTitle>การสร้างรูปภาพ</CardTitle>
                  <p className='text-muted-foreground text-sm'>
                    สร้างรูปภาพด้วย AI
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-5'>
              <ModelGroupSelector
                groups={groups}
                models={models}
                selectedGroup={selectedGroup}
                selectedModel={selectedModel}
                onGroupChange={setSelectedGroup}
                onModelChange={setSelectedModel}
                disabled={loading}
              />

              {!selectedModelExists && (
                <p className='text-xs text-amber-600'>
                  กลุ่มนี้ยังไม่มีโมเดลสร้างรูปภาพที่บัญชีของคุณใช้งานได้
                </p>
              )}

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-2'>
                  <Label>ขนาด</Label>
                  <Select
                    value={size}
                    onValueChange={(value) => value && setSize(value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='auto'>auto</SelectItem>
                      <SelectItem value='1024x1024'>1024x1024</SelectItem>
                      <SelectItem value='1536x1024'>1536x1024</SelectItem>
                      <SelectItem value='1024x1536'>1024x1536</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>คุณภาพ</Label>
                  <Select
                    value={quality}
                    onValueChange={(value) => value && setQuality(value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='auto'>auto</SelectItem>
                      <SelectItem value='low'>low</SelectItem>
                      <SelectItem value='medium'>medium</SelectItem>
                      <SelectItem value='high'>high</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2'>
                <Label>จำนวนรูปภาพ</Label>
                <Select
                  value={count}
                  onValueChange={(value) => value && setCount(value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1'>1</SelectItem>
                    <SelectItem value='2'>2</SelectItem>
                    <SelectItem value='3'>3</SelectItem>
                    <SelectItem value='4'>4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant='destructive'
                className='w-full justify-start'
                onClick={clearHistory}
                disabled={turns.length === 0 || loading}
              >
                <Trash2 className='size-4' />
                ล้างประวัติ
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className='flex h-16 shrink-0 items-center justify-between border-b px-4'>
          <div className='font-semibold'>บทสนทนา</div>
          <Button
            className='gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-white shadow-sm hover:from-violet-600 hover:to-fuchsia-600'
            onClick={startNewSession}
            disabled={loading}
            size='sm'
          >
            <Plus className='size-4' />
            ใหม่
          </Button>
        </div>

        <div className='min-h-32 flex-1 overflow-y-auto p-3'>
          {sessions.length === 0 ? (
            <div className='text-muted-foreground flex h-full min-h-28 flex-col items-center justify-center gap-2 text-center text-sm'>
              <MessageSquareText className='size-5 opacity-50' />
              <p>ยังไม่มีบทสนทนา</p>
            </div>
          ) : (
            <div className='space-y-1.5'>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    session.id === activeSessionId
                      ? 'border-primary/30 bg-primary/10'
                      : 'hover:bg-muted border-transparent'
                  }`}
                >
                  <button
                    type='button'
                    className='min-w-0 flex-1 text-left'
                    onClick={() => selectSession(session)}
                    disabled={loading}
                  >
                    <span className='block truncate text-sm font-medium'>
                      {session.title}
                    </span>
                    <span className='text-muted-foreground block text-xs'>
                      {formatSessionTime(session.updatedAt)}
                    </span>
                  </button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8 shrink-0 opacity-60 group-hover:opacity-100 hover:text-red-600'
                    onClick={() => removeSession(session.id)}
                    disabled={loading}
                    aria-label={`ลบบทสนทนา ${session.title}`}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className='flex min-h-0 min-w-0 flex-1 flex-col'>
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8'>
          {turns.length === 0 ? (
            <div className='m-auto flex max-w-2xl flex-col items-center text-center'>
              <div className='shadow-primary/20 mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg'>
                <ImagePlus className='size-8' />
              </div>
              <h1 className='text-3xl font-bold tracking-tight'>
                สร้างรูปภาพแรกของคุณ
              </h1>
              <p className='text-muted-foreground mt-3'>
                ใช้โมเดลสร้างรูปภาพของ TinyAPI ใส่พรอมป์ด้านล่าง
                หรืออัปโหลดรูปเพื่อสร้างจากรูปภาพ
              </p>
              <div className='mt-6 grid w-full gap-3 sm:grid-cols-2'>
                {[
                  'ไอคอนแอปเรียบหรูสำหรับแดชบอร์ด AI API',
                  'ตลาดกลางคืนแนวไซเบอร์พังก์ในประเทศไทย',
                  'รูปฮีโร่สินค้าแบบมินิมอลสำหรับ TinyAPI',
                  'หุ่นยนต์เป็นมิตรถือการ์ด API key',
                ].map((item) => (
                  <button
                    key={item}
                    className='bg-card hover:bg-accent rounded-lg border px-4 py-3 text-left text-sm'
                    onClick={() => setPrompt(item)}
                    type='button'
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-10'>
              {turns.map((turn) => (
                <section key={turn.id} className='space-y-5'>
                  <div className='ml-auto flex max-w-2xl flex-col items-end gap-3'>
                    {turn.referenceUrl && (
                      <img
                        src={turn.referenceUrl}
                        alt={turn.referenceName || 'รูปอ้างอิง'}
                        className='size-36 rounded-xl border object-cover shadow-sm'
                      />
                    )}
                    <div className='bg-muted rounded-3xl rounded-tr-md px-5 py-3 text-sm leading-relaxed sm:text-base'>
                      {turn.prompt}
                    </div>
                  </div>

                  {turn.status === 'loading' && turn.results.length === 0 && (
                    <div className='bg-muted/30 flex min-h-64 items-center justify-center rounded-xl border border-dashed'>
                      <div className='text-muted-foreground flex items-center gap-3 text-sm'>
                        <Loader2 className='size-5 animate-spin' />
                        กำลังสร้างรูปภาพ {turn.current}/{turn.total}
                      </div>
                    </div>
                  )}

                  {turn.error && (
                    <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'>
                      {turn.error}
                    </div>
                  )}

                  {turn.results.length > 0 && (
                    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                      {turn.results.map((result) => {
                        const src = getImageSrc(result)
                        const imageAlt =
                          result.revisedPrompt ||
                          turn.prompt ||
                          'รูปภาพที่สร้างขึ้น'
                        return (
                          <Card
                            key={result.id}
                            className='overflow-hidden rounded-xl'
                          >
                            <div className='bg-muted aspect-square'>
                              {src ? (
                                <img
                                  src={src}
                                  alt={imageAlt}
                                  className='size-full object-cover'
                                />
                              ) : (
                                <div className='text-muted-foreground flex size-full items-center justify-center'>
                                  <ImageIcon className='size-8' />
                                </div>
                              )}
                            </div>
                            <CardContent className='space-y-3 p-4'>
                              {result.revisedPrompt && (
                                <p className='text-muted-foreground line-clamp-2 text-xs'>
                                  {result.revisedPrompt}
                                </p>
                              )}
                              <div className='flex gap-2'>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  disabled={!src}
                                  onClick={() =>
                                    setPreviewImage({ src, alt: imageAlt })
                                  }
                                >
                                  <Eye className='size-4' />
                                  เปิด
                                </Button>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  disabled={!src}
                                  render={
                                    <a
                                      href={src}
                                      download='tinyapi-drawing.png'
                                    />
                                  }
                                >
                                  <Download className='size-4' />
                                  ดาวน์โหลด
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>

        <div className='bg-background/95 shrink-0 border-t px-4 pt-2 pb-1 backdrop-blur'>
          <div className='mx-auto max-w-6xl space-y-2'>
            {referenceImage && (
              <div className='bg-muted/40 flex items-center gap-3 rounded-xl border p-2 text-sm'>
                {referencePreviewUrl && (
                  <img
                    src={referencePreviewUrl}
                    alt='ตัวอย่างรูปอ้างอิง'
                    className='size-14 rounded-lg object-cover'
                  />
                )}
                <span className='min-w-0 flex-1 truncate'>
                  {referenceImage.name}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setReferenceFile(null)}
                  aria-label='ลบรูปอ้างอิง'
                >
                  <X className='size-4' />
                </Button>
              </div>
            )}
            <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
              <Upload className='size-3.5' />
              <span>คลิก ลากรูปวางตรงไหนก็ได้ หรือวางจากคลิปบอร์ด</span>
              <span>Enter เพื่อสร้าง · Shift + Enter เพื่อขึ้นบรรทัดใหม่</span>
            </div>
            <div className='bg-card relative flex items-end gap-3 rounded-2xl border p-3 shadow-sm'>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(event) =>
                  setReferenceFile(event.target.files?.[0] || null)
                }
              />
              <Button
                variant='secondary'
                size='icon'
                className='h-14 w-14 shrink-0 rounded-xl'
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label='เพิ่มรูปอ้างอิง'
              >
                <Plus className='size-5' />
              </Button>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault()
                    void handleGenerate()
                  }
                }}
                placeholder='อธิบายรูปภาพที่ต้องการ เช่น สุนัขจิ้งจอกนีออนวิ่งใต้ท้องฟ้าที่เต็มไปด้วยดาว'
                className='max-h-40 min-h-24 resize-none border-0 bg-transparent focus-visible:ring-0'
                disabled={loading}
              />
              <Button
                className='h-14 shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-7 text-white hover:opacity-90'
                onClick={() => void handleGenerate()}
                disabled={loading || !selectedModel}
              >
                {loading ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Sparkles className='size-4' />
                )}
                {generationProgress
                  ? `กำลังสร้าง ${generationProgress.current}/${generationProgress.total}`
                  : 'สร้างรูปภาพ'}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
        title='ตัวอย่างรูปภาพ'
        description='ตรวจสอบรูปภาพขนาดเต็มภายในหน้าเว็บ'
        contentClassName='sm:max-w-5xl'
        contentHeight='min(76vh, 760px)'
        bodyClassName='flex h-full items-center justify-center rounded-lg bg-muted/30 p-2'
        footer={
          previewImage ? (
            <Button
              variant='outline'
              render={
                <a href={previewImage.src} download='tinyapi-drawing.png' />
              }
            >
              <Download className='size-4' />
              ดาวน์โหลด
            </Button>
          ) : null
        }
      >
        {previewImage ? (
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            className='max-h-full max-w-full object-contain'
          />
        ) : null}
      </Dialog>
    </div>
  )
}
