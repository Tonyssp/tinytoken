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
import { useState, type ElementType, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  CircleDollarSign,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  ExternalLink,
  Home,
  Image,
  KeyRound,
  List,
  LogIn,
  Menu,
  MessagesSquare,
  Printer,
  Rocket,
  TerminalSquare,
  UserPlus,
  Wrench,
} from 'lucide-react'
import { getLobeIcon } from '@/lib/lobe-icon'
import { CopyButton } from '@/components/copy-button'
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import {
  TinyTokenHeaderActions,
  tinyTokenHeaderMobileLinks,
} from '@/components/tinytoken-header-actions'

type SidebarItem = {
  slug: string
  title: string
  icon: ElementType
}

type TocItem = {
  title: string
  href: string
}

type CopyValue = {
  label: string
  value: string
}

type DocsPageConfig = {
  slug: string
  groupTitle: string
  title: string
  icon: ElementType
  date: string
  readTime: string
  intro: ReactNode
  heroLink?: {
    label: string
    href: string
  }
  heroImage?: string
  toc: TocItem[]
  render: () => ReactNode
  next?: {
    href: string
    label: string
  }
}

const appUrl = 'https://tinyapi.org'
const apiUrl = 'https://api.tinyapi.org'
const registerUrl = `${appUrl}/sign-up`
const loginUrl = `${appUrl}/sign-in`
const keysUrl = `${appUrl}/keys`
const walletUrl = `${appUrl}/wallet`
const exampleApiKey = 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

const claudeCodeImages = Array.from(
  { length: 11 },
  (_, index) =>
    `/docs-assets/ccswitch-docx/claude-code-${String(index + 1).padStart(2, '0')}.png`
)

const claudeDesktopImages = Array.from(
  { length: 9 },
  (_, index) =>
    `/docs-assets/ccswitch-docx/claude-desktop-${String(index + 1).padStart(2, '0')}.png`
)

const codexImages = Array.from(
  { length: 6 },
  (_, index) =>
    `/docs-assets/ccswitch-docx/codex-${String(index + 1).padStart(2, '0')}.png`
)

const openClawImages = Array.from(
  { length: 8 },
  (_, index) =>
    `/docs-assets/openclaw/openclaw-${String(index + 1).padStart(2, '0')}.png`
)
const openClawLogo = '/docs-assets/openclaw/openclaw-logo.png'
const openCodeLogo = '/docs-assets/opencode/opencode-logo.png'
const hermesLogo = '/docs-assets/hermes/hermes-logo.png'
const hermesImages = [
  '/docs-assets/hermes/hermes-01-install.png',
  '/docs-assets/hermes/hermes-02-model-custom.png',
  '/docs-assets/hermes/hermes-03-model-saved.png',
  '/docs-assets/hermes/hermes-04-ccswitch-tab.png',
  '/docs-assets/hermes/hermes-05-ccswitch-custom.png',
  '/docs-assets/hermes/hermes-06-ccswitch-provider.png',
  '/docs-assets/hermes/hermes-07-gateway-dashboard.png',
]

const openCodeConfig = `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "tinyapi": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "TinyAPI",
      "options": {
        "baseURL": "https://api.tinyapi.org/v1"
      },
      "models": {
        "gpt-4o": {
          "name": "gpt-4o"
        },
        "claude-sonnet-4-6": {
          "name": "claude-sonnet-4-6"
        },
        "deepseek-chat": {
          "name": "deepseek-chat"
        }
      }
    }
  }
}`

const openAIErrorExample = `{
  "error": {
    "message": "Error details",
    "type": "new_api_error",
    "param": "",
    "code": "invalid_request"
  }
}`

const claudeErrorExample = `{
  "type": "error",
  "error": {
    "type": "invalid_request",
    "message": "Error details"
  }
}`

const rateLimitRetryExample = `const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms))

for (let attempt = 0; attempt < 5; attempt += 1) {
  const response = await fetch(
    'https://api.tinyapi.org/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sk-xxxxxxxxxxxxxxxx',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'your-model-id',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    }
  )

  if (response.status !== 429) {
    console.log(await response.json())
    break
  }

  await delay(1000 * 2 ** attempt)
}`

const tokenUsageCurl = `curl https://api.tinyapi.org/api/usage/token \\
  -H "Authorization: Bearer sk-YOUR_API_KEY"`

const tokenUsageResponse = `{
  "code": true,
  "message": "ok",
  "data": {
    "object": "token_usage",
    "name": "my-api-key",
    "total_granted": 1000000,
    "total_used": 250000,
    "total_available": 750000,
    "unlimited_quota": false,
    "model_limits": {},
    "model_limits_enabled": false,
    "expires_at": 0
  }
}`

const modelListCurl = `curl https://api.tinyapi.org/v1/models \\
  -H "Authorization: Bearer sk-YOUR_API_KEY"`

const modelListResponse = `{
  "success": true,
  "object": "list",
  "data": [
    {
      "id": "your-model-id",
      "object": "model",
      "created": 1626777600,
      "owned_by": "custom",
      "supported_endpoint_types": [
        "openai",
        "anthropic"
      ]
    }
  ]
}`

const claudeCurl = `curl https://api.tinyapi.org/v1/messages \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-claude-model-id",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Hello. Please introduce yourself briefly."
      }
    ]
  }'`

const claudeStreamCurl = `curl https://api.tinyapi.org/v1/messages \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-claude-model-id",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      {
        "role": "user",
        "content": "Write a brief explanation of an API."
      }
    ]
  }'`

const claudeResponse = `{
  "id": "msg_xxxxxxxxx",
  "type": "message",
  "role": "assistant",
  "model": "your-claude-model-id",
  "content": [
    {
      "type": "text",
      "text": "Hello. I am ready to help you use TinyAPI."
    }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 18,
    "output_tokens": 20
  }
}`

const chatCompletionsCurl = `curl https://api.tinyapi.org/v1/chat/completions \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-model-id",
    "messages": [
      {
        "role": "user",
        "content": "Explain what an API is in one sentence."
      }
    ]
  }'`

const chatCompletionsStreamCurl = `curl https://api.tinyapi.org/v1/chat/completions \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-model-id",
    "stream": true,
    "messages": [
      {
        "role": "user",
        "content": "Write a short greeting."
      }
    ]
  }'`

const chatCompletionsResponse = `{
  "id": "chatcmpl_xxxxxxxxx",
  "object": "chat.completion",
  "model": "your-model-id",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "An API allows software applications to communicate and exchange data."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 18,
    "total_tokens": 38
  }
}`

const responsesCurl = `curl https://api.tinyapi.org/v1/responses \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-responses-model-id",
    "instructions": "Answer briefly.",
    "input": "Explain one benefit of AI.",
    "store": false
  }'`

const responsesStreamCurl = `curl https://api.tinyapi.org/v1/responses \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-responses-model-id",
    "input": [
      {
        "type": "message",
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": "Summarize one benefit of using an API in one sentence."
          }
        ]
      }
    ],
    "stream": true,
    "store": false,
    "reasoning": {
      "effort": "low"
    }
  }'`

const imageGenerationCurl = `curl https://api.tinyapi.org/v1/images/generations \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-image-model-id",
    "prompt": "A clean product photo of a black coffee mug on a white desk with studio lighting.",
    "n": 1,
    "size": "1024x1024",
    "response_format": "url"
  }'`

const imageGenerationResponse = `{
  "created": 1780591766,
  "data": [
    {
      "url": "https://example.com/generated-image.png",
      "revised_prompt": ""
    }
  ]
}`

const quickStartItems: SidebarItem[] = [
  { slug: 'register', title: '(1) สมัครบัญชี', icon: UserPlus },
  { slug: 'login', title: '(2) เข้าสู่ระบบ', icon: LogIn },
  { slug: 'topup', title: '(3) เติมเครดิต', icon: CreditCard },
  { slug: 'api-key', title: '(4) สร้าง API Key', icon: KeyRound },
  { slug: 'check', title: '(5) ตรวจสอบสภาพแวดล้อม', icon: Wrench },
  { slug: 'model-compatibility', title: '(6) โมเดลเข้ากันได้', icon: TerminalSquare },
  {
    slug: 'token-usage',
    title: '(7) ข้อมูลเครดิตคงเหลือ',
    icon: CircleDollarSign,
  },
  { slug: 'model-list', title: '(8) รายการโมเดล', icon: List },
  {
    slug: 'anthropic-chat',
    title: '(9) Anthropic-compatible chat',
    icon: MessagesSquare,
  },
  {
    slug: 'openai-chat',
    title: '(10) OpenAI-compatible chat',
    icon: Bot,
  },
  {
    slug: 'responses-api',
    title: '(11) OpenAI Responses API',
    icon: TerminalSquare,
  },
  {
    slug: 'image-generation',
    title: '(12) Image Generation',
    icon: Image,
  },
  {
    slug: 'request-errors',
    title: '(13) Error Response Rate Limit',
    icon: AlertTriangle,
  },
]

const ccSwitchItems: SidebarItem[] = [
  { slug: 'cc-switch', title: 'ขั้นตอนทั่วไป', icon: CcSwitchIcon },
  { slug: 'cc-switch-claude-code', title: 'Claude Code ตั้งค่า', icon: ClaudeIcon },
  {
    slug: 'cc-switch-claude-desktop',
    title: 'Claude Desktop ตั้งค่า',
    icon: ClaudeIcon,
  },
  { slug: 'cc-switch-codex', title: 'Codex ตั้งค่า', icon: OpenAIIcon },
  { slug: 'openclaw', title: 'OpenClaw ตั้งค่า', icon: OpenClawIcon },
  { slug: 'opencode', title: 'OpenCode ตั้งค่า', icon: OpenCodeIcon },
  { slug: 'hermes-agent', title: 'Hermes Agent ตั้งค่า', icon: HermesIcon },
]

const docsPageRegistry: Record<string, DocsPageConfig> = {
  register: {
    slug: 'register',
    groupTitle: 'Quick Start',
    title: 'สมัครบัญชี',
    icon: UserPlus,
    date: '2026/6/8',
    readTime: 'อ่านไม่เกิน 1 นาที',
    intro: 'หน้านี้แยกเฉพาะขั้นตอนสมัครบัญชี TinyToken เท่านั้น ไม่ปนกับการเข้าสู่ระบบ',
    heroLink: {
      label: 'ลิงก์สมัคร',
      href: registerUrl,
    },
    heroImage: '/docs-register.png',
    toc: [
      { title: 'เข้าสู่หน้าสมัครบัญชี', href: '#open-register-page' },
      { title: 'วิธีที่หนึ่ง (แนะนำ): ใช้ Google', href: '#register-with-google' },
      { title: 'วิธีที่สอง: ใช้ชื่อผู้ใช้', href: '#register-with-username' },
    ],
    render: () => (
      <>
        <Section id='open-register-page' title='เข้าสู่หน้าสมัครบัญชี'>
          <OrderedList>
            <li>
              เปิดหน้าแรกของ TinyToken แล้วกดปุ่มสมัครบัญชี หรือเปิดลิงก์สมัคร
              โดยตรงจากด้านบน
            </li>
            <li>
              ถ้าคุณอยู่หน้าเข้าสู่ระบบ ให้กดลิงก์ด้านล่างฟอร์มเพื่อไปหน้าสมัคร
            </li>
          </OrderedList>
        </Section>

        <Section
          id='register-with-google'
          title='วิธีที่หนึ่ง (แนะนำ): ใช้ Google'
        >
          <OrderedList>
            <li>
              กดปุ่ม <strong>เข้าสู่ระบบด้วย Google</strong>
            </li>
            <li>
              เลือกบัญชี Google ที่ต้องการผูกกับ TinyToken แล้วอนุญาตการใช้งาน
            </li>
            <li>
              เมื่ออนุญาตสำเร็จ ระบบจะสร้างบัญชีและเข้าสู่ระบบให้โดยอัตโนมัติ
            </li>
          </OrderedList>

          <p>
            สมัครด้วย Google ไม่ต้องตั้งรหัสผ่านเพิ่ม หลังจากนี้ใช้บัญชี Google
            เดิมเพื่อเข้าใช้งานครั้งต่อไปได้เลย
          </p>
        </Section>

        <Section id='register-with-username' title='วิธีที่สอง: ใช้ชื่อผู้ใช้'>
          <OrderedList>
            <li>กรอกชื่อผู้ใช้ที่ต้องการใช้งาน</li>
            <li>ตั้งรหัสผ่านและกรอกรหัสผ่านซ้ำให้ตรงกัน</li>
            <li>
              กดปุ่ม <strong>สร้างบัญชี</strong> แล้วทำตามข้อความที่ระบบแจ้งบนหน้าเว็บ
            </li>
          </OrderedList>

          <div className='mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'>
            <p className='font-bold'>คำแนะนำ</p>
            <p className='mt-2 leading-8'>
              ควรใช้รหัสผ่านที่เดายาก และเก็บข้อมูลเข้าสู่ระบบไว้ให้ปลอดภัย
              เพื่อป้องกันไม่ให้ผู้อื่นเข้าถึงเครดิตและ API Key ในบัญชีของคุณ
            </p>
          </div>
        </Section>
      </>
    ),
    next: {
      href: '/docs/login',
      label: 'เข้าสู่ระบบ',
    },
  },
  login: {
    slug: 'login',
    groupTitle: 'Quick Start',
    title: 'เข้าสู่ระบบ',
    icon: LogIn,
    date: '2026/6/8',
    readTime: 'อ่านไม่เกิน 1 นาที',
    intro: 'หน้านี้แยกสำหรับการเข้าสู่ระบบเท่านั้น เพื่อไม่ให้สับสนกับหน้าสมัครบัญชี',
    heroLink: {
      label: 'ทางเข้าสู่ระบบ',
      href: loginUrl,
    },
    heroImage: '/docs-sign-in.png',
    toc: [
      { title: 'เปิดหน้าเข้าสู่ระบบ', href: '#open-login-page' },
      { title: 'วิธีที่หนึ่ง: ใช้ Google', href: '#login-with-google' },
      {
        title: 'วิธีที่สอง: ใช้ชื่อผู้ใช้และรหัสผ่าน',
        href: '#login-with-password',
      },
    ],
    render: () => (
      <>
        <Section id='open-login-page' title='เปิดหน้าเข้าสู่ระบบ'>
          <OrderedList>
            <li>กดปุ่มเข้าสู่ระบบจากหน้าแรก</li>
            <li>ถ้าอยู่หน้าสมัครบัญชี ให้กดลิงก์ “มีบัญชีอยู่แล้ว? เข้าสู่ระบบ”</li>
          </OrderedList>
        </Section>

        <Section id='login-with-google' title='วิธีที่หนึ่ง: ใช้ Google'>
          <OrderedList>
            <li>กดปุ่ม <strong>เข้าสู่ระบบด้วย Google</strong></li>
            <li>เลือกบัญชี Google ที่ผูกไว้กับ TinyToken</li>
            <li>อนุญาตสิทธิ์แล้วระบบจะพาเข้าสู่บัญชีทันที</li>
          </OrderedList>
        </Section>

        <Section
          id='login-with-password'
          title='วิธีที่สอง: ใช้ชื่อผู้ใช้และรหัสผ่าน'
        >
          <OrderedList>
            <li>กรอกชื่อผู้ใช้หรืออีเมลที่ลงทะเบียนไว้</li>
            <li>กรอกรหัสผ่านให้ถูกต้อง</li>
            <li>กดปุ่มเข้าสู่ระบบเพื่อยืนยัน</li>
          </OrderedList>

          <ValueBox>
            หากลืมรหัสผ่าน ให้ใช้ลิงก์กู้รหัสผ่านจากหน้าเข้าสู่ระบบ แล้วทำตามขั้นตอน
          </ValueBox>
        </Section>
      </>
    ),
    next: {
      href: '/docs/topup',
      label: 'เติมเครดิต',
    },
  },
  topup: {
    slug: 'topup',
    groupTitle: 'Quick Start',
    title: 'เติมเครดิต',
    icon: CreditCard,
    date: '2026/6/8',
    readTime: 'อ่านไม่เกิน 1 นาที',
    intro: 'หน้าสั้น ๆ สำหรับการเติมเครดิตและดูยอดคงเหลือ',
    heroLink: {
      label: 'เปิดวอลเล็ต',
      href: walletUrl,
    },
    toc: [{ title: 'ขั้นตอนเติมเครดิต', href: '#topup-steps' }],
    render: () => (
      <Section id='topup-steps' title='ขั้นตอนเติมเครดิต'>
        <OrderedList>
          <li>เปิดหน้า Wallet หรือหน้าความคืบหน้าการเติมเงิน</li>
          <li>เลือกจำนวนเงิน แล้วรอ QR หรือข้อมูลโอนเงินปรากฏ</li>
          <li>ชำระเงินให้ตรงกับยอดที่เลือก และรอระบบอัปเดตยอดคงเหลือ</li>
        </OrderedList>

        <ValueBox>
          ถ้าหน้าเติมเงินของคุณเปลี่ยนแปลงภายหลัง คุณสามารถเปลี่ยนตัวอย่างและรูปประกอบในหน้านี้ได้ทีละขั้น
        </ValueBox>
      </Section>
    ),
    next: {
      href: '/docs/api-key',
      label: 'สร้าง API Key',
    },
  },
  'api-key': {
    slug: 'api-key',
    groupTitle: 'Quick Start',
    title: 'สร้าง API Key',
    icon: KeyRound,
    date: '2026/6/8',
    readTime: 'อ่านไม่เกิน 1 นาที',
    intro: 'คีย์ของ TinyToken จะขึ้นต้นด้วย sk- แล้วค่อยนำไปวางในเครื่องมือที่ต้องการ',
    heroLink: {
      label: 'ไปหน้า API Keys',
      href: keysUrl,
    },
    toc: [
      { title: 'เปิดหน้า API Keys', href: '#open-api-keys' },
      { title: 'สร้างและคัดลอกคีย์', href: '#create-and-copy-key' },
      { title: 'นำคีย์ไปใช้กับเครื่องมือ', href: '#use-key-in-tool' },
    ],
    render: () => (
      <>
        <Section id='open-api-keys' title='เปิดหน้า API Keys'>
          <OrderedList>
            <li>เข้าเมนู Keys จากหน้าเว็บ TinyToken</li>
            <li>สร้างคีย์ใหม่สำหรับงานหรือเครื่องมือที่ต้องการใช้งาน</li>
          </OrderedList>
        </Section>

        <Section id='create-and-copy-key' title='สร้างและคัดลอกคีย์'>
          <OrderedList>
            <li>คีย์ที่ใช้งานได้จะเริ่มด้วย <InlineCode>sk-</InlineCode></li>
            <li>กดปุ่มคัดลอกคีย์ แล้วนำไปเก็บในตัวแปรของเครื่องมือที่ใช้</li>
          </OrderedList>

          <CopyValueBox
            values={[
              { label: 'หน้า API Keys', value: keysUrl },
              { label: 'ตัวอย่าง API Key', value: exampleApiKey },
            ]}
          />
        </Section>

        <Section id='use-key-in-tool' title='นำคีย์ไปใช้กับเครื่องมือ'>
          <OrderedList>
            <li>วางคีย์ในช่อง API Key หรือ Auth Field ของเครื่องมือ</li>
            <li>เลือกโมเดลที่ต้องการจากหน้า Pricing หรือหน้ารายการโมเดล</li>
            <li>ทดสอบ connection ก่อนใช้งานจริง</li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/check',
      label: 'ตรวจสอบสภาพแวดล้อม',
    },
  },
  check: {
    slug: 'check',
    groupTitle: 'Quick Start',
    title: 'ตรวจสอบสภาพแวดล้อม',
    icon: Wrench,
    date: '2026/6/8',
    readTime: 'อ่านไม่เกิน 1 นาที',
    intro: 'ใช้ตรวจว่า endpoint, key และ model ที่เลือกพร้อมใช้งานหรือยัง',
    toc: [{ title: 'สิ่งที่ต้องเช็กก่อนใช้งาน', href: '#preflight-checks' }],
    render: () => (
      <Section id='preflight-checks' title='สิ่งที่ต้องเช็กก่อนใช้งาน'>
        <OrderedList>
          <li>ยืนยันว่าใช้ endpoint ของ TinyToken ให้ถูกต้อง</li>
          <li>ตรวจดูว่า API Key ยังใช้งานได้และขึ้นต้นด้วย sk-</li>
          <li>ยืนยันชื่อโมเดลจากหน้า Pricing ก่อนทดสอบ</li>
        </OrderedList>

        <ValueBox>
          ถ้าคุณจะเขียนคู่มือหน้านี้ต่อ ให้แยกเป็น 1 การเช็กต่อ 1 บล็อก จะอ่านง่ายเหมือนหน้า Register ของ PackyAPI
        </ValueBox>
      </Section>
    ),
    next: {
      href: '/docs/model-compatibility',
      label: 'โมเดลเข้ากันได้',
    },
  },
  'model-compatibility': {
    slug: 'model-compatibility',
    groupTitle: 'Quick Start',
    title: 'คำนำ: โมเดลเข้ากันได้',
    icon: TerminalSquare,
    date: '2026/6/12',
    readTime: 'อ่านประมาณ 3 นาที',
    intro:
      'อ่านหน้านี้ก่อนนำ API Key ไปใช้กับโปรแกรมอื่น เพื่อเลือก endpoint และ header ให้ตรงกับเครื่องมือที่ใช้',
    toc: [
      { title: 'สรุปสั้น', href: '#compat-summary' },
      { title: 'API Address ของ TinyAPI', href: '#compat-api-address' },
      { title: 'ประเภท endpoint ที่รองรับ', href: '#compat-endpoints' },
      { title: 'การยืนยันตัวตน', href: '#compat-auth' },
      { title: 'ควรเลือกแบบไหน', href: '#compat-choose' },
      { title: 'เอกสารอ้างอิง', href: '#compat-references' },
    ],
    render: () => (
      <>
        <Section id='compat-summary' title='สรุปสั้น'>
          <p>
            TinyAPI ออกแบบให้ใช้งานแบบ <strong>OpenAI-compatible</strong> เป็นทางหลัก
            ดังนั้นโปรแกรมส่วนใหญ่ที่มีช่อง OpenAI Base URL / OpenAI API Key สามารถใส่
            endpoint ของ TinyAPI และใช้ API Key ที่ขึ้นต้นด้วย <InlineCode>sk-</InlineCode>{' '}
            ได้ทันที
          </p>
          <ValueBox>
            ถ้าไม่แน่ใจ ให้เริ่มจาก OpenAI-compatible ก่อนเสมอ:
            <br />
            Base URL: <InlineCode>{apiUrl}/v1</InlineCode>
            <br />
            Chat URL: <InlineCode>{apiUrl}/v1/chat/completions</InlineCode>
          </ValueBox>
        </Section>

        <Section id='compat-api-address' title='API Address ของ TinyAPI'>
          <p>
            สำหรับโดเมนจริงของ TinyAPI ให้ใช้ <InlineCode>{apiUrl}</InlineCode> เป็น
            API Address หลัก ถ้าโปรแกรมถามหา Base URL ของ OpenAI SDK ให้ใส่{' '}
            <InlineCode>{apiUrl}/v1</InlineCode>
          </p>

          <CopyValueBox
            values={[
              { label: 'API Address', value: apiUrl },
              { label: 'OpenAI Base URL', value: `${apiUrl}/v1` },
              {
                label: 'Chat URL',
                value: `${apiUrl}/v1/chat/completions`,
              },
              { label: 'Claude Native URL', value: `${apiUrl}/v1/messages` },
              {
                label: 'Gemini Native URL',
                value: `${apiUrl}/v1beta/models/{model}:generateContent`,
              },
            ]}
          />

          <p>
            เวลาใช้ localhost เพื่อทดสอบบนเครื่อง ให้เปลี่ยนเฉพาะโดเมนหน้าแรก เช่น{' '}
            <InlineCode>http://127.0.0.1:3000</InlineCode> แล้วค่อยต่อ path เดิมตามประเภท
            endpoint
          </p>
        </Section>

        <Section id='compat-endpoints' title='ประเภท endpoint ที่รองรับ'>
          <DocsTable
            headers={['ประเภท', 'Path', 'ใช้เมื่อไร']}
            rows={[
              [
                'OpenAI-compatible Chat',
                '/v1/chat/completions',
                'แนะนำเป็นค่าเริ่มต้น ใช้กับ chat model ส่วนใหญ่ รวมถึงโมเดลที่ไม่ใช่ OpenAI เมื่อโปรแกรมรองรับ OpenAI format',
              ],
              [
                'OpenAI Responses',
                '/v1/responses',
                'ใช้เฉพาะโปรแกรมหรือโมเดลที่ระบุว่าต้องใช้ Responses API ถ้าไม่แน่ใจให้ใช้ Chat Completions ก่อน',
              ],
              [
                'Claude Native Messages',
                '/v1/messages',
                'ใช้กับเครื่องมือที่ต้องการ Claude/Anthropic native format เท่านั้น เช่นบางโหมดของ Claude Code หรือ Claude Desktop',
              ],
              [
                'Gemini Native',
                '/v1beta/models/{model}:generateContent',
                'ใช้กับเครื่องมือที่ต้องการ Gemini native format เท่านั้น และพารามิเตอร์ควรใช้รูปแบบ camelCase เช่น imageSize',
              ],
            ]}
          />
        </Section>

        <Section id='compat-auth' title='การยืนยันตัวตน'>
          <p>
            API Key ของ TinyAPI ขึ้นต้นด้วย <InlineCode>sk-</InlineCode> แต่ชื่อ header
            ที่ต้องใส่จะแตกต่างกันตาม format ที่โปรแกรมเลือกใช้
          </p>

          <DocsTable
            headers={['รูปแบบ', 'Header ที่ใช้', 'ตัวอย่าง']}
            rows={[
              [
                'OpenAI-compatible',
                'Authorization',
                'Authorization: Bearer sk-xxxxxxxx',
              ],
              [
                'Claude native',
                'x-api-key และ anthropic-version',
                'x-api-key: sk-xxxxxxxx / anthropic-version: 2023-06-01',
              ],
              [
                'Gemini native',
                'x-goog-api-key',
                'x-goog-api-key: sk-xxxxxxxx',
              ],
            ]}
          />

          <ValueBox>
            <InlineCode>anthropic-version: 2023-06-01</InlineCode> คือเวอร์ชันของ Claude
            Messages API ไม่ใช่ปีของโมเดล จึงไม่ต้องเปลี่ยนเป็นปีใหม่เอง ถ้าโปรแกรมไม่ได้สั่งให้เปลี่ยน
          </ValueBox>
        </Section>

        <Section id='compat-choose' title='ควรเลือกแบบไหน'>
          <OrderedList>
            <li>
              ถ้าโปรแกรมมีตัวเลือก OpenAI / OpenAI-compatible ให้ใช้{' '}
              <InlineCode>{apiUrl}/v1</InlineCode> และ header{' '}
              <InlineCode>Authorization: Bearer sk-...</InlineCode>
            </li>
            <li>
              ถ้าโปรแกรมบังคับ Claude native ให้ใช้ <InlineCode>{apiUrl}/v1/messages</InlineCode>{' '}
              พร้อม <InlineCode>x-api-key</InlineCode> และ{' '}
              <InlineCode>anthropic-version</InlineCode>
            </li>
            <li>
              ถ้าโปรแกรมบังคับ Gemini native ให้ใช้{' '}
              <InlineCode>{apiUrl}/v1beta/models/ชื่อโมเดล:generateContent</InlineCode>{' '}
              พร้อม <InlineCode>x-goog-api-key</InlineCode>
            </li>
            <li>
              อย่าสลับ API Key กับ endpoint ของเว็บอื่น เพราะจะทำให้ทดสอบไม่ผ่านและหาสาเหตุยาก
            </li>
          </OrderedList>
        </Section>

        <Section id='compat-references' title='เอกสารอ้างอิง'>
          <OrderedList>
            <li>
              <a
                href='https://developers.openai.com/api/reference/chat-completions/overview/'
                className='font-semibold text-blue-700 hover:underline'
                target='_blank'
                rel='noreferrer'
              >
                OpenAI Chat Completions API
              </a>
            </li>
            <li>
              <a
                href='https://developers.openai.com/api/docs/guides/migrate-to-responses'
                className='font-semibold text-blue-700 hover:underline'
                target='_blank'
                rel='noreferrer'
              >
                OpenAI Responses API
              </a>
            </li>
            <li>
              <a
                href='https://docs.anthropic.com/en/api/messages'
                className='font-semibold text-blue-700 hover:underline'
                target='_blank'
                rel='noreferrer'
              >
                Anthropic Messages API
              </a>
            </li>
            <li>
              <a
                href='https://ai.google.dev/gemini-api/docs/openai'
                className='font-semibold text-blue-700 hover:underline'
                target='_blank'
                rel='noreferrer'
              >
                Gemini OpenAI Compatibility
              </a>
            </li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/token-usage',
      label: 'ข้อมูลเครดิตคงเหลือ',
    },
  },
  'token-usage': {
    slug: 'token-usage',
    groupTitle: 'Quick Start',
    title: 'ข้อมูล API Key และเครดิตคงเหลือ',
    icon: CircleDollarSign,
    date: '2026/6/13',
    readTime: 'อ่านประมาณ 3 นาที',
    intro:
      'ตรวจสอบชื่อ API Key, เครดิตทั้งหมด, เครดิตที่ใช้ไป, เครดิตคงเหลือ, วันหมดอายุ และสิทธิ์โมเดลของคีย์ที่ใช้เรียก',
    toc: [
      { title: 'Endpoint', href: '#token-usage-endpoint' },
      { title: 'ตัวอย่างคำสั่ง', href: '#token-usage-curl' },
      { title: 'ข้อมูลที่ได้รับ', href: '#token-usage-fields' },
      { title: 'ข้อควรรู้', href: '#token-usage-notes' },
    ],
    render: () => (
      <>
        <Section id='token-usage-endpoint' title='Endpoint'>
          <p>
            TinyAPI ใช้ endpoint ด้านล่างสำหรับตรวจข้อมูลและเครดิตของ API Key โดยตรง
            คำขอนี้ใช้ API Key ที่ขึ้นต้นด้วย <InlineCode>sk-</InlineCode>
          </p>

          <CopyValueBox
            values={[
              {
                label: 'Method',
                value: 'GET',
              },
              {
                label: 'Endpoint',
                value: `${apiUrl}/api/usage/token`,
              },
              {
                label: 'Authorization',
                value: 'Authorization: Bearer sk-YOUR_API_KEY',
              },
            ]}
          />

          <ValueBox>
            Endpoint นี้เป็นของ TinyAPI โดยเฉพาะ จึงใช้ path{' '}
            <InlineCode>/api/usage/token</InlineCode> ไม่ใช่{' '}
            <InlineCode>/v1/me</InlineCode> หรือ <InlineCode>/v1/usage</InlineCode>
          </ValueBox>
        </Section>

        <Section id='token-usage-curl' title='ตัวอย่างคำสั่ง'>
          <p>
            เปิด Command Prompt, PowerShell หรือ Terminal แล้วแทนที่{' '}
            <InlineCode>sk-YOUR_API_KEY</InlineCode> ด้วยคีย์ของคุณ
          </p>

          <CodeBlock label='cURL' value={tokenUsageCurl} />
          <CodeBlock label='Example response' value={tokenUsageResponse} />
        </Section>

        <Section id='token-usage-fields' title='ข้อมูลที่ได้รับ'>
          <DocsTable
            headers={['FIELD', 'TYPE', 'DESCRIPTION']}
            rows={[
              ['name', 'string', 'ชื่อ API Key ที่กำหนดไว้ตอนสร้างคีย์'],
              [
                'total_granted',
                'number',
                'เครดิตหรือโควตารวมของ API Key ก่อนหักการใช้งาน',
              ],
              ['total_used', 'number', 'เครดิตหรือโควตาที่ API Key ใช้ไปแล้ว'],
              ['total_available', 'number', 'เครดิตหรือโควตาคงเหลือของ API Key'],
              [
                'unlimited_quota',
                'boolean',
                'true หมายถึง API Key ไม่ได้จำกัดโควตาแยกจากบัญชี',
              ],
              [
                'model_limits_enabled',
                'boolean',
                'แสดงว่า API Key เปิดการจำกัดรายชื่อโมเดลหรือไม่',
              ],
              [
                'model_limits',
                'object',
                'รายชื่อโมเดลที่คีย์ได้รับอนุญาต เมื่อเปิดการจำกัดโมเดล',
              ],
              [
                'expires_at',
                'number',
                'เวลา Unix ที่ API Key หมดอายุ ค่า 0 หมายถึงไม่มีวันหมดอายุ',
              ],
            ]}
          />
        </Section>

        <Section id='token-usage-notes' title='ข้อควรรู้'>
          <OrderedList>
            <li>
              ค่าเครดิตจาก endpoint นี้เป็นหน่วยโควตาภายในของ TinyAPI
              การแสดงเป็นเงินหรือเครดิตบนหน้าเว็บขึ้นกับการตั้งค่าของระบบ
            </li>
            <li>
              Endpoint นี้แสดงข้อมูลของ API Key แต่ไม่ส่งอีเมลหรือข้อมูลส่วนตัวของเจ้าของบัญชี
            </li>
            <li>
              ถ้าต้องการดูยอดในรูปแบบหน้าเว็บ ให้เปิดหน้า{' '}
              <a
                href={walletUrl}
                className='font-semibold text-blue-700 hover:underline'
                target='_blank'
                rel='noreferrer'
              >
                กระเป๋าเงิน
              </a>
            </li>
            <li>แม้คีย์หมดเครดิตหรือหมดอายุ endpoint แบบอ่านอย่างเดียวนี้ยังใช้ตรวจข้อมูลคีย์ได้</li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/model-list',
      label: 'รายการโมเดล',
    },
  },
  'model-list': {
    slug: 'model-list',
    groupTitle: 'Quick Start',
    title: 'รายการโมเดล',
    icon: List,
    date: '2026/6/13',
    readTime: 'อ่านประมาณ 3 นาที',
    intro:
      'ดึงรายชื่อโมเดลที่ API Key ของคุณสามารถใช้งานได้จริง พร้อมประเภท endpoint ที่รองรับในแต่ละโมเดล',
    toc: [
      { title: 'Endpoint', href: '#model-list-endpoint' },
      { title: 'ตัวอย่างคำสั่ง', href: '#model-list-curl' },
      { title: 'อ่านผลลัพธ์', href: '#model-list-response' },
      { title: 'ประเภท endpoint', href: '#model-list-endpoint-types' },
    ],
    render: () => (
      <>
        <Section id='model-list-endpoint' title='Endpoint'>
          <p>
            ใช้ endpoint นี้เพื่อดึงรายการโมเดลตามกลุ่ม สิทธิ์ และข้อจำกัดของ API Key
            ที่ส่งมากับคำขอ
          </p>

          <CopyValueBox
            values={[
              { label: 'Method', value: 'GET' },
              { label: 'Endpoint', value: `${apiUrl}/v1/models` },
              {
                label: 'Authorization',
                value: 'Authorization: Bearer sk-YOUR_API_KEY',
              },
            ]}
          />
        </Section>

        <Section id='model-list-curl' title='ตัวอย่างคำสั่ง'>
          <CodeBlock label='cURL' value={modelListCurl} />
          <CodeBlock label='Example response' value={modelListResponse} />
        </Section>

        <Section id='model-list-response' title='อ่านผลลัพธ์'>
          <DocsTable
            headers={['FIELD', 'DESCRIPTION']}
            rows={[
              ['id', 'ชื่อ Model ID ที่ต้องนำไปใส่ใน field model ตอนเรียก API'],
              ['object', 'ประเภทข้อมูล โดยรายการโมเดลจะเป็น model'],
              ['owned_by', 'แหล่งที่มาหรือประเภทเจ้าของข้อมูลโมเดลในระบบ'],
              [
                'supported_endpoint_types',
                'รายการ protocol หรือ endpoint ที่โมเดลนี้รองรับ',
              ],
            ]}
          />

          <ValueBox>
            ให้คัดลอกค่า <InlineCode>id</InlineCode> ไปวางใน field{' '}
            <InlineCode>model</InlineCode> แบบตรงทุกตัวอักษร อย่าใช้ชื่อที่คาดเดาเอง
          </ValueBox>
        </Section>

        <Section id='model-list-endpoint-types' title='ประเภท endpoint'>
          <DocsTable
            headers={['VALUE', 'ENDPOINT ที่เกี่ยวข้อง']}
            rows={[
              ['openai', '/v1/chat/completions'],
              ['openai-response', '/v1/responses'],
              ['openai-response-compact', '/v1/responses/compact'],
              ['anthropic', '/v1/messages'],
              ['image-generation', '/v1/images/generations'],
              ['embeddings', '/v1/embeddings'],
            ]}
          />

          <p>
            โมเดลหนึ่งตัวอาจรองรับมากกว่าหนึ่งประเภท หากไม่เห็นประเภทที่ต้องการ
            ให้เลือกโมเดลอื่นหรือดูรายละเอียดจากหน้า All AI Model
          </p>
        </Section>
      </>
    ),
    next: {
      href: '/docs/anthropic-chat',
      label: 'Anthropic-compatible chat',
    },
  },
  'anthropic-chat': {
    slug: 'anthropic-chat',
    groupTitle: 'Quick Start',
    title: 'Anthropic-compatible chat (Claude)',
    icon: MessagesSquare,
    date: '2026/6/13',
    readTime: 'อ่านประมาณ 5 นาที',
    intro:
      'เรียกใช้งานโมเดล Claude ผ่านรูปแบบ Anthropic Messages API ด้วย endpoint ของ TinyAPI',
    toc: [
      { title: 'Endpoint และ Header', href: '#claude-endpoint' },
      { title: 'Parameters หลัก', href: '#claude-parameters' },
      { title: 'Non-streaming', href: '#claude-non-stream' },
      { title: 'Streaming', href: '#claude-stream' },
      { title: 'ข้อควรรู้', href: '#claude-notes' },
    ],
    render: () => (
      <>
        <Section id='claude-endpoint' title='Endpoint และ Header'>
          <CopyValueBox
            values={[
              { label: 'Method', value: 'POST' },
              { label: 'Endpoint', value: `${apiUrl}/v1/messages` },
              {
                label: 'Authorization',
                value: 'Authorization: Bearer sk-YOUR_API_KEY',
              },
              {
                label: 'Anthropic version',
                value: 'anthropic-version: 2023-06-01',
              },
              { label: 'Content-Type', value: 'application/json' },
            ]}
          />

          <ValueBox>
            <InlineCode>anthropic-version: 2023-06-01</InlineCode> คือเวอร์ชัน protocol
            ของ Anthropic Messages API ไม่ใช่ปีของโมเดล และไม่ควรเปลี่ยนเอง
          </ValueBox>
        </Section>

        <Section id='claude-parameters' title='Parameters หลัก'>
          <DocsTable
            headers={['PARAMETER', 'REQUIRED', 'DESCRIPTION']}
            rows={[
              ['model', 'ใช่', 'Model ID ที่รองรับ anthropic จาก /v1/models'],
              ['messages', 'ใช่', 'รายการข้อความสนทนา role และ content'],
              ['max_tokens', 'แนะนำ', 'จำนวน output token สูงสุดที่อนุญาตให้โมเดลตอบ'],
              ['system', 'ไม่', 'คำสั่งหลักหรือบทบาทของโมเดล'],
              ['stream', 'ไม่', 'true เพื่อรับผลลัพธ์แบบ SSE ทีละส่วน'],
              ['temperature', 'ไม่', 'ควบคุมระดับความสุ่มของคำตอบ'],
              ['tools', 'ไม่', 'รายการเครื่องมือสำหรับ tool use หากโมเดลและ upstream รองรับ'],
              ['thinking', 'ไม่', 'การตั้งค่า reasoning สำหรับโมเดลที่รองรับ'],
            ]}
          />
        </Section>

        <Section id='claude-non-stream' title='Non-streaming'>
          <p>
            เปลี่ยน <InlineCode>ชื่อโมเดล-Claude</InlineCode> เป็น Model ID จริงจากหน้า
            รายการโมเดล
          </p>
          <CodeBlock label='cURL' value={claudeCurl} />
          <CodeBlock label='Example response' value={claudeResponse} />
        </Section>

        <Section id='claude-stream' title='Streaming'>
          <p>
            เมื่อกำหนด <InlineCode>stream: true</InlineCode> ระบบจะส่งข้อมูลแบบ SSE
            ต่อเนื่อง เหมาะกับแชตหรือ Claude Code ที่ต้องแสดงข้อความระหว่างสร้างคำตอบ
          </p>
          <CodeBlock label='cURL streaming' value={claudeStreamCurl} />
        </Section>

        <Section id='claude-notes' title='ข้อควรรู้'>
          <OrderedList>
            <li>
              เลือกโมเดลที่มี <InlineCode>anthropic</InlineCode> ใน{' '}
              <InlineCode>supported_endpoint_types</InlineCode>
            </li>
            <li>
              สามารถใช้ <InlineCode>x-api-key: sk-...</InlineCode> แทน Authorization
              กับ endpoint นี้ได้ แต่ตัวอย่างของ TinyAPI ใช้ Authorization เพื่อให้จำง่าย
            </li>
            <li>
              ความสามารถ tools, thinking, cache และ parameter ขั้นสูงขึ้นกับโมเดลและ upstream
              ที่ให้บริการโมเดลนั้น
            </li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/openai-chat',
      label: 'OpenAI-compatible chat',
    },
  },
  'openai-chat': {
    slug: 'openai-chat',
    groupTitle: 'Quick Start',
    title: 'OpenAI-compatible chat (GPT)',
    icon: Bot,
    date: '2026/6/13',
    readTime: 'อ่านประมาณ 5 นาที',
    intro:
      'เรียกโมเดลแชตผ่าน OpenAI Chat Completions format ซึ่งเป็นรูปแบบที่เครื่องมือส่วนใหญ่รองรับ',
    toc: [
      { title: 'Endpoint และ Header', href: '#openai-chat-endpoint' },
      { title: 'Parameters หลัก', href: '#openai-chat-parameters' },
      { title: 'Non-streaming', href: '#openai-chat-non-stream' },
      { title: 'Streaming', href: '#openai-chat-stream' },
      { title: 'ข้อควรรู้', href: '#openai-chat-notes' },
    ],
    render: () => (
      <>
        <Section id='openai-chat-endpoint' title='Endpoint และ Header'>
          <CopyValueBox
            values={[
              { label: 'Method', value: 'POST' },
              { label: 'Endpoint', value: `${apiUrl}/v1/chat/completions` },
              {
                label: 'Authorization',
                value: 'Authorization: Bearer sk-YOUR_API_KEY',
              },
              { label: 'Content-Type', value: 'application/json' },
            ]}
          />
        </Section>

        <Section id='openai-chat-parameters' title='Parameters หลัก'>
          <DocsTable
            headers={['PARAMETER', 'REQUIRED', 'DESCRIPTION']}
            rows={[
              ['model', 'ใช่', 'Model ID ที่รองรับ openai จาก /v1/models'],
              ['messages', 'ใช่', 'ประวัติสนทนา เช่น system, user และ assistant'],
              ['stream', 'ไม่', 'true เพื่อรับคำตอบแบบ SSE ทีละส่วน'],
              ['max_tokens', 'ไม่', 'จำนวน output token สูงสุด'],
              ['temperature', 'ไม่', 'ควบคุมความสุ่มของคำตอบ'],
              ['top_p', 'ไม่', 'ควบคุมการสุ่มแบบ nucleus sampling'],
              ['response_format', 'ไม่', 'กำหนดรูปแบบคำตอบ เช่น JSON เมื่อโมเดลรองรับ'],
              ['tools', 'ไม่', 'รายการ function หรือ tools ที่โมเดลสามารถเลือกเรียก'],
              ['tool_choice', 'ไม่', 'กำหนดว่าจะให้โมเดลเลือก tool แบบใด'],
              ['reasoning_effort', 'ไม่', 'ระดับ reasoning สำหรับโมเดลที่รองรับ'],
            ]}
          />
        </Section>

        <Section id='openai-chat-non-stream' title='Non-streaming'>
          <CodeBlock label='cURL' value={chatCompletionsCurl} />
          <CodeBlock label='Example response' value={chatCompletionsResponse} />
        </Section>

        <Section id='openai-chat-stream' title='Streaming'>
          <p>
            เมื่อใช้ <InlineCode>stream: true</InlineCode> ระบบจะส่ง{' '}
            <InlineCode>chat.completion.chunk</InlineCode> หลายชุดและปิดท้าย stream
            ตามรูปแบบที่ upstream รองรับ
          </p>
          <CodeBlock label='cURL streaming' value={chatCompletionsStreamCurl} />
        </Section>

        <Section id='openai-chat-notes' title='ข้อควรรู้'>
          <OrderedList>
            <li>
              Endpoint นี้ใช้ได้กับทุกโมเดลที่ประกาศ{' '}
              <InlineCode>openai</InlineCode> ไม่จำเป็นต้องเป็นโมเดลจาก OpenAI เท่านั้น
            </li>
            <li>
              Parameter ขั้นสูงอาจไม่รองรับทุกโมเดล ให้ดู Supported parameters
              ในหน้า All AI Model ก่อนใช้งาน
            </li>
            <li>
              สำหรับ SDK ให้ตั้ง Base URL เป็น <InlineCode>{apiUrl}/v1</InlineCode>
            </li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/responses-api',
      label: 'OpenAI Responses API',
    },
  },
  'responses-api': {
    slug: 'responses-api',
    groupTitle: 'Quick Start',
    title: 'OpenAI Responses API',
    icon: TerminalSquare,
    date: '2026/6/13',
    readTime: 'อ่านประมาณ 5 นาที',
    intro:
      'ใช้งาน Responses API สำหรับ structured input, reasoning, tools และโปรแกรมอย่าง Codex ที่เลือก wire API แบบ responses',
    toc: [
      { title: 'Endpoint และ Header', href: '#responses-endpoint' },
      { title: 'Parameters หลัก', href: '#responses-parameters' },
      { title: 'คำขอทั่วไป', href: '#responses-basic' },
      { title: 'Streaming', href: '#responses-stream' },
      { title: 'ข้อควรรู้', href: '#responses-notes' },
    ],
    render: () => (
      <>
        <Section id='responses-endpoint' title='Endpoint และ Header'>
          <CopyValueBox
            values={[
              { label: 'Method', value: 'POST' },
              { label: 'Endpoint', value: `${apiUrl}/v1/responses` },
              {
                label: 'Authorization',
                value: 'Authorization: Bearer sk-YOUR_API_KEY',
              },
              { label: 'Content-Type', value: 'application/json' },
            ]}
          />
        </Section>

        <Section id='responses-parameters' title='Parameters หลัก'>
          <DocsTable
            headers={['PARAMETER', 'REQUIRED', 'DESCRIPTION']}
            rows={[
              ['model', 'ใช่', 'Model ID ที่รองรับ openai-response'],
              ['input', 'ใช่', 'ข้อความหรือ array ของ input message/content'],
              ['instructions', 'ไม่', 'คำสั่งหลักที่ใช้กำหนดแนวทางการตอบ'],
              ['stream', 'ไม่', 'true เพื่อรับ Responses events แบบ SSE'],
              ['store', 'ไม่', 'กำหนดว่าฝั่ง upstream สามารถจัดเก็บ response หรือไม่'],
              ['reasoning', 'ไม่', 'ตั้งค่า reasoning เช่น effort และ summary'],
              ['tools', 'ไม่', 'รายการ tools สำหรับโมเดลที่รองรับ'],
              ['tool_choice', 'ไม่', 'กำหนดการเลือก tool'],
              ['max_output_tokens', 'ไม่', 'จำนวน output token สูงสุด'],
              ['previous_response_id', 'ไม่', 'เชื่อมคำขอกับ response ก่อนหน้าเมื่อรองรับ'],
            ]}
          />
        </Section>

        <Section id='responses-basic' title='คำขอทั่วไป'>
          <p>
            ตัวอย่างนี้ใช้ input แบบข้อความสั้น หาก upstream ของโมเดลกำหนดรูปแบบเฉพาะ
            ให้เปลี่ยนเป็น structured input แบบตัวอย่างในส่วน Streaming
          </p>
          <CodeBlock label='cURL' value={responsesCurl} />
        </Section>

        <Section id='responses-stream' title='Streaming'>
          <p>
            รูปแบบ structured input เหมาะกับ Codex และโมเดล reasoning
            ข้อมูลจะถูกส่งเป็น event เช่น output item, text delta และ response completed
          </p>
          <CodeBlock label='cURL streaming' value={responsesStreamCurl} />
        </Section>

        <Section id='responses-notes' title='ข้อควรรู้'>
          <OrderedList>
            <li>
              เลือกโมเดลที่มี <InlineCode>openai-response</InlineCode> ในรายการ endpoint
              ที่รองรับ
            </li>
            <li>
              บาง upstream รองรับเฉพาะ streaming หรือกำหนด input เป็น structured array
              หากคำขอแบบสั้นไม่ผ่าน ให้ใช้ตัวอย่าง Streaming
            </li>
            <li>
              TinyAPI มี <InlineCode>/v1/responses/compact</InlineCode>{' '}
              สำหรับ client ที่ต้องการ Responses compaction และต้องใช้โมเดลที่รองรับ
            </li>
            <li>
              หากใช้ Codex ให้กำหนด Base URL ตามคู่มือ Codex/CC-Switch
              เพราะโปรแกรมอาจเติม path ให้เอง
            </li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/image-generation',
      label: 'Image Generation',
    },
  },
  'image-generation': {
    slug: 'image-generation',
    groupTitle: 'Quick Start',
    title: 'Image Generation',
    icon: Image,
    date: '2026/6/13',
    readTime: 'อ่านประมาณ 5 นาที',
    intro:
      'สร้างรูปภาพผ่าน OpenAI Images API-compatible endpoint โดยเลือกโมเดลสร้างภาพที่เปิดใช้งานใน TinyAPI',
    toc: [
      { title: 'Endpoint และ Header', href: '#image-endpoint' },
      { title: 'Parameters หลัก', href: '#image-parameters' },
      { title: 'ตัวอย่างสร้างภาพ', href: '#image-curl' },
      { title: 'รูปแบบผลลัพธ์', href: '#image-response' },
      { title: 'ข้อควรรู้', href: '#image-notes' },
    ],
    render: () => (
      <>
        <Section id='image-endpoint' title='Endpoint และ Header'>
          <CopyValueBox
            values={[
              { label: 'Method', value: 'POST' },
              {
                label: 'Endpoint',
                value: `${apiUrl}/v1/images/generations`,
              },
              {
                label: 'Authorization',
                value: 'Authorization: Bearer sk-YOUR_API_KEY',
              },
              { label: 'Content-Type', value: 'application/json' },
            ]}
          />
        </Section>

        <Section id='image-parameters' title='Parameters หลัก'>
          <DocsTable
            headers={['PARAMETER', 'REQUIRED', 'DESCRIPTION']}
            rows={[
              ['model', 'ใช่', 'Model ID ที่รองรับ image-generation'],
              ['prompt', 'ใช่', 'รายละเอียดรูปภาพที่ต้องการสร้าง'],
              ['n', 'ไม่', 'จำนวนรูปที่ต้องการ ค่าที่รองรับขึ้นกับโมเดลและ upstream'],
              ['size', 'ไม่', 'ขนาดรูป เช่น 1024x1024 เมื่อโมเดลรองรับ'],
              ['quality', 'ไม่', 'คุณภาพรูป เช่น standard หรือ hd เมื่อรองรับ'],
              ['response_format', 'ไม่', 'url หรือ b64_json ตามความสามารถของ provider'],
              ['style', 'ไม่', 'รูปแบบภาพสำหรับโมเดลที่รองรับ parameter นี้'],
              ['user', 'ไม่', 'รหัสผู้ใช้ปลายทางสำหรับระบบของ client'],
            ]}
          />
        </Section>

        <Section id='image-curl' title='ตัวอย่างสร้างภาพ'>
          <p>
            เปลี่ยน <InlineCode>ชื่อโมเดลสร้างภาพ</InlineCode> เป็น Model ID ที่มี{' '}
            <InlineCode>image-generation</InlineCode> ในรายการ endpoint ที่รองรับ
          </p>
          <CodeBlock label='cURL' value={imageGenerationCurl} />
        </Section>

        <Section id='image-response' title='รูปแบบผลลัพธ์'>
          <p>
            เมื่อใช้ <InlineCode>response_format: url</InlineCode>{' '}
            ผู้ให้บริการที่รองรับจะคืน URL ของรูปภาพ
          </p>
          <CodeBlock label='Example response' value={imageGenerationResponse} />
          <p>
            ถ้าเลือก <InlineCode>b64_json</InlineCode> และโมเดลรองรับ
            ผลลัพธ์จะอยู่ใน field <InlineCode>data[0].b64_json</InlineCode>{' '}
            ซึ่งต้องนำไป decode และบันทึกเป็นไฟล์รูปภาพ
          </p>
        </Section>

        <Section id='image-notes' title='ข้อควรรู้'>
          <OrderedList>
            <li>
              API Key ต้องมีสิทธิ์ใช้โมเดลสร้างภาพ หากเปิด Model limits ไว้
              ต้องเพิ่มโมเดลนั้นเข้าไปในคีย์ด้วย
            </li>
            <li>
              ขนาด จำนวนรูป คุณภาพ และ response format ที่รองรับแตกต่างกันตาม provider
              ให้ดูรายละเอียดของโมเดลก่อนใช้งาน
            </li>
            <li>
              การแก้ไขภาพใช้ endpoint <InlineCode>/v1/images/edits</InlineCode>{' '}
              ซึ่งเป็นคนละรูปแบบคำขอกับการสร้างภาพใหม่
            </li>
            <li>
              ถ้าได้ error <InlineCode>model_not_found</InlineCode>{' '}
              ให้ตรวจว่าเลือกโมเดลที่รองรับ image-generation และสะกดชื่อถูกต้อง
            </li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/request-errors',
      label: 'Error Response Rate Limit',
    },
  },
  'request-errors': {
    slug: 'request-errors',
    groupTitle: 'Quick Start',
    title: 'Error Response Rate Limit',
    icon: AlertTriangle,
    date: '2026/6/13',
    readTime: 'อ่านประมาณ 5 นาที',
    intro:
      'รวมรูปแบบ Error Response, HTTP status code, วิธีแก้ปัญหา และข้อจำกัดการเรียก API ที่ TinyAPI รองรับจริง',
    toc: [
      { title: 'รูปแบบ Error Response', href: '#error-response-format' },
      { title: 'HTTP Status Code ที่พบบ่อย', href: '#common-status-codes' },
      { title: 'ตัวอย่างข้อผิดพลาด', href: '#error-examples' },
      { title: 'Rate Limit และข้อจำกัด', href: '#rate-limits' },
      { title: 'วิธีจัดการ Error 429', href: '#handle-rate-limit' },
      { title: 'ข้อมูลสำหรับแจ้งผู้ดูแล', href: '#report-error' },
    ],
    render: () => (
      <>
        <Section id='error-response-format' title='รูปแบบ Error Response'>
          <p>
            เมื่อคำขอไม่สำเร็จ TinyAPI จะส่ง HTTP status code พร้อมรายละเอียดข้อผิดพลาดกลับมา
            รูปแบบคำตอบส่วนใหญ่เข้ากันได้กับ OpenAI API และอาจมี Request ID
            ต่อท้ายข้อความเพื่อใช้ตรวจสอบรายการเรียกใช้งาน
          </p>

          <CodeBlock label='OpenAI-compatible error' value={openAIErrorExample} />

          <p>
            ถ้าเรียกผ่าน Claude Messages API ที่ <InlineCode>/v1/messages</InlineCode>{' '}
            รูปแบบคำตอบจะเป็นแบบ Claude native
          </p>

          <CodeBlock label='Claude native error' value={claudeErrorExample} />
        </Section>

        <Section id='common-status-codes' title='HTTP Status Code ที่พบบ่อย'>
          <DocsTable
            headers={['STATUS', 'ERROR CODE / TYPE', 'สาเหตุและวิธีแก้']}
            rows={[
              [
                '400 Bad Request',
                'invalid_request',
                'JSON ไม่ถูกต้อง, ไม่ได้ส่ง model, parameter ไม่รองรับ หรือใช้รูปแบบคำขอไม่ตรงกับ endpoint ให้ตรวจ JSON ชื่อโมเดล และ path',
              ],
              [
                '401 Unauthorized',
                'new_api_error',
                'ไม่ได้ส่ง API Key หรือคีย์ไม่ถูกต้อง ถูกลบ หรือหมดอายุ ให้ใช้ Authorization: Bearer sk-...',
              ],
              [
                '403 Forbidden',
                'insufficient_user_quota',
                'เครดิตคงเหลือหรือโควตาของ API Key ไม่เพียงพอ ให้เติมเครดิตหรือตรวจสอบวงเงินของคีย์',
              ],
              [
                '403 Forbidden',
                'access_denied',
                'IP ปัจจุบันไม่อยู่ในรายการที่ API Key อนุญาต ให้แก้การจำกัด IP หรือเรียกจาก IP ที่อนุญาต',
              ],
              [
                '403 Forbidden',
                'new_api_error',
                'API Key ไม่มีสิทธิ์ใช้โมเดลหรือกลุ่มที่เลือก บัญชีหรือ channel อาจถูกปิดใช้งาน',
              ],
              [
                '404 Not Found',
                'invalid_request_error',
                'URL หรือ path ไม่ถูกต้อง ให้ตรวจ Base URL และ path เช่น /v1/chat/completions, /v1/responses หรือ /v1/messages',
              ],
              [
                '413 Content Too Large',
                'read_request_body_failed',
                'request body หรือไฟล์มีขนาดเกินค่าที่ระบบกำหนด ให้ลดขนาดข้อมูลแล้วลองใหม่',
              ],
              [
                '429 Too Many Requests',
                'new_api_error / rate limit',
                'ส่งคำขอถี่เกินไปหรือถึงข้อจำกัดของผู้ใช้ กลุ่ม IP หรือ upstream ให้รอแล้วลองใหม่และลด parallel requests',
              ],
              [
                '500 Internal Server Error',
                'new_api_error',
                'ระบบภายในตรวจสอบฐานข้อมูล rate limit หรือประมวลผลไม่สำเร็จ ให้ลองใหม่และเก็บ Request ID',
              ],
              [
                '501 Not Implemented',
                'api_not_implemented',
                'endpoint ที่เรียกยังไม่รองรับ ให้เปลี่ยนไปใช้ endpoint ที่มีในเอกสาร TinyAPI',
              ],
              [
                '503 Service Unavailable',
                'model_not_found',
                'ไม่พบ channel ที่พร้อมใช้สำหรับโมเดลและกลุ่มนี้ ให้ตรวจชื่อโมเดล ลองใหม่ภายหลัง หรือเลือกโมเดลอื่น',
              ],
            ]}
          />

          <ValueBox>
            TinyAPI ใช้ <InlineCode>403 Forbidden</InlineCode> พร้อม code{' '}
            <InlineCode>insufficient_user_quota</InlineCode> เมื่อเครดิตไม่พอ ไม่ใช่{' '}
            <InlineCode>402</InlineCode> แบบเว็บไซต์ตัวอย่างบางแห่ง
          </ValueBox>
        </Section>

        <Section id='error-examples' title='ตัวอย่างข้อผิดพลาด'>
          <p>
            ถ้า API Key ไม่ถูกต้อง ให้ตรวจว่าคีย์ขึ้นต้นด้วย <InlineCode>sk-</InlineCode>{' '}
            และส่ง header ตามตัวอย่างนี้
          </p>

          <CopyValueBox
            values={[
              {
                label: 'Authorization',
                value: 'Authorization: Bearer sk-xxxxxxxxxxxxxxxx',
              },
              { label: 'Content-Type', value: 'Content-Type: application/json' },
            ]}
          />

          <p>
            ถ้า error code เป็น <InlineCode>insufficient_user_quota</InlineCode>{' '}
            ให้ตรวจเครดิตคงเหลือที่หน้ากระเป๋าเงินและตรวจโควตาของ API Key
          </p>

          <p>
            ถ้า error code เป็น <InlineCode>model_not_found</InlineCode>{' '}
            ให้คัดลอกชื่อโมเดลจากหน้า All AI Model ให้ตรงทุกตัวอักษร
            และตรวจว่า API Key มีสิทธิ์ใช้โมเดลนั้น
          </p>
        </Section>

        <Section id='rate-limits' title='Rate Limit และข้อจำกัด'>
          <p>
            TinyAPI มีระบบจำกัดจำนวนคำขอจริง แต่ไม่ได้ใช้ limit แบบเดียวกับเว็บไซต์ในภาพตัวอย่าง
            ค่าบางส่วนปรับได้จาก environment และหน้า System Settings
            จึงอาจเปลี่ยนตามการตั้งค่าของผู้ดูแลระบบ
          </p>

          <DocsTable
            headers={['NAME', 'ค่าปัจจุบัน / ค่าเริ่มต้น', 'DESCRIPTION']}
            rows={[
              [
                'Global API rate limit',
                '180 requests / 180 วินาที / IP',
                'เปิดใช้งานเป็นค่าเริ่มต้นและนับตาม IP เมื่อเกินระบบตอบ 429 ผู้ดูแลสามารถเปลี่ยนค่าได้',
              ],
              [
                'User / group model rate limit',
                'ยังไม่เปิดใช้งาน',
                'ระบบรองรับการจำกัดจำนวนคำขอทั้งหมดและคำขอที่สำเร็จตามผู้ใช้หรือกลุ่ม เมื่อเปิดใช้จะตอบ 429 เมื่อเกินกำหนด',
              ],
              [
                'Concurrent streams ต่อ API Key',
                'ไม่มีค่าคงที่ในระบบ',
                'ไม่พบการกำหนด 30 streams ต่อ key แบบภาพตัวอย่าง จำนวนที่ใช้งานได้จริงขึ้นกับ upstream และทรัพยากรของ server',
              ],
              [
                'Request body',
                'กำหนดด้วย MAX_REQUEST_BODY_MB',
                'เมื่อ request body หลัง decompression ใหญ่เกินค่าที่ตั้งไว้ ระบบตอบ 413 Content Too Large',
              ],
              [
                'Streaming timeout',
                '300 วินาที',
                'ระยะเวลารอข้อมูล streaming เริ่มต้น ผู้ดูแลสามารถเปลี่ยนด้วย STREAMING_TIMEOUT',
              ],
              [
                'API Key quota',
                'กำหนดแยกต่อคีย์ได้',
                'ถ้าคีย์หรือบัญชีมีเครดิตไม่พอ ระบบตอบ 403 พร้อม code insufficient_user_quota',
              ],
              [
                'IP restriction',
                'ไม่บังคับ หากไม่ได้ตั้งค่า',
                'ถ้ากำหนด IP ให้ API Key คำขอจาก IP อื่นจะตอบ 403 access_denied',
              ],
            ]}
          />

          <ValueBox>
            TinyAPI ไม่มี endpoint <InlineCode>/v1/me</InlineCode> หรือ{' '}
            <InlineCode>/v1/usage</InlineCode> แบบในภาพตัวอย่าง และไม่ควรนำตัวเลข Rate Limit
            ของเว็บไซต์อื่นมาใช้กับ TinyAPI
          </ValueBox>
        </Section>

        <Section id='handle-rate-limit' title='วิธีจัดการ Error 429'>
          <OrderedList>
            <li>หยุดส่งคำขอชั่วคราวและรอก่อนลองใหม่</li>
            <li>
              ใช้ exponential backoff เช่น <InlineCode>1, 2, 4, 8</InlineCode> วินาที
            </li>
            <li>ลดจำนวน parallel หรือ concurrent requests</li>
            <li>หลีกเลี่ยงการ retry ทันทีแบบวนซ้ำ เพราะจะทำให้ถูกจำกัดนานขึ้น</li>
          </OrderedList>

          <CodeBlock label='JavaScript retry example' value={rateLimitRetryExample} />
        </Section>

        <Section id='report-error' title='ข้อมูลสำหรับแจ้งผู้ดูแล'>
          <p>ถ้ายังแก้ไม่ได้ ให้ส่งข้อมูลต่อไปนี้เพื่อให้ตรวจสอบได้เร็วขึ้น</p>
          <OrderedList>
            <li>วันและเวลาที่เกิดปัญหา</li>
            <li>Endpoint ที่เรียก โดยไม่ส่ง API Key</li>
            <li>ชื่อโมเดลและ HTTP status code</li>
            <li>
              ค่า <InlineCode>error.message</InlineCode>, <InlineCode>error.code</InlineCode>{' '}
              และ Request ID
            </li>
          </OrderedList>

          <ValueBox>
            ห้ามส่ง API Key แบบเต็มให้บุคคลอื่น หากจำเป็นให้แสดงเฉพาะต้นและท้าย เช่น{' '}
            <InlineCode>sk-abcd...wxyz</InlineCode>
          </ValueBox>
        </Section>
      </>
    ),
    next: {
      href: '/docs/openclaw',
      label: 'OpenClaw ตั้งค่า',
    },
  },
  openclaw: {
    slug: 'openclaw',
    groupTitle: 'CC-Switch ใช้งาน',
    title: 'OpenClaw ตั้งค่า',
    icon: OpenClawIcon,
    date: '2026/6/12',
    readTime: 'อ่านประมาณ 6 นาที',
    intro:
      'คู่มือภาษาไทยสำหรับติดตั้ง OpenClaw และเชื่อมต่อกับ TinyToken ผ่าน API Endpoint ของ TinyAPI',
    toc: [
      { title: 'OpenClaw คืออะไร', href: '#openclaw-about' },
      { title: 'ติดตั้ง OpenClaw', href: '#openclaw-install' },
      { title: 'เริ่มตั้งค่า OpenClaw', href: '#openclaw-onboard' },
      { title: 'ตั้งค่าระหว่าง onboarding', href: '#openclaw-quickstart' },
      { title: 'เชื่อมต่อ TinyToken API', href: '#openclaw-api' },
      { title: 'ตัวอย่าง config', href: '#openclaw-config' },
      { title: 'รีสตาร์ท gateway', href: '#openclaw-restart' },
    ],
    render: () => (
      <>
        <Section id='openclaw-about' title='OpenClaw คืออะไร'>
          <p>
            OpenClaw เป็นเครื่องมือ AI assistant / agent gateway ที่สามารถรันบนเครื่องของผู้ใช้
            และเชื่อมต่อกับช่องทางแชตหรือเครื่องมือหลายแบบได้ เช่น Telegram, Discord,
            WhatsApp, iMessage และช่องทางอื่น ๆ
          </p>
          <p>
            คู่มือนี้จะอธิบายวิธีติดตั้ง OpenClaw และตั้งค่าให้เรียกใช้โมเดลผ่าน
            TinyToken โดยใช้ API Key ที่ขึ้นต้นด้วย <InlineCode>sk-</InlineCode>
          </p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={openClawImages[0]} alt='ภาพรวมคู่มือ OpenClaw' loading='lazy' className='w-full' />
          </figure>
        </Section>

        <Section id='openclaw-install' title='ติดตั้ง OpenClaw'>
          <p>บน MacOS / Linux ให้เปิด Terminal แล้วรันคำสั่งนี้</p>
          <CopyValueBox
            values={[
              {
                label: 'MacOS / Linux',
                value: 'curl -fsSL https://openclaw.ai/install.sh | bash',
              },
            ]}
          />
          <p>บน Windows แนะนำให้ติดตั้งและใช้งานผ่าน WSL2 ก่อน จากนั้นรันคำสั่งนี้</p>
          <CopyValueBox
            values={[
              {
                label: 'Windows PowerShell',
                value: 'iwr -useb https://openclaw.ai/install.ps1 | iex',
              },
              { label: 'ตรวจเวอร์ชัน', value: 'openclaw --version' },
            ]}
          />
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={openClawImages[1]} alt='ติดตั้ง OpenClaw และตรวจสอบเวอร์ชัน' loading='lazy' className='w-full' />
          </figure>
        </Section>

        <Section id='openclaw-onboard' title='เริ่มตั้งค่า OpenClaw'>
          <p>หลังติดตั้งเสร็จ ให้เปิดตัวช่วยตั้งค่าแบบ interactive ด้วยคำสั่งนี้</p>
          <CopyValueBox values={[{ label: 'Command', value: 'openclaw onboard' }]} />
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={openClawImages[2]} alt='เริ่ม openclaw onboard' loading='lazy' className='w-full' />
          </figure>
        </Section>

        <Section id='openclaw-quickstart' title='ตั้งค่าระหว่าง onboarding'>
          <OrderedList>
            <li>เมื่อเจอหน้า Onboarding mode ให้เลือก QuickStart</li>
            <li>ในขั้นตอน Model/auth provider ให้เลือก Skip for now</li>
            <li>ในหน้า Filter models by provider ให้เลือก All providers</li>
            <li>ในขั้นตอน Default model ให้เลือก Keep current</li>
            <li>ถ้ายังไม่ต้องการเชื่อม Telegram, Discord หรือช่องทางแชตอื่น ให้เลือก Skip for now</li>
            <li>ในขั้นตอน Skills สามารถเลือก Skip for now หรือเลือกเฉพาะ skill ที่ต้องใช้</li>
            <li>ถ้ามีหน้าถาม Enable hooks แนะนำให้เลือก boot-md, command-logger และ session-memory</li>
          </OrderedList>
          <div className='space-y-5'>
            {openClawImages.slice(3, 7).map((image, index) => (
              <figure
                key={image}
                className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'
              >
                <img
                  src={image}
                  alt={`ตั้งค่า OpenClaw ขั้นตอนที่ ${index + 1}`}
                  loading='lazy'
                  className='w-full'
                />
              </figure>
            ))}
          </div>
          <ValueBox>
            เมื่อตั้งค่าเสร็จ OpenClaw อาจเปิดหน้า gateway ผ่าน browser ให้อัตโนมัติ
            ถ้า gateway ยังไม่เปิด ให้รันคำสั่ง <InlineCode>openclaw gateway</InlineCode>
          </ValueBox>
        </Section>

        <Section id='openclaw-api' title='เชื่อมต่อ TinyToken API'>
          <p>หลังติดตั้ง OpenClaw เสร็จ ให้เปิดโฟลเดอร์ config ของ OpenClaw</p>
          <CopyValueBox
            values={[
              { label: 'MacOS / Linux', value: 'open ~/.openclaw' },
              { label: 'VS Code', value: 'code ~/.openclaw/openclaw.json' },
            ]}
          />
          <p>
            API Key ให้คัดลอกจากหน้า <InlineCode>{keysUrl}</InlineCode> และต้องขึ้นต้นด้วย{' '}
            <InlineCode>sk-</InlineCode>
          </p>
          <ValueBox>
            ถ้าใช้ <InlineCode>anthropic-messages</InlineCode> ให้ใช้{' '}
            <InlineCode>{apiUrl}</InlineCode> ไม่ต้องเติม <InlineCode>/v1</InlineCode>
            แต่ถ้าใช้ <InlineCode>openai-completions</InlineCode> ให้ใช้{' '}
            <InlineCode>{apiUrl}/v1</InlineCode>
          </ValueBox>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={openClawImages[7]} alt='เชื่อมต่อ TinyToken API ใน OpenClaw' loading='lazy' className='w-full' />
          </figure>
        </Section>

        <Section id='openclaw-config' title='ตัวอย่าง config สำหรับ TinyToken'>
          <p>
            เปิดไฟล์ <InlineCode>openclaw.json</InlineCode> แล้วเพิ่มหรือปรับ config ส่วน{' '}
            <InlineCode>models</InlineCode> ให้ใช้ TinyToken ตัวอย่างนี้ใช้{' '}
            <InlineCode>anthropic-messages</InlineCode> สำหรับโมเดล Claude
          </p>
          <CodeBlock
            label='openclaw.json'
            value={`{
  "agents": {
    "defaults": {
      "model": {
        "primary": "tinyapi/claude-sonnet-4-6"
      },
      "models": {
        "tinyapi/claude-sonnet-4-6": {},
        "tinyapi/claude-opus-4-6": {}
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "tinyapi": {
        "baseUrl": "https://api.tinyapi.org",
        "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "claude-sonnet-4-6",
            "name": "claude-sonnet-4-6",
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 128000,
            "maxTokens": 62000
          },
          {
            "id": "claude-opus-4-6",
            "name": "claude-opus-4-6",
            "reasoning": true,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 128000,
            "maxTokens": 62000
          }
        ]
      }
    }
  }
}`}
          />
        </Section>

        <Section id='openclaw-restart' title='รีสตาร์ท gateway'>
          <p>หลังบันทึก openclaw.json แล้ว ให้รีสตาร์ท gateway</p>
          <CopyValueBox values={[{ label: 'Restart', value: 'openclaw gateway restart' }]} />
          <p>
            จากนั้นเปิดหน้า gateway แล้วตรวจว่า provider และโมเดลของ TinyToken แสดงถูกต้อง
            ถ้าเชื่อมต่อไม่ได้ ให้ตรวจ API Key, ยอดคงเหลือ, endpoint และชื่อโมเดลอีกครั้ง
          </p>
        </Section>
      </>
    ),
    next: {
      href: '/docs/opencode',
      label: 'OpenCode ตั้งค่า',
    },
  },
  opencode: {
    slug: 'opencode',
    groupTitle: 'CC-Switch ใช้งาน',
    title: 'OpenCode ตั้งค่า',
    icon: OpenCodeIcon,
    date: '2026/6/12',
    readTime: 'อ่านประมาณ 5 นาที',
    intro:
      'คู่มือภาษาไทยสำหรับตั้งค่า OpenCode ให้เรียกใช้โมเดลผ่าน TinyAPI ด้วย OpenAI-compatible endpoint',
    toc: [
      { title: 'ก่อนเริ่ม', href: '#opencode-before-start' },
      { title: 'ติดตั้ง OpenCode', href: '#opencode-install' },
      { title: 'เชื่อมต่อ Provider ID', href: '#opencode-connect' },
      { title: 'สร้างไฟล์ opencode.json', href: '#opencode-config-path' },
      { title: 'ตัวอย่าง config สำหรับ TinyAPI', href: '#opencode-config' },
      { title: 'เปิดใช้และทดสอบโมเดล', href: '#opencode-verify' },
      { title: 'เช็กปัญหาที่พบบ่อย', href: '#opencode-troubleshooting' },
    ],
    render: () => (
      <>
        <Section id='opencode-before-start' title='ก่อนเริ่ม'>
          <p>
            OpenCode เป็น coding agent ที่ใช้งานผ่าน Terminal และสามารถต่อกับ provider
            ที่เป็น OpenAI-compatible ได้ คู่มือนี้จะใช้ TinyAPI เป็น provider ชื่อ{' '}
            <InlineCode>tinyapi</InlineCode>
          </p>
          <ValueBox>
            ถ้าจะใช้โมเดล Gemini ใน OpenCode แนะนำให้ลองผ่านรูปแบบ Chat / OpenAI-compatible
            ก่อน เพราะบางเครื่องมืออาจไม่รองรับ Gemini native format ครบทุกพารามิเตอร์
          </ValueBox>
          <figure className='flex items-center justify-center overflow-hidden rounded-md border bg-slate-950 p-8 shadow-sm dark:border-slate-800'>
            <img
              src={openCodeLogo}
              alt='OpenCode logo'
              loading='lazy'
              className='h-36 w-36 rounded-[28px] object-contain md:h-44 md:w-44'
            />
          </figure>
        </Section>

        <Section id='opencode-install' title='ติดตั้ง OpenCode'>
          <p>
            วิธีติดตั้งจากเอกสารทางการที่ใช้ได้กับ MacOS / Linux คือ install script
            ด้านล่าง หลังติดตั้งเสร็จให้ตรวจเวอร์ชันด้วย <InlineCode>opencode --version</InlineCode>
          </p>
          <CopyValueBox
            values={[
              {
                label: 'MacOS / Linux',
                value: 'curl -fsSL https://opencode.ai/install | bash',
              },
              { label: 'ตรวจเวอร์ชัน', value: 'opencode --version' },
            ]}
          />
          <p>
            ถ้าเครื่องของคุณใช้ Node.js อยู่แล้ว สามารถติดตั้งผ่าน package manager ได้เช่นกัน
            โดยใช้แพ็กเกจ <InlineCode>opencode-ai</InlineCode>
          </p>
          <CopyValueBox
            values={[
              { label: 'npm', value: 'npm install -g opencode-ai' },
              { label: 'pnpm', value: 'pnpm install -g opencode-ai' },
            ]}
          />
        </Section>

        <Section id='opencode-connect' title='เชื่อมต่อ Provider ID'>
          <p>
            เปิด Terminal ในโฟลเดอร์โปรเจกต์ แล้วเข้า OpenCode ด้วยคำสั่ง{' '}
            <InlineCode>opencode</InlineCode> จากนั้นใช้คำสั่ง <InlineCode>/connect</InlineCode>{' '}
            เพื่อเพิ่ม provider ใหม่
          </p>
          <CopyValueBox
            values={[
              { label: 'เข้าโฟลเดอร์งาน', value: 'cd path/to/your-project' },
              { label: 'เปิด OpenCode', value: 'opencode' },
              { label: 'เพิ่ม provider', value: '/connect' },
            ]}
          />
          <OrderedList>
            <li>เลือก provider ประเภท custom / other หรือ OpenAI-compatible ถ้ามีให้เลือก</li>
            <li>
              ตั้ง Provider ID เป็น <InlineCode>tinyapi</InlineCode>
            </li>
            <li>
              วาง API Key จากหน้า <InlineCode>{keysUrl}</InlineCode> โดยคีย์ต้องขึ้นต้นด้วย{' '}
              <InlineCode>sk-</InlineCode>
            </li>
          </OrderedList>
          <ValueBox>
            Provider ID ที่ตั้งใน <InlineCode>/connect</InlineCode> ต้องตรงกับชื่อ key ในไฟล์{' '}
            <InlineCode>opencode.json</InlineCode> แบบตัวพิมพ์เล็ก/ใหญ่ตรงกัน ตัวอย่างนี้ใช้{' '}
            <InlineCode>tinyapi</InlineCode>
          </ValueBox>
        </Section>

        <Section id='opencode-config-path' title='สร้างไฟล์ opencode.json'>
          <p>
            OpenCode อ่าน config จากไฟล์ <InlineCode>opencode.json</InlineCode> ให้สร้างหรือแก้ไฟล์
            ตาม path ของระบบที่ใช้งาน
          </p>
          <CopyValueBox
            values={[
              {
                label: 'Windows',
                value: '%USERPROFILE%\\.config\\opencode\\opencode.json',
              },
              {
                label: 'MacOS / Linux',
                value: '~/.config/opencode/opencode.json',
              },
              {
                label: 'เปิดด้วย VS Code',
                value: 'code ~/.config/opencode/opencode.json',
              },
            ]}
          />
        </Section>

        <Section id='opencode-config' title='ตัวอย่าง config สำหรับ TinyAPI'>
          <p>
            ใช้ <InlineCode>@ai-sdk/openai-compatible</InlineCode> สำหรับ endpoint แบบ{' '}
            <InlineCode>/v1/chat/completions</InlineCode> และตั้ง{' '}
            <InlineCode>baseURL</InlineCode> เป็น <InlineCode>{apiUrl}/v1</InlineCode>
          </p>
          <CodeBlock label='opencode.json' value={openCodeConfig} />
          <DocsTable
            headers={['รายการ', 'ความหมาย']}
            rows={[
              [
                'tinyapi',
                'Provider ID ต้องตรงกับชื่อที่ตั้งตอนใช้ /connect',
              ],
              [
                '@ai-sdk/openai-compatible',
                'แพ็กเกจสำหรับ API ที่เข้ากันได้กับ OpenAI Chat Completions',
              ],
              [
                `${apiUrl}/v1`,
                'Base URL ของ TinyAPI สำหรับ OpenCode',
              ],
              [
                'models',
                'ใส่ชื่อโมเดลจริงที่เปิดใช้งานในหน้า Pricing / All AI Model ของเว็บคุณ',
              ],
            ]}
          />
        </Section>

        <Section id='opencode-verify' title='เปิดใช้และทดสอบโมเดล'>
          <OrderedList>
            <li>บันทึกไฟล์ <InlineCode>opencode.json</InlineCode></li>
            <li>ปิด Terminal ที่เปิด OpenCode อยู่ แล้วเปิดใหม่</li>
            <li>เข้าโฟลเดอร์โปรเจกต์และรัน <InlineCode>opencode</InlineCode></li>
            <li>
              พิมพ์ <InlineCode>/models</InlineCode> แล้วเลือก provider{' '}
              <InlineCode>TinyAPI</InlineCode>
            </li>
            <li>เลือกโมเดลที่ใส่ไว้ใน config แล้วลองถามข้อความสั้น ๆ</li>
          </OrderedList>
          <CopyValueBox
            values={[
              { label: 'เปิด OpenCode', value: 'opencode' },
              { label: 'เลือกโมเดล', value: '/models' },
              {
                label: 'ข้อความทดสอบ',
                value: 'ตอบกลับคำว่า TinyAPI OK เท่านั้น',
              },
            ]}
          />
        </Section>

        <Section id='opencode-troubleshooting' title='เช็กปัญหาที่พบบ่อย'>
          <OrderedList>
            <li>
              เช็กว่า Provider ID ใน <InlineCode>/connect</InlineCode> และ{' '}
              <InlineCode>opencode.json</InlineCode> ตรงกัน เช่น <InlineCode>tinyapi</InlineCode>
            </li>
            <li>
              เช็กว่า <InlineCode>baseURL</InlineCode> เป็น <InlineCode>{apiUrl}/v1</InlineCode>
            </li>
            <li>
              เช็กว่า API Key จากหน้า <InlineCode>{keysUrl}</InlineCode> ยังใช้งานได้และมียอดคงเหลือ
            </li>
            <li>
              เช็กชื่อโมเดลใน <InlineCode>models</InlineCode> ว่าตรงกับชื่อในหน้า Pricing
              หรือ All AI Model ทุกตัวอักษร
            </li>
            <li>
              ถ้าแก้ config แล้วไม่เห็นโมเดล ให้ปิด Terminal ทั้งหมดแล้วเปิด OpenCode ใหม่
            </li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/hermes-agent',
      label: 'Hermes Agent ตั้งค่า',
    },
  },
  'hermes-agent': {
    slug: 'hermes-agent',
    groupTitle: 'CC-Switch ใช้งาน',
    title: 'Hermes Agent ตั้งค่า',
    icon: HermesIcon,
    date: '2026/6/12',
    readTime: 'อ่านประมาณ 6 นาที',
    intro:
      'คู่มือภาษาไทยสำหรับติดตั้ง Hermes Agent และเชื่อมต่อกับ TinyAPI ผ่าน endpoint ของ TinyToken',
    toc: [
      { title: 'Hermes Agent คืออะไร', href: '#hermes-about' },
      { title: 'ติดตั้ง Hermes', href: '#hermes-install' },
      { title: 'เลือกโมเดลและ endpoint', href: '#hermes-model' },
      { title: 'ตั้งค่าใน CC-Switch', href: '#hermes-ccswitch' },
      { title: 'เปิด Gateway และ Web UI', href: '#hermes-gateway' },
      { title: 'ตรวจสอบก่อนใช้งาน', href: '#hermes-checklist' },
    ],
    render: () => (
      <>
        <Section id='hermes-about' title='Hermes Agent คืออะไร'>
          <p>
            Hermes Agent เป็นเครื่องมือ AI agent ที่ใช้งานผ่าน command line และมี Web UI
            สำหรับเปิด gateway / dashboard ได้ คู่มือนี้จะตั้งให้ Hermes เรียกโมเดลผ่าน
            TinyAPI โดยใช้ API Key ที่ขึ้นต้นด้วย <InlineCode>sk-</InlineCode>
          </p>
          <figure className='flex items-center justify-center overflow-hidden rounded-md border bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img
              src={hermesLogo}
              alt='Hermes Agent logo'
              loading='lazy'
              className='h-36 w-36 rounded-md object-contain md:h-44 md:w-44'
            />
          </figure>
          <ValueBox>
            สำหรับ TinyAPI ให้เริ่มจากรูปแบบ OpenAI-compatible ก่อน โดยใช้ endpoint{' '}
            <InlineCode>{apiUrl}/v1</InlineCode> ถ้าโปรแกรมถามหา base URL แบบมี{' '}
            <InlineCode>/v1</InlineCode>
          </ValueBox>
        </Section>

        <Section id='hermes-install' title='ติดตั้ง Hermes'>
          <p>บน Windows ให้เปิด PowerShell แล้วรันคำสั่งติดตั้งนี้</p>
          <CopyValueBox
            values={[
              {
                label: 'Windows PowerShell',
                value: 'irm https://hermes-agent.nousresearch.com/install.ps1 | iex',
              },
            ]}
          />
          <p>บน Linux / macOS / WSL2 / Android Termux ให้ใช้คำสั่งนี้</p>
          <CopyValueBox
            values={[
              {
                label: 'Linux / macOS',
                value: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash',
              },
              { label: 'ตรวจเวอร์ชัน', value: 'hermes --version' },
            ]}
          />
        </Section>

        <Section id='hermes-model' title='เลือกโมเดลและ endpoint'>
          <p>
            หลังติดตั้งเสร็จ ให้เปิด Terminal แล้วรันคำสั่งเลือก provider / model
            จากนั้นเลือก custom endpoint ตามรูปตัวอย่าง
          </p>
          <CopyValueBox
            values={[
              { label: 'เปิดเมนูโมเดล', value: 'hermes model' },
              { label: 'API Base URL', value: `${apiUrl}/v1` },
              { label: 'API Key', value: exampleApiKey },
              { label: 'ตัวอย่างโมเดล', value: 'claude-opus-4-7' },
              { label: 'Display name', value: 'tinytoken' },
            ]}
          />
          <OrderedList>
            <li>
              ในหน้า provider ให้เลือก <InlineCode>Custom endpoint</InlineCode> หรือ custom
              OpenAI-compatible endpoint
            </li>
            <li>
              ช่อง API base URL ให้ใส่ <InlineCode>{apiUrl}/v1</InlineCode>
            </li>
            <li>
              ช่อง API key ให้วางคีย์จากหน้า <InlineCode>{keysUrl}</InlineCode>
            </li>
            <li>เลือก compatibility mode เป็น Auto-detect หรือ Chat Completions</li>
            <li>ใส่ชื่อโมเดลจริงจากหน้า Pricing / All AI Model ของเว็บคุณ</li>
          </OrderedList>
          <div className='space-y-5'>
            {hermesImages.slice(1, 3).map((image, index) => (
              <figure
                key={image}
                className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'
              >
                <img
                  src={image}
                  alt={`ตั้งค่า Hermes model ขั้นตอนที่ ${index + 1}`}
                  loading='lazy'
                  className='w-full'
                />
              </figure>
            ))}
          </div>
        </Section>

        <Section id='hermes-ccswitch' title='ตั้งค่าใน CC-Switch'>
          <p>
            ถ้าใช้ CC-Switch ช่วยจัดการ provider ให้เลือกแท็บ Hermes แล้วเพิ่ม Provider ใหม่
            ด้วย Custom Configuration
          </p>
          <OrderedList>
            <li>เปิด CC-Switch แล้วเลือกไอคอน Hermes</li>
            <li>กดปุ่ม + เพื่อเพิ่ม provider ใหม่</li>
            <li>เลือก Provider Preset เป็น Custom Configuration</li>
            <li>Provider Key ใช้ <InlineCode>tinyapi</InlineCode></li>
            <li>
              API Endpoint ใช้ <InlineCode>{apiUrl}</InlineCode> ถ้าเลือก API Mode เป็น Anthropic
              Messages หรือใช้ <InlineCode>{apiUrl}/v1</InlineCode> ถ้าเลือก OpenAI-compatible
            </li>
            <li>วาง API Key และกด Fetch Models แล้วเลือกโมเดลที่ต้องการ</li>
            <li>กด Save แล้วกลับไปทดสอบใน Hermes</li>
          </OrderedList>
          <div className='space-y-5'>
            {hermesImages.slice(3, 6).map((image, index) => (
              <figure
                key={image}
                className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'
              >
                <img
                  src={image}
                  alt={`ตั้งค่า Hermes ใน CC-Switch ขั้นตอนที่ ${index + 1}`}
                  loading='lazy'
                  className='w-full'
                />
              </figure>
            ))}
          </div>
        </Section>

        <Section id='hermes-gateway' title='เปิด Gateway และ Web UI'>
          <p>เมื่อตั้งค่าโมเดลแล้ว สามารถเปิด gateway และ dashboard ของ Hermes ได้ด้วยคำสั่งนี้</p>
          <CopyValueBox
            values={[
              { label: 'เปิด gateway', value: 'hermes gateway run' },
              { label: 'เปิด dashboard', value: 'hermes dashboard' },
            ]}
          />
          <p>
            เมื่อ dashboard เปิดแล้ว ให้ลองส่งข้อความสั้น ๆ เพื่อตรวจว่าระบบเรียกโมเดลผ่าน TinyAPI
            ได้จริง
          </p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={hermesImages[6]} alt='Hermes gateway และ dashboard' loading='lazy' className='w-full' />
          </figure>
        </Section>

        <Section id='hermes-checklist' title='ตรวจสอบก่อนใช้งาน'>
          <OrderedList>
            <li>API Key ต้องขึ้นต้นด้วย <InlineCode>sk-</InlineCode> และบัญชีมียอดคงเหลือ</li>
            <li>
              ถ้าใช้ custom OpenAI-compatible endpoint ให้ใช้ <InlineCode>{apiUrl}/v1</InlineCode>
            </li>
            <li>ชื่อโมเดลต้องตรงกับหน้า Pricing / All AI Model ทุกตัวอักษร</li>
            <li>ถ้า Fetch Models ไม่ขึ้น ให้ลองเช็ก API Mode และ endpoint อีกครั้ง</li>
            <li>หลังแก้ provider แล้ว ให้ปิด Hermes / CC-Switch แล้วเปิดใหม่ถ้าค่าไม่อัปเดต</li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/cc-switch',
      label: 'CC-Switch ขั้นตอนทั่วไป',
    },
  },
  'cc-switch': {
    slug: 'cc-switch',
    groupTitle: 'CC-Switch ใช้งาน',
    title: 'ขั้นตอนทั่วไป',
    icon: CcSwitchIcon,
    date: '2026/6/8',
    readTime: 'อ่านไม่เกิน 2 นาที',
    intro:
      'หน้านี้โชว์เฉพาะข้อมูลหลักที่ใช้กับ CC-Switch: URL เว็บไซต์, API Endpoint, API Key และชื่อโมเดล',
    toc: [
      { title: 'ตั้งค่า URL หลัก', href: '#set-base-url' },
      { title: 'วาง API Key และเลือกโมเดล', href: '#set-key-and-model' },
      { title: 'บันทึกและทดสอบ', href: '#save-and-test' },
    ],
    render: () => (
      <>
        <Section id='set-base-url' title='ตั้งค่า URL หลัก'>
          <p>
            ช่องที่ต้องใส่มีแค่ 2 ค่าในระดับบนสุดพอ คือ <strong>Website URL</strong> และ{' '}
            <strong>API Endpoint</strong>
          </p>

          <CopyValueBox
            values={[
              { label: 'Website URL', value: appUrl },
              { label: 'API Endpoint', value: apiUrl },
            ]}
          />

          <p>
            ถ้าเครื่องมือรองรับ ให้ใส่แค่ <InlineCode>{apiUrl}</InlineCode> แล้วให้ระบบต่อ path
            ที่ต้องใช้เอง อย่าเติม <InlineCode>/v1</InlineCode> หรือ{' '}
            <InlineCode>/v1/chat/completions</InlineCode> ลงไปในช่องหลักถ้าเขาไม่ได้ร้องขอ
          </p>
        </Section>

        <Section id='set-key-and-model' title='วาง API Key และเลือกโมเดล'>
          <OrderedList>
            <li>
              คัดลอก API Key จากหน้า <InlineCode>/keys</InlineCode>
            </li>
            <li>
              เลือกชื่อโมเดลจากหน้า <InlineCode>/pricing</InlineCode> หรือ All AI Model
            </li>
            <li>กด Fetch Models เพื่อดึงรายชื่อโมเดลที่คีย์นี้ใช้งานได้</li>
            <li>เลือกโมเดลที่ต้องการ แล้วกด Save</li>
          </OrderedList>

          <ValueBox>
            ถ้าคุณอยากให้ระบบจำแนก path เอง ให้เก็บเฉพาะ Base URL กับ API Key ไว้ก่อน แล้วค่อยให้
            เครื่องมือเลือก <InlineCode>/v1/messages</InlineCode> หรือ{' '}
            <InlineCode>/v1/chat/completions</InlineCode> ตามชนิดโมเดลเอง
          </ValueBox>
        </Section>

        <Section id='save-and-test' title='บันทึกและทดสอบ'>
          <OrderedList>
            <li>กด Save หรือ Apply Changes</li>
            <li>เปิดเครื่องมือใหม่อีกครั้ง</li>
            <li>ลองส่งข้อความสั้น ๆ เพื่อตรวจว่าเชื่อมต่อได้จริง</li>
          </OrderedList>
        </Section>
      </>
    ),
    next: {
      href: '/docs/cc-switch-claude-code',
      label: 'Claude Code ตั้งค่า',
    },
  },
  "cc-switch-claude-code": {
    slug: "cc-switch-claude-code",
    groupTitle: "CC-Switch ใช้งาน",
    title: "คู่มือใช้งาน CC-Switch กับ TinyToken",
    icon: ClaudeIcon,
    date: '2026/6/8',
    readTime: "อ่านไม่เกิน 5 นาที",
    intro: "คู่มือใช้งาน CC-Switch กับ TinyToken สำหรับ Claude Code",
    toc: [
      { title: "สรุปก่อนเริ่ม", href: "#claude-code-section-1" },
      { title: "ดาวน์โหลดและเปิด CC-Switch", href: "#claude-code-step-1" },
      { title: "เปิดหน้า Claude ใน CC-Switch", href: "#claude-code-step-2" },
      { title: "เลือก Custom Configuration", href: "#claude-code-step-3" },
      { title: "คัดลอก API Key จาก TinyToken", href: "#claude-code-step-4" },
      { title: "กรอก Provider ของ TinyToken", href: "#claude-code-step-5" },
      { title: "ตั้งค่า Advanced Options", href: "#claude-code-step-6" },
      { title: "เปิดใช้งาน Provider", href: "#claude-code-step-7" },
      { title: "ตั้งค่า Skip first-run confirmation", href: "#claude-code-step-8" },
      { title: "ทดสอบใน Terminal", href: "#claude-code-step-9" },
      { title: "ตรวจสอบว่าใช้งานได้", href: "#claude-code-step-10" },
      { title: "หมายเหตุ", href: "#claude-code-section-2" },
    ],
    render: () => (
      <>
        <Section id="claude-code-section-1" title="สรุปก่อนเริ่ม">
          <p>{"คู่มือนี้ใช้สำหรับตั้งค่า Claude Code ให้เรียก API ผ่าน TinyToken โดยใช้ CC-Switch เป็นตัวจัดการ Provider"}</p>
        </Section>
        <Section id="claude-code-step-1" title="1. ดาวน์โหลดและเปิด CC-Switch">
          <p>{"ไปที่หน้า GitHub Release ของ CC-Switch แล้วดาวน์โหลดไฟล์สำหรับระบบของคุณ เช่น Windows ให้ใช้ไฟล์ .msi จากนั้นติดตั้งและเปิดโปรแกรม"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[0]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เลือกไฟล์ติดตั้ง CC-Switch จากหน้า Assets"}</p>
        </Section>
        <Section id="claude-code-step-2" title="2. เปิดหน้า Claude ใน CC-Switch">
          <p>{"เมื่อเปิดโปรแกรมแล้ว ให้เลือกแท็บ Claude และกดปุ่ม + เพื่อเพิ่ม Provider ใหม่"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[1]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"หน้าแรกของ CC-Switch สำหรับ Claude"}</p>
        </Section>
        <Section id="claude-code-step-3" title="3. เลือก Custom Configuration">
          <p>{"ในหน้า Add New Provider ให้เลือก Custom Configuration เพื่อกรอกข้อมูล TinyToken เอง"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[2]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เลือก Custom Configuration"}</p>
        </Section>
        <Section id="claude-code-step-4" title="4. คัดลอก API Key จาก TinyToken">
          <p>{"เปิด https://tinyapi.org/keys แล้วกดปุ่มคัดลอก API Key"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[3]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"คัดลอก API Key จากหน้า TinyToken"}</p>
        </Section>
        <Section id="claude-code-step-5" title="5. กรอก Provider ของ TinyToken">
          <p>{"Provider Name: TinyToken"}</p>
          <p>{"Website URL: https://tinyapi.org"}</p>
          <p>{"API Key: วาง API Key ที่คัดลอกมา"}</p>
          <p>{"API Endpoint: https://api.tinyapi.org"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[4]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"กรอก URL, API Key และ Endpoint"}</p>
        </Section>
        <Section id="claude-code-step-6" title="6. ตั้งค่า Advanced Options">
          <p>{"เปิด Advanced Options"}</p>
          <p>{"API Format: Anthropic Messages (Native)"}</p>
          <p>{"Auth Field: ANTHROPIC_AUTH_TOKEN (Default)"}</p>
          <p>{"Main Model: claude-opus-4-6 หรือโมเดลที่ต้องการ แล้วกด Add / Save"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[5]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"ตั้งค่า API Format และ Main Model"}</p>
        </Section>
        <Section id="claude-code-step-7" title="7. เปิดใช้งาน Provider">
          <p>{"กลับมาหน้าหลักแล้วกด Enable ให้ TinyToken ขึ้นสถานะ In Use"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[6]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"TinyToken แสดงสถานะ In Use"}</p>
        </Section>
        <Section id="claude-code-step-8" title="8. ตั้งค่า Skip first-run confirmation">
          <p>{"ไปที่ Settings > General แล้วเปิด Skip Claude Code first-run confirmation"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[7]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เปิด Skip Claude Code first-run confirmation"}</p>
        </Section>
        <Section id="claude-code-step-9" title="9. ทดสอบใน Terminal">
          <p>{"เปิด PowerShell หรือ Terminal แล้วพิมพ์ claude ถ้ามีหน้าให้ยืนยัน ให้เลือก Yes, I trust this folder"}</p>
          <CopyValueBox values={[{ label: 'Command', value: "claude" }]} />
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[8]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เลือก Yes, I trust this folder"}</p>
        </Section>
        <Section id="claude-code-step-10" title="10. ตรวจสอบว่าใช้งานได้">
          <p>{"ลองถามว่า what is your model ถ้า Claude ตอบกลับได้ แปลว่าตั้งค่าสำเร็จ"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[9]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"Claude Code ใช้งานผ่าน TinyToken สำเร็จ"}</p>
        </Section>
        <Section id="claude-code-section-2" title="หมายเหตุ">
          <ul className='list-disc space-y-2 pl-5'>
            <li>{"ถ้าจะเปลี่ยนโมเดล ให้คัดลอกชื่อโมเดลจากหน้า All AI Model / Pricing ของ TinyToken"}</li>
            <li>{"ถ้า API ไม่ทำงาน ให้ตรวจสอบ API Key, Endpoint และสถานะ In Use อีกครั้ง"}</li>
          </ul>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeCodeImages[10]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"คัดลอกชื่อโมเดลจากหน้า TinyToken"}</p>
        </Section>
      </>
    ),
    next: {
      href: "/docs/cc-switch-claude-desktop",
      label: "Claude Desktop",
    },
  },
  "cc-switch-claude-desktop": {
    slug: "cc-switch-claude-desktop",
    groupTitle: "CC-Switch ใช้งาน",
    title: "คู่มือใช้งาน Claude Desktop กับ TinyToken",
    icon: ClaudeIcon,
    date: '2026/6/8',
    readTime: "อ่านไม่เกิน 5 นาที",
    intro: "คู่มือใช้งาน Claude Desktop กับ TinyToken ผ่าน CC-Switch",
    toc: [
      { title: "เปิด CC-Switch แล้วเลือก Claude Desktop", href: "#claude-desktop-step-1" },
      { title: "คัดลอก API Key จาก TinyToken", href: "#claude-desktop-step-2" },
      { title: "กรอก API Key และ Endpoint", href: "#claude-desktop-step-3" },
      { title: "ดึงรายชื่อโมเดล", href: "#claude-desktop-step-4" },
      { title: "เลือกโมเดลที่ต้องการ", href: "#claude-desktop-step-5" },
      { title: "เปิด Routing ใน CC-Switch", href: "#claude-desktop-step-6" },
      { title: "เปิด Inference configuration ใน Claude Desktop", href: "#claude-desktop-step-7" },
      { title: "เลือก Gateway และทดสอบ", href: "#claude-desktop-step-8" },
      { title: "Apply แล้วเริ่มใช้งาน", href: "#claude-desktop-step-9" },
      { title: "ใน Claude Desktop", href: "#claude-desktop-step-10" },
      { title: "ใน CC-Switch", href: "#claude-desktop-step-11" },
      { title: "Prompt สำหรับ Codex", href: "#claude-desktop-section-3" },
    ],
    render: () => (
      <>
        <Section id="claude-desktop-step-1" title="1. เปิด CC-Switch แล้วเลือก Claude Desktop">
          <p>{"ในหน้า CC-Switch ให้เลือกไอคอน Claude Desktop จากนั้นกดปุ่ม + เพื่อเพิ่ม Provider ใหม่"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[0]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เลือก Claude Desktop แล้วกด +"}</p>
        </Section>
        <Section id="claude-desktop-step-2" title="2. คัดลอก API Key จาก TinyToken">
          <p>{"เปิดหน้า API Keys ใน TinyToken แล้วกดปุ่มคัดลอก API Key"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[1]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"คัดลอก API Key จาก TinyToken"}</p>
        </Section>
        <Section id="claude-desktop-step-3" title="3. กรอก API Key และ Endpoint">
          <p>{"Provider Name: TinyToken"}</p>
          <p>{"Website URL: https://tinyapi.org"}</p>
          <p>{"API Key: วาง API Key ที่คัดลอกมา"}</p>
          <p>{"API Endpoint / Base URL: https://api.tinyapi.org แล้วกด Save"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[2]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"กรอก API Key และ Endpoint"}</p>
        </Section>
        <Section id="claude-desktop-step-4" title="4. ดึงรายชื่อโมเดล">
          <p>{"กด Fetch Models เพื่อให้ CC-Switch ดึงรายชื่อโมเดลจาก TinyToken"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[3]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"กด Fetch Models"}</p>
        </Section>
        <Section id="claude-desktop-step-5" title="5. เลือกโมเดลที่ต้องการ">
          <p>{"เลือกโมเดล เช่น claude-opus-4-6, claude-opus-4-7 หรือ claude-sonnet รุ่นที่ต้องการ แล้วกด Save"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[4]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เลือกโมเดลและกด Save"}</p>
        </Section>
        <Section id="claude-desktop-step-6" title="6. เปิด Routing ใน CC-Switch">
          <p>{"ไปที่ Settings > Routing แล้วเปิด Show Routing Toggle on Main Page, Routing Master Switch และเปิด Claude"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[5]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เปิด Routing Master Switch และ Claude"}</p>
        </Section>
        <Section id="claude-desktop-step-7" title="7. เปิด Inference configuration ใน Claude Desktop">
          <p>{"ใน Claude Desktop ให้เปิดเมนูด้านซ้ายล่าง แล้วเลือก Inference configuration"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[6]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เปิด Inference configuration"}</p>
        </Section>
        <Section id="claude-desktop-step-8" title="8. เลือก Gateway และทดสอบ">
          <p>{"ใน Connection ให้เลือก Gateway ใส่ https://api.tinyapi.org และ API Key จากนั้นกด Test connection และ Test model discovery"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[7]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"ตั้งค่า Gateway และทดสอบการเชื่อมต่อ"}</p>
        </Section>
        <Section id="claude-desktop-step-9" title="9. Apply แล้วเริ่มใช้งาน">
          <p>{"กด Apply Changes แล้วปิด Claude Desktop ให้สนิท จากนั้นเปิดใหม่อีกครั้ง"}</p>
        </Section>
        <Section id="claude-desktop-step-10" title="1. ใน Claude Desktop">
          <p>{"ไปที่ Inference configuration > Connection แล้วเลือก Anthropic API จากนั้นกด Apply Changes และเปิด Claude Desktop ใหม่"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={claudeDesktopImages[8]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เลือก Anthropic API เพื่อกลับไปใช้ Claude Desktop แบบเดิม"}</p>
        </Section>
        <Section id="claude-desktop-step-11" title="2. ใน CC-Switch">
          <p>{"อีกวิธีคือเลือก Claude Desktop Official แล้วกด Enable จากนั้นปิดและเปิด Claude Desktop ใหม่"}</p>
        </Section>
        <Section id="claude-desktop-section-3" title="Prompt สำหรับ Codex">
          <p>{"ใช้เนื้อหาและรูปในเอกสารนี้สร้างหน้า API Docs ภาษาไทยสำหรับหัวข้อ “วิธีใช้งาน Claude Desktop กับ TinyToken ผ่าน CC-Switch” จัดลำดับขั้นตอน 1-9 ให้สั้น อ่านง่าย และใส่ส่วนท้าย “วิธีกลับไปใช้ Claude Desktop แบบเดิม”"}</p>
        </Section>
      </>
    ),
    next: {
      href: "/docs/cc-switch-codex",
      label: "Codex",
    },
  },
  "cc-switch-codex": {
    slug: "cc-switch-codex",
    groupTitle: "CC-Switch ใช้งาน",
    title: "คู่มือใช้งาน Codex กับ TinyToken",
    icon: OpenAIIcon,
    date: '2026/6/8',
    readTime: "อ่านไม่เกิน 5 นาที",
    intro: "คู่มือใช้งาน Codex กับ TinyToken ผ่าน CC-Switch",
    toc: [
      { title: "เปิด CC-Switch แล้วเลือก Codex", href: "#codex-step-1" },
      { title: "เพิ่ม Provider ของ TinyToken", href: "#codex-step-2" },
      { title: "คัดลอก API Key จาก TinyToken", href: "#codex-step-3" },
      { title: "เปิด Routing", href: "#codex-step-4" },
      { title: "เปิดใช้ Provider TinyToken", href: "#codex-step-5" },
      { title: "Restart Codex แล้วเลือกโมเดล", href: "#codex-step-6" },
      { title: "สรุปค่าที่ต้องใช้", href: "#codex-section-2" },
      { title: "Prompt สำหรับ Codex", href: "#codex-section-3" },
    ],
    render: () => (
      <>
        <Section id="codex-step-1" title="1. เปิด CC-Switch แล้วเลือก Codex">
          <p>{"ใน CC-Switch ให้กดไอคอน Codex จากนั้นกดปุ่ม + เพื่อเพิ่ม Provider ใหม่"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={codexImages[0]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เลือก Codex แล้วกด +"}</p>
        </Section>
        <Section id="codex-step-2" title="2. เพิ่ม Provider ของ TinyToken">
          <p>{"Provider Name: My codex หรือ TinyToken"}</p>
          <p>{"Website URL: https://tinyapi.org"}</p>
          <p>{"วาง API Key ในช่อง API Key"}</p>
          <p>{"API Request URL / Endpoint: https://api.tinyapi.org แล้วกด Save"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={codexImages[1]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"ใส่ Website URL และ API Key"}</p>
        </Section>
        <Section id="codex-step-3" title="3. คัดลอก API Key จาก TinyToken">
          <p>{"เปิด https://tinyapi.org/keys แล้วกดปุ่มคัดลอก API Key จากแถวที่ต้องการ"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={codexImages[2]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"คัดลอก API Key จาก TinyToken"}</p>
        </Section>
        <Section id="codex-step-4" title="4. เปิด Routing">
          <p>{"ไปที่ Settings > Routing แล้วเปิด Show Routing Toggle on Main Page, Routing Master Switch และเปิด Codex"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={codexImages[3]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"เปิด Routing สำหรับ Codex"}</p>
        </Section>
        <Section id="codex-step-5" title="5. เปิดใช้ Provider TinyToken">
          <p>{"กลับไปหน้า Codex ใน CC-Switch แล้วกด Enable ที่ Provider ของ TinyToken"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={codexImages[4]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"กด Enable ให้ Provider TinyToken"}</p>
        </Section>
        <Section id="codex-step-6" title="6. Restart Codex แล้วเลือกโมเดล">
          <p>{"ปิด Codex ให้สนิทแล้วเปิดใหม่ ตอนนี้ควรขึ้นว่า Logged in with API key และสามารถเลือกโมเดลที่ต้องการใช้งานได้"}</p>
          <figure className='overflow-hidden rounded-md border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950'>
            <img src={codexImages[5]} alt={"รูปประกอบคู่มือ"} loading='lazy' className='w-full' />
          </figure>
          <p className='text-sm italic text-slate-500'>{"Codex ใช้งานด้วย API Key และเลือกโมเดลได้"}</p>
        </Section>
        <Section id="codex-section-2" title="สรุปค่าที่ต้องใช้">
          <ul className='list-disc space-y-2 pl-5'>
            <li>{"Website URL: https://tinyapi.org"}</li>
            <li>{"API Key: คัดลอกจากหน้า TinyToken API Keys"}</li>
            <li>{"Routing: เปิด Routing Master Switch และ Codex"}</li>
            <li>{"หลังตั้งค่าเสร็จ ให้ restart Codex ก่อนใช้งาน"}</li>
          </ul>
        </Section>
        <Section id="codex-section-3" title="Prompt สำหรับ Codex">
          <p>{"สร้างหน้าเอกสาร API Docs ภาษาไทยชื่อ \"วิธีใช้งาน Codex กับ TinyToken ผ่าน CC-Switch\" โดยใช้ขั้นตอนจากไฟล์นี้ จัดเนื้อหาเป็น 1) เปิด CC-Switch เลือก Codex และเพิ่ม Provider 2) ใส่ endpoint https://api.tinyapi.org และ API Key 3) เปิด Routing: Show Routing Toggle, Routing Master Switch และ Codex 4) Enable Provider TinyToken 5) Restart Codex แล้วเลือกโมเดล ใช้ภาษาไทยสั้น เข้าใจง่าย และใส่รูปประกอบตามลำดับ"}</p>
        </Section>
      </>
    ),
  },
  'cc-switch-gemini': {
    slug: 'cc-switch-gemini',
    groupTitle: 'CC-Switch ใช้งาน',
    title: 'Gemini ตั้งค่า',
    icon: GeminiIcon,
    date: '2026/6/8',
    readTime: 'อ่านไม่เกิน 1 นาที',
    intro: 'หน้านี้จะแยกไว้สำหรับ Gemini เท่านั้น แล้วค่อยเติมตัวอย่างทีละภาพในรอบถัดไป',
    toc: [{ title: 'กำลังจัดทำ', href: '#gemini-coming-soon' }],
    render: () => (
      <Section id='gemini-coming-soon' title='กำลังจัดทำ'>
        <p>จะใส่คู่มือการตั้งค่า Gemini แยกเป็นขั้นตอนและรูปทีละภาพในรอบถัดไป</p>
      </Section>
    ),
    next: {
      href: '/docs/cc-switch-cli',
      label: 'CC-Switch-CLI ใช้งาน',
    },
  },
  'cc-switch-cli': {
    slug: 'cc-switch-cli',
    groupTitle: 'CC-Switch ใช้งาน',
    title: 'CC-Switch-CLI ใช้งาน',
    icon: TerminalSquare,
    date: '2026/6/8',
    readTime: 'อ่านไม่เกิน 1 นาที',
    intro: 'หน้าสำหรับคำสั่ง CLI ของ CC-Switch แบบแยกจากหัวข้ออื่น',
    toc: [{ title: 'กำลังจัดทำ', href: '#cli-coming-soon' }],
    render: () => (
      <Section id='cli-coming-soon' title='กำลังจัดทำ'>
        <p>
          จะเติมวิธีใช้งาน CC-Switch-CLI ทีละคำสั่ง เมื่อคุณพร้อมจะเริ่มเขียนหน้าส่วนนี้
        </p>
      </Section>
    ),
  },
}

function CcSwitchIcon(props: { className?: string }) {
  return (
    <span
      className={`${props.className ?? ''} inline-flex items-center justify-center`}
      aria-hidden='true'
    >
      <TerminalSquare className='size-full' />
    </span>
  )
}

function ClaudeIcon(props: { className?: string }) {
  return (
    <span
      className={`${props.className ?? ''} inline-flex items-center justify-center`}
      aria-hidden='true'
    >
      {getLobeIcon('Claude.Color', 18)}
    </span>
  )
}

function OpenAIIcon(props: { className?: string }) {
  return (
    <span
      className={`${props.className ?? ''} inline-flex items-center justify-center text-slate-700 dark:text-slate-200`}
      aria-hidden='true'
    >
      {getLobeIcon('OpenAI', 18)}
    </span>
  )
}

function GeminiIcon(props: { className?: string }) {
  return (
    <span
      className={`${props.className ?? ''} inline-flex items-center justify-center`}
      aria-hidden='true'
    >
      {getLobeIcon('Gemini.Color', 18)}
    </span>
  )
}

function OpenClawIcon(props: { className?: string }) {
  return (
    <span
      className={`${props.className ?? ''} inline-flex items-center justify-center overflow-hidden rounded-full bg-transparent`}
      aria-hidden='true'
    >
      <img src={openClawLogo} alt='' className='size-full object-contain' />
    </span>
  )
}

function OpenCodeIcon(props: { className?: string }) {
  return (
    <span
      className={`${props.className ?? ''} inline-flex items-center justify-center overflow-hidden rounded-md bg-transparent`}
      aria-hidden='true'
    >
      <img src={openCodeLogo} alt='' className='size-full object-contain' />
    </span>
  )
}

function HermesIcon(props: { className?: string }) {
  return (
    <span
      className={`${props.className ?? ''} inline-flex items-center justify-center overflow-hidden rounded-full bg-transparent`}
      aria-hidden='true'
    >
      <img src={hermesLogo} alt='' className='size-full object-cover' />
    </span>
  )
}

function docsSlugToPath(slug: string): string {
  return `/docs/${slug}`
}

function SidebarGroup(props: {
  title: string
  icon: ElementType
  items: SidebarItem[]
  activeSlug: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? true)
  const GroupIcon = props.icon

  return (
    <div>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className='flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xl font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900'
      >
        {open ? (
          <ChevronDown className='size-4 text-slate-400' />
        ) : (
          <ChevronRight className='size-4 text-slate-400' />
        )}
        <GroupIcon className='size-5' />
        <span className='min-w-0 flex-1 truncate'>{props.title}</span>
      </button>

      {open && (
        <div className='mt-1 space-y-1 pl-4'>
          {props.items.map((item) => {
            const Icon = item.icon
            const href = docsSlugToPath(item.slug)
            const active = props.activeSlug === item.slug

            return (
              <Link
                key={item.slug}
                to={href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'flex items-center gap-3 rounded-md bg-blue-100 px-3 py-2 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
                    : 'flex items-center gap-3 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-blue-300'
                }
              >
                <Icon className='size-4 shrink-0' />
                <span className='truncate'>{item.title}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Sidebar(props: { activeSlug: string }) {
  return (
    <aside className='hidden lg:block'>
      <div className='sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto pr-2'>
        <nav className='space-y-4 text-sm'>
          <SidebarGroup
            title='Quick Start'
            icon={Rocket}
            items={quickStartItems}
            activeSlug={props.activeSlug}
            defaultOpen
          />
          <SidebarGroup
            title='CC-Switch ใช้งาน'
            icon={TerminalSquare}
            items={ccSwitchItems}
            activeSlug={props.activeSlug}
            defaultOpen
          />
        </nav>
      </div>
    </aside>
  )
}

function MobileGroup(props: {
  title: string
  icon: ElementType
  items: SidebarItem[]
  activeSlug: string
}) {
  const GroupIcon = props.icon

  return (
    <details className='rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-950'>
      <summary className='flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100'>
        <Menu className='size-4' />
        <GroupIcon className='size-4' />
        {props.title}
      </summary>
      <div className='mt-3 space-y-1'>
        {props.items.map((item) => {
          const Icon = item.icon
          const active = props.activeSlug === item.slug

          return (
            <Link
              key={item.slug}
              to={docsSlugToPath(item.slug)}
              className={
                active
                  ? 'flex items-center gap-2 rounded-md bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700'
                  : 'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600'
              }
            >
              <Icon className='size-4' />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </div>
    </details>
  )
}

function MobileJumpLinks(props: { activeSlug: string }) {
  return (
    <div className='mb-6 space-y-3 lg:hidden'>
      <MobileGroup
        title='Quick Start'
        icon={Rocket}
        items={quickStartItems}
        activeSlug={props.activeSlug}
      />
      <MobileGroup
        title='CC-Switch ใช้งาน'
        icon={TerminalSquare}
        items={ccSwitchItems}
        activeSlug={props.activeSlug}
      />
    </div>
  )
}

function RightToc(props: { items: TocItem[] }) {
  return (
    <aside className='hidden xl:block'>
      <div className='sticky top-24'>
        <div className='mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100'>
          <span>เนื้อหาหน้านี้</span>
          <Printer className='size-4 text-slate-400' />
        </div>
        <nav className='border-l pl-4'>
          {props.items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className='block py-2 text-sm leading-5 text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300'
            >
              {item.title}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function Section(props: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={props.id} className='scroll-mt-24 pt-9'>
      <h2 className='border-b pb-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white'>
        {props.title}
      </h2>
      <div className='mt-5 space-y-4 text-[15px] leading-8 text-slate-700 dark:text-slate-300'>
        {props.children}
      </div>
    </section>
  )
}

function OrderedList(props: { children: ReactNode }) {
  return (
    <ol className='list-decimal space-y-1 pl-5 text-[15px] leading-8 text-slate-700 dark:text-slate-300'>
      {props.children}
    </ol>
  )
}

function ValueBox(props: { children: ReactNode }) {
  return (
    <div className='rounded-md border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-950 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100'>
      {props.children}
    </div>
  )
}

function InlineCode(props: { children: ReactNode }) {
  return (
    <code className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-900 dark:bg-slate-800 dark:text-slate-100'>
      {props.children}
    </code>
  )
}

function CopyValueBox(props: { values: CopyValue[] }) {
  return (
    <div className='mt-4 space-y-2 rounded-lg border bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50'>
      {props.values.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className='grid gap-2 rounded-md bg-white p-3 shadow-sm sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center dark:bg-slate-950'
        >
          <span className='text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400'>
            {item.label}
          </span>
          <code className='min-w-0 overflow-x-auto rounded bg-slate-100 px-2 py-1 font-mono text-sm whitespace-nowrap text-slate-900 dark:bg-slate-800 dark:text-slate-100'>
            {item.value}
          </code>
          <CopyButton
            value={item.value}
            variant='outline'
            size='sm'
            className='h-8 justify-self-start px-2 sm:justify-self-end'
            tooltip='Copy'
            successTooltip='Copied!'
            aria-label={`Copy ${item.label}`}
          />
        </div>
      ))}
    </div>
  )
}

function DocsTable(props: { headers: string[]; rows: string[][] }) {
  return (
    <div className='mt-4 overflow-x-auto rounded-lg border dark:border-slate-800'>
      <table className='min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800'>
        <thead className='bg-slate-50 dark:bg-slate-900/70'>
          <tr>
            {props.headers.map((header) => (
              <th
                key={header}
                scope='col'
                className='px-4 py-3 font-bold whitespace-nowrap text-slate-700 dark:text-slate-200'
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950'>
          {props.rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row[0]}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${rowIndex}-${cellIndex}`}
                  className='px-4 py-3 align-top leading-7 text-slate-700 dark:text-slate-300'
                >
                  {cell.startsWith('/') || cell.includes(': ') ? (
                    <code className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-900 dark:bg-slate-800 dark:text-slate-100'>
                      {cell}
                    </code>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodeBlock(props: { label: string; value: string }) {
  return (
    <div className='mt-4 overflow-hidden rounded-lg border bg-slate-950 shadow-sm dark:border-slate-800'>
      <div className='flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3'>
        <span className='text-xs font-bold tracking-wide text-slate-300 uppercase'>
          {props.label}
        </span>
        <CopyButton
          value={props.value}
          variant='outline'
          size='sm'
          className='h-8 border-white/20 bg-white/10 px-2 text-white hover:bg-white/20'
          tooltip='Copy'
          successTooltip='Copied!'
          aria-label={`Copy ${props.label}`}
        />
      </div>
      <pre className='max-h-[720px] overflow-auto p-5 text-sm leading-7 text-slate-100 md:text-[15px]'>
        <code>{props.value}</code>
      </pre>
    </div>
  )
}

function NextLink(props: { href: string; label: string }) {
  return (
    <Link
      to={props.href}
      className='mt-8 flex items-center justify-end rounded-md border px-4 py-4 text-right text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10'
    >
      <span>
        อ่านต่อ
        <br />
        <strong>{props.label} →</strong>
      </span>
    </Link>
  )
}

function DocsPageLayout(props: {
  page: DocsPageConfig
  slug: string
  children: ReactNode
}) {
  const Icon = props.page.icon

  return (
    <PublicLayout
      showMainContainer={false}
      siteName='TinyToken'
      logo={
        <img
          src='/tinytoken-logo.jpg'
          alt='TinyToken'
          className='size-full rounded-lg object-cover'
        />
      }
      navContent={<TinyTokenHeaderActions />}
      headerProps={{ mobileLinks: tinyTokenHeaderMobileLinks }}
    >
      <main className='min-h-svh bg-white pt-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
        <div className='border-b bg-white/95 backdrop-blur dark:bg-slate-950/95'>
          <div className='mx-auto flex h-14 max-w-[1480px] items-center gap-2 px-4 text-sm text-slate-500 md:px-6'>
            <Home className='size-4 text-blue-700' />
            <Link to='/' className='text-blue-700 hover:underline'>
              หน้าแรก
            </Link>
            <span>/</span>
            <Link
              to='/docs/$slug'
              params={{ slug: 'register' }}
              className='font-semibold text-blue-700 hover:underline'
            >
              Docs
            </Link>
            <span>/</span>
            <span className='text-blue-700'>{props.page.groupTitle}</span>
            <span>/</span>
            <span className='truncate text-slate-600 dark:text-slate-300'>
              {props.page.title}
            </span>
          </div>
        </div>

        <div className='mx-auto grid max-w-[1480px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[280px_minmax(0,840px)] xl:grid-cols-[280px_minmax(0,840px)_220px]'>
          <Sidebar activeSlug={props.slug} />

          <article className='min-w-0'>
            <MobileJumpLinks activeSlug={props.slug} />

            <header className='pb-5'>
              <h1 className='flex items-center gap-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl dark:text-white'>
                <Icon className='size-9 text-blue-700 md:size-10' />
                {props.page.title}
              </h1>

              <div className='mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400'>
                <span className='inline-flex items-center gap-2'>
                  <Icon className='size-4' />
                  TinyToken Team
                </span>
                <span className='inline-flex items-center gap-2'>
                  <CalendarDays className='size-4' />
                  {props.page.date}
                </span>
                <span className='inline-flex items-center gap-2'>
                  <Clock3 className='size-4' />
                  {props.page.readTime}
                </span>
              </div>

              <hr className='mt-6' />

              <p className='mt-6 text-base leading-8 text-slate-700 dark:text-slate-300'>
                {props.page.intro}
              </p>

              {props.page.heroLink && (
                <p className='mt-3 text-base leading-8 text-slate-700 dark:text-slate-300'>
                  {props.page.heroLink.label}: {''}
                  <a
                    href={props.page.heroLink.href}
                    className='inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline'
                  >
                    {props.page.heroLink.href}
                    <ExternalLink className='size-3.5' />
                  </a>
                </p>
              )}

              {props.page.heroImage && (
                <figure className='mt-5 overflow-hidden rounded-md bg-slate-50 dark:bg-slate-900'>
                  <img
                    src={props.page.heroImage}
                    alt={props.page.title}
                    className='w-full bg-white'
                  />
                </figure>
              )}
            </header>

            <div className='space-y-1'>{props.children}</div>

            <div className='mt-14 flex flex-col items-end gap-1 border-t pt-6 text-sm text-slate-500 dark:text-slate-400'>
              <span>อัปเดตล่าสุด: {props.page.date}</span>
              <span>ผู้เขียน: TinyToken Team</span>
            </div>

            {props.page.next && (
              <NextLink href={props.page.next.href} label={props.page.next.label} />
            )}
          </article>

          <RightToc items={props.page.toc} />
        </div>
      </main>
      <Footer />
    </PublicLayout>
  )
}

function PageNotFound(props: { slug: string }) {
  return (
    <PublicLayout
      showMainContainer={false}
      siteName='TinyToken'
      logo={
        <img
          src='/tinytoken-logo.jpg'
          alt='TinyToken'
          className='size-full rounded-lg object-cover'
        />
      }
      navContent={<TinyTokenHeaderActions />}
      headerProps={{ mobileLinks: tinyTokenHeaderMobileLinks }}
    >
      <main className='min-h-svh bg-white pt-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
        <div className='mx-auto max-w-3xl px-4 py-16 md:px-6'>
          <h1 className='text-3xl font-bold'>ไม่พบหน้า docs นี้</h1>
          <p className='mt-4 text-slate-600 dark:text-slate-300'>
            slug: <InlineCode>{props.slug}</InlineCode>
          </p>
          <Link
            to='/docs/$slug'
            params={{ slug: 'register' }}
            className='mt-6 inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-600'
          >
            กลับไปหน้า Register
            <ArrowRight className='size-4' />
          </Link>
        </div>
      </main>
      <Footer />
    </PublicLayout>
  )
}

export function DocsTopicPage(props: { slug: string }) {
  const page = docsPageRegistry[props.slug]

  if (!page) {
    return <PageNotFound slug={props.slug} />
  }

  return (
    <DocsPageLayout page={page} slug={props.slug}>
      {page.render()}
    </DocsPageLayout>
  )
}
