# (9) Anthropic-compatible chat

## Anthropic-compatible chat (Claude)

**Quick Start** · 2026/6/13 · อ่านประมาณ 5 นาที

เรียกใช้งานโมเดล Claude ผ่านรูปแบบ Anthropic Messages API ด้วย endpoint ของ TinyAPI

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

**Anthropic version**

```
anthropic-version: 2023-06-01
```

**Content-Type**

```
application/json
```

>
            `anthropic-version: 2023-06-01` คือเวอร์ชัน protocol
            ของ Anthropic Messages API ไม่ใช่ปีของโมเดล และไม่ควรเปลี่ยนเอง

## Parameters หลัก

          | PARAMETER | REQUIRED | DESCRIPTION |
| --- | --- | --- |
| model | ใช่ | Model ID ที่รองรับ anthropic จาก /v1/models |
| messages | ใช่ | รายการข้อความสนทนา role และ content |
| max_tokens | แนะนำ | จำนวน output token สูงสุดที่อนุญาตให้โมเดลตอบ |
| system | ไม่ | คำสั่งหลักหรือบทบาทของโมเดล |
| stream | ไม่ | true เพื่อรับผลลัพธ์แบบ SSE ทีละส่วน |
| temperature | ไม่ | ควบคุมระดับความสุ่มของคำตอบ |
| tools | ไม่ | รายการเครื่องมือสำหรับ tool use หากโมเดลและ upstream รองรับ |
| thinking | ไม่ | การตั้งค่า reasoning สำหรับโมเดลที่รองรับ |

## Non-streaming

            เปลี่ยน `ชื่อโมเดล-Claude` เป็น Model ID จริงจากหน้า
            รายการโมเดล

          **cURL**

```bash
curl https://api.tinyapi.org/v1/messages \\
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
  }'
```
          **Example response**

```json
{
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
}
```

## Streaming

            เมื่อกำหนด `stream: true` ระบบจะส่งข้อมูลแบบ SSE
            ต่อเนื่อง เหมาะกับแชตหรือ Claude Code ที่ต้องแสดงข้อความระหว่างสร้างคำตอบ

          **cURL streaming**

```bash
curl https://api.tinyapi.org/v1/messages \\
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
  }'
```

## ข้อควรรู้

            - เลือกโมเดลที่มี `anthropic` ใน
              `supported_endpoint_types`
            - สามารถใช้ `x-api-key: sk-...` แทน Authorization
              กับ endpoint นี้ได้ แต่ตัวอย่างของ TinyAPI ใช้ Authorization เพื่อให้จำง่าย
            - ความสามารถ tools, thinking, cache และ parameter ขั้นสูงขึ้นกับโมเดลและ upstream
              ที่ให้บริการโมเดลนั้น
