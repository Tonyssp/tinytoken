# (10) OpenAI-compatible chat

## OpenAI-compatible chat (GPT)

**Quick Start** · 2026/6/13 · อ่านประมาณ 5 นาที

เรียกโมเดลแชตผ่าน OpenAI Chat Completions format ซึ่งเป็นรูปแบบที่เครื่องมือส่วนใหญ่รองรับ

## Endpoint และ Header

**Method**

```
POST
```

**Endpoint**

```
${apiUrl
```

**Authorization**

```
Authorization: Bearer sk-YOUR_API_KEY
```

**Content-Type**

```
application/json
```

## Parameters หลัก

| PARAMETER | REQUIRED | DESCRIPTION |
| --- | --- | --- |
| model | ใช่ | Model ID ที่รองรับ openai จาก /v1/models |
| messages | ใช่ | ประวัติสนทนา เช่น system, user และ assistant |
| stream | ไม่ | true เพื่อรับคำตอบแบบ SSE ทีละส่วน |
| max_tokens | ไม่ | จำนวน output token สูงสุด |
| temperature | ไม่ | ควบคุมความสุ่มของคำตอบ |
| top_p | ไม่ | ควบคุมการสุ่มแบบ nucleus sampling |
| response_format | ไม่ | กำหนดรูปแบบคำตอบ เช่น JSON เมื่อโมเดลรองรับ |
| tools | ไม่ | รายการ function หรือ tools ที่โมเดลสามารถเลือกเรียก |
| tool_choice | ไม่ | กำหนดว่าจะให้โมเดลเลือก tool แบบใด |
| reasoning_effort | ไม่ | ระดับ reasoning สำหรับโมเดลที่รองรับ |

## Non-streaming

**cURL**

```bash
curl https://api.tinyapi.org/v1/chat/completions \\
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
  }'
```
**Example response**

```json
{
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
}
```

## Streaming

เมื่อใช้ `stream: true` ระบบจะส่ง
`chat.completion.chunk` หลายชุดและปิดท้าย stream
ตามรูปแบบที่ upstream รองรับ

**cURL streaming**

```bash
curl https://api.tinyapi.org/v1/chat/completions \\
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
  }'
```

## ข้อควรรู้

- Endpoint นี้ใช้ได้กับทุกโมเดลที่ประกาศ
`openai` ไม่จำเป็นต้องเป็นโมเดลจาก OpenAI เท่านั้น
- Parameter ขั้นสูงอาจไม่รองรับทุกโมเดล ให้ดู Supported parameters
ในหน้า All AI Model ก่อนใช้งาน
- สำหรับ SDK ให้ตั้ง Base URL เป็น `https://api.tinyapi.org/v1`
