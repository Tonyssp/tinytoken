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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Eye,
  ImageIcon,
  ImagePlus,
  Loader2,
  Paintbrush,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ModelGroupSelector } from '@/components/model-group-selector'
import { getUserGroups, getUserModels } from '@/features/playground/api'
import type { GroupOption, ModelOption } from '@/features/playground/types'
import { generateImage, type DrawingResult } from './api'

const TOKEN_STORAGE_KEY = 'tinyapi:drawing:token'

const FALLBACK_IMAGE_MODELS: ModelOption[] = [
  { label: 'gpt-image-2', value: 'gpt-image-2' },
  { label: 'gpt-image-1.5', value: 'gpt-image-1.5' },
  { label: 'gpt-image-1', value: 'gpt-image-1' },
  { label: 'gpt-image-1-mini', value: 'gpt-image-1-mini' },
  { label: 'chatgpt-image-latest', value: 'chatgpt-image-latest' },
  {
    label: 'gemini-3.1-flash-image-preview',
    value: 'gemini-3.1-flash-image-preview',
  },
  { label: 'gemini-2.5-flash-image', value: 'gemini-2.5-flash-image' },
  { label: 'gemini-3-pro-image-preview', value: 'gemini-3-pro-image-preview' },
]

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

function getImageSrc(result: DrawingResult) {
  if (result.url) return result.url
  if (result.b64) return `data:image/png;base64,${result.b64}`
  return ''
}

function mergeImageModels(models: ModelOption[]) {
  const seen = new Set<string>()
  return [...models, ...FALLBACK_IMAGE_MODELS].filter((model) => {
    if (!model.value || seen.has(model.value)) return false
    seen.add(model.value)
    return true
  })
}

export function Drawing() {
  const [token, setToken] = useState('')
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [models, setModels] = useState<ModelOption[]>(FALLBACK_IMAGE_MODELS)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedModel, setSelectedModel] = useState(
    FALLBACK_IMAGE_MODELS[0].value
  )
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('auto')
  const [quality, setQuality] = useState('auto')
  const [count, setCount] = useState('1')
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [results, setResults] = useState<DrawingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedModelExists = useMemo(
    () => models.some((model) => model.value === selectedModel),
    [models, selectedModel]
  )

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_STORAGE_KEY) || '')
  }, [])

  useEffect(() => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token.trim())
  }, [token])

  useEffect(() => {
    void getUserGroups()
      .then((items) => {
        setGroups(items)
        if (!selectedGroup && items[0]) setSelectedGroup(items[0].value)
      })
      .catch(() => setGroups([]))
  }, [selectedGroup])

  useEffect(() => {
    void getUserModels(selectedGroup || undefined)
      .then((items) => {
        const imageModels = items.filter((model) => isImageModel(model.value))
        const nextModels = mergeImageModels(imageModels)
        setModels(nextModels)
        if (!nextModels.some((model) => model.value === selectedModel)) {
          setSelectedModel(nextModels[0]?.value || '')
        }
      })
      .catch(() => setModels(FALLBACK_IMAGE_MODELS))
  }, [selectedGroup, selectedModel])

  const handleGenerate = useCallback(async () => {
    const cleanToken = token.trim()
    const cleanPrompt = prompt.trim()

    if (!cleanToken) {
      toast.error('กรุณาใส่โทเค็น API ก่อน')
      return
    }
    if (!cleanPrompt) {
      toast.error('กรุณาใส่พรอมป์สำหรับสร้างรูปภาพ')
      return
    }
    if (!selectedModel) {
      toast.error('กรุณาเลือกโมเดลสร้างรูปภาพ')
      return
    }

    const requestedCount = Math.max(1, Number(count) || 1)
    let generatedCount = 0

    setLoading(true)
    setGenerationProgress({ current: 1, total: requestedCount })
    try {
      for (let index = 0; index < requestedCount; index += 1) {
        setGenerationProgress({ current: index + 1, total: requestedCount })

        const generated = await generateImage({
          token: cleanToken,
          model: selectedModel,
          prompt: cleanPrompt,
          size,
          quality,
          count: 1,
          referenceImage,
        })

        if (generated.length === 0) {
          throw new Error('upstream ไม่ได้ส่งรูปภาพกลับมา')
        }

        generatedCount += generated.length
        setResults((prev) => [...generated, ...prev])
      }

      toast.success(`สร้างรูปภาพสำเร็จ ${generatedCount} รูป`)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'สร้างรูปภาพไม่สำเร็จ กรุณาตรวจสอบ API key และโมเดล'
      toast.error(
        generatedCount > 0
          ? `สร้างได้ ${generatedCount}/${requestedCount} รูป แล้วหยุด: ${message}`
          : message
      )
    } finally {
      setGenerationProgress(null)
      setLoading(false)
    }
  }, [count, prompt, quality, referenceImage, selectedModel, size, token])

  return (
    <div className='bg-background flex h-[calc(100vh-var(--header-height))] min-h-[720px]'>
      <aside className='bg-muted/20 hidden w-80 shrink-0 border-r p-4 lg:block'>
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
            <div className='space-y-2'>
              <Label>โทเค็น API</Label>
              <Input
                type='password'
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder='sk-...'
              />
              <p className='text-muted-foreground text-xs leading-relaxed'>
                โทเค็นจะถูกเก็บไว้เฉพาะในเบราว์เซอร์ของคุณ และใช้เรียก API
                สร้างรูปภาพเพื่อคิดเครดิต
              </p>
            </div>

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
                โมเดลนี้ไม่ได้อยู่ในกลุ่มที่เลือก
                ระบบจึงแสดงรายการโมเดลรูปภาพสำรอง
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
              onClick={() => setResults([])}
              disabled={results.length === 0 || loading}
            >
              <Trash2 className='size-4' />
              ล้างประวัติ
            </Button>
          </CardContent>
        </Card>
      </aside>

      <main className='flex min-w-0 flex-1 flex-col'>
        <div className='flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8'>
          {results.length === 0 ? (
            <div className='mx-auto flex max-w-2xl flex-col items-center text-center'>
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
            <div className='grid w-full max-w-6xl gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {results.map((result) => {
                const src = getImageSrc(result)
                return (
                  <Card key={result.id} className='overflow-hidden rounded-xl'>
                    <div className='bg-muted aspect-square'>
                      {src ? (
                        <img
                          src={src}
                          alt={
                            result.revisedPrompt ||
                            prompt ||
                            'รูปภาพที่สร้างขึ้น'
                          }
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
                          render={
                            <a href={src} target='_blank' rel='noreferrer' />
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
                            <a href={src} download='tinyapi-drawing.png' />
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
        </div>

        <div className='bg-background/95 border-t p-4 backdrop-blur'>
          <div className='mx-auto max-w-5xl space-y-3'>
            {referenceImage && (
              <div className='bg-muted/40 flex items-center justify-between rounded-lg border px-3 py-2 text-sm'>
                <span className='truncate'>
                  รูปอ้างอิง: {referenceImage.name}
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setReferenceImage(null)}
                >
                  ลบ
                </Button>
              </div>
            )}
            <div className='bg-card flex gap-3 rounded-2xl border p-3 shadow-sm'>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(event) =>
                  setReferenceImage(event.target.files?.[0] || null)
                }
              />
              <Button
                variant='secondary'
                size='icon'
                className='h-12 w-12 shrink-0 rounded-xl'
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Plus className='size-5' />
              </Button>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault()
                    void handleGenerate()
                  }
                }}
                placeholder='อธิบายรูปภาพที่ต้องการ เช่น สุนัขจิ้งจอกนีออนวิ่งใต้ท้องฟ้าที่เต็มไปด้วยดาว'
                className='min-h-12 resize-none border-0 bg-transparent focus-visible:ring-0'
                disabled={loading}
              />
              <Button
                className='h-12 shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 text-white hover:opacity-90'
                onClick={() => void handleGenerate()}
                disabled={loading}
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
            <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
              <Upload className='size-3.5' />
              <span>รองรับการสร้างจากข้อความและจากรูปภาพ</span>
              <span>Ctrl/Cmd + Enter เพื่อสร้าง</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
