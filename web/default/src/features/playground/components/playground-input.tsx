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
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import type { FileUIPart } from 'ai'
import {
  PaperclipIcon,
  FileIcon,
  ImageIcon,
  CameraIcon,
  GlobeIcon,
  SendIcon,
  SquareIcon,
  BarChartIcon,
  BoxIcon,
  NotepadTextIcon,
  CodeSquareIcon,
  GraduationCapIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import { ModelGroupSelector } from '@/components/model-group-selector'
import type { ModelOption, GroupOption, PlaygroundAttachment } from '../types'

interface PlaygroundInputProps {
  onSubmit: (
    text: string,
    attachments?: PlaygroundAttachment[],
    webSearch?: boolean
  ) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  models: ModelOption[]
  modelValue: string
  onModelChange: (value: string) => void
  isModelLoading?: boolean
  groups: GroupOption[]
  groupValue: string
  onGroupChange: (value: string) => void
}

const suggestions = [
  { icon: BarChartIcon, text: 'วิเคราะห์ข้อมูล', color: '#0ea5e9' },
  { icon: BoxIcon, text: 'ลองถามตัวอย่าง', color: '#8b5cf6' },
  { icon: NotepadTextIcon, text: 'สรุปข้อความ', color: '#f97316' },
  { icon: CodeSquareIcon, text: 'เขียนโค้ด', color: '#6366f1' },
  { icon: GraduationCapIcon, text: 'ขอคำแนะนำ', color: '#14b8a6' },
  { icon: null, text: 'เพิ่มเติม' },
]

const MAX_FILES = 4
const MAX_FILE_SIZE = 8 * 1024 * 1024

function toPlaygroundAttachment(
  file: FileUIPart,
  index: number
): PlaygroundAttachment | null {
  if (!file.url) return null

  return {
    id: `${Date.now()}-${index}`,
    filename: file.filename || `ไฟล์แนบ-${index + 1}`,
    mediaType: file.mediaType || 'application/octet-stream',
    dataUrl: file.url,
  }
}

interface AttachmentControlsProps {
  disabled?: boolean
  onCountChange: (count: number) => void
}

function AttachmentControls({
  disabled,
  onCountChange,
}: AttachmentControlsProps) {
  const { t } = useTranslation()
  const attachments = usePromptInputAttachments()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    onCountChange(attachments.files.length)
  }, [attachments.files.length, onCountChange])

  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || !event.clipboardData?.files.length) return

      event.preventDefault()
      attachments.add(event.clipboardData.files)
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [attachments])

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files?.length) {
      attachments.add(event.currentTarget.files)
    }
    event.currentTarget.value = ''
  }

  return (
    <>
      <input
        className='hidden'
        multiple
        onChange={addFiles}
        ref={fileInputRef}
        type='file'
      />
      <input
        accept='image/*'
        className='hidden'
        multiple
        onChange={addFiles}
        ref={photoInputRef}
        type='file'
      />
      <input
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={addFiles}
        ref={cameraInputRef}
        type='file'
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <PromptInputButton
              className='border font-medium'
              disabled={disabled}
              variant='outline'
            />
          }
        >
          <PaperclipIcon size={16} />
          <span className='hidden sm:inline'>{t('Attach')}</span>
          <span className='sr-only sm:hidden'>{t('Attach')}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <FileIcon className='mr-2' size={16} />
            {t('Upload file')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => photoInputRef.current?.click()}>
            <ImageIcon className='mr-2' size={16} />
            {t('Upload photo')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => cameraInputRef.current?.click()}>
            <CameraIcon className='mr-2' size={16} />
            {t('Take photo')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export function PlaygroundInput({
  onSubmit,
  onStop,
  disabled,
  isGenerating,
  models,
  modelValue,
  onModelChange,
  isModelLoading = false,
  groups,
  groupValue,
  onGroupChange,
}: PlaygroundInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [attachmentCount, setAttachmentCount] = useState(0)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)

  const isModelSelectDisabled =
    disabled || isModelLoading || models.length === 0
  const isGroupSelectDisabled = disabled || groups.length === 0

  const handleSubmit = (message: PromptInputMessage) => {
    if ((!message.text?.trim() && !message.files?.length) || disabled) return
    const attachments = (message.files || [])
      .map(toPlaygroundAttachment)
      .filter(
        (attachment): attachment is PlaygroundAttachment => attachment !== null
      )
    onSubmit(
      message.text?.trim() || 'ช่วยวิเคราะห์ไฟล์ที่แนบมา',
      attachments,
      webSearchEnabled
    )
    setText('')
  }

  const handleSuggestionClick = (suggestion: string) => {
    onSubmit(suggestion)
  }

  return (
    <div className='grid shrink-0 gap-4 px-1 md:pb-4'>
      <PromptInput
        globalDrop
        groupClassName='rounded-xl'
        maxFiles={MAX_FILES}
        maxFileSize={MAX_FILE_SIZE}
        multiple
        onError={(error) => toast.error(error.message)}
        onSubmit={handleSubmit}
      >
        <PromptInputHeader className='px-3 pt-3'>
          <PromptInputAttachments>
            {(attachment) => (
              <PromptInputAttachment className='max-w-56' data={attachment} />
            )}
          </PromptInputAttachments>
        </PromptInputHeader>
        <PromptInputTextarea
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          className='px-5 md:text-base'
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('Ask anything')}
          value={text}
        />

        <PromptInputFooter className='p-2.5'>
          <PromptInputTools>
            <AttachmentControls
              disabled={disabled}
              onCountChange={setAttachmentCount}
            />

            <PromptInputButton
              aria-pressed={webSearchEnabled}
              className={
                webSearchEnabled
                  ? 'border border-sky-500 bg-sky-50 font-medium text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300'
                  : 'border font-medium'
              }
              disabled={disabled}
              onClick={() => setWebSearchEnabled((enabled) => !enabled)}
              title={
                webSearchEnabled
                  ? 'ปิดการค้นหาเว็บ'
                  : 'เปิดการค้นหาเว็บสำหรับคำขอถัดไป'
              }
              type='button'
              variant='outline'
            >
              <GlobeIcon size={16} />
              <span className='hidden sm:inline'>{t('Search')}</span>
              <span className='sr-only sm:hidden'>{t('Search')}</span>
            </PromptInputButton>
          </PromptInputTools>

          <div className='flex items-center gap-1.5 md:gap-2'>
            <ModelGroupSelector
              selectedModel={modelValue}
              models={models}
              onModelChange={onModelChange}
              selectedGroup={groupValue}
              groups={groups}
              onGroupChange={onGroupChange}
              disabled={isModelSelectDisabled || isGroupSelectDisabled}
            />

            {isGenerating && onStop ? (
              <PromptInputButton
                className='text-foreground font-medium'
                onClick={onStop}
                variant='secondary'
              >
                <SquareIcon className='fill-current' size={16} />
                <span className='hidden sm:inline'>{t('Stop')}</span>
                <span className='sr-only sm:hidden'>{t('Stop')}</span>
              </PromptInputButton>
            ) : (
              <PromptInputButton
                className='text-foreground font-medium'
                disabled={disabled || (!text.trim() && attachmentCount === 0)}
                type='submit'
                variant='secondary'
              >
                <SendIcon size={16} />
                <span className='hidden sm:inline'>{t('Send')}</span>
                <span className='sr-only sm:hidden'>{t('Send')}</span>
              </PromptInputButton>
            )}
          </div>
        </PromptInputFooter>
      </PromptInput>

      <Suggestions>
        {suggestions.map(({ icon: Icon, text, color }) => (
          <Suggestion
            className={`text-xs font-normal sm:text-sm ${
              text === 'เพิ่มเติม' ? 'hidden sm:flex' : ''
            }`}
            key={text}
            onClick={() => handleSuggestionClick(text)}
            suggestion={text}
          >
            {Icon && <Icon size={16} style={{ color }} />}
            {text}
          </Suggestion>
        ))}
      </Suggestions>
    </div>
  )
}
