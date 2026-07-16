# (11) OpenAI Responses API

## OpenAI Responses API

**Quick Start** · 2026/6/13 · อ่านประมาณ 5 นาที

ใช้งาน Responses API สำหรับ structured input, reasoning, tools และโปรแกรมอย่าง Codex ที่เลือก wire API แบบ responses

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
| model | ใช่ | Model ID ที่รองรับ openai-response |
| input | ใช่ | ข้อความหรือ array ของ input message/content |
| instructions | ไม่ | คำสั่งหลักที่ใช้กำหนดแนวทางการตอบ |
| stream | ไม่ | true เพื่อรับ Responses events แบบ SSE |
| store | ไม่ | กำหนดว่าฝั่ง upstream สามารถจัดเก็บ response หรือไม่ |
| reasoning | ไม่ | ตั้งค่า reasoning เช่น effort และ summary |
| tools | ไม่ | รายการ tools สำหรับโมเดลที่รองรับ |
| tool_choice | ไม่ | กำหนดการเลือก tool |
| max_output_tokens | ไม่ | จำนวน output token สูงสุด |
| previous_response_id | ไม่ | เชื่อมคำขอกับ response ก่อนหน้าเมื่อรองรับ |

## คำขอทั่วไป

ตัวอย่างนี้ใช้ input แบบข้อความสั้น หาก upstream ของโมเดลกำหนดรูปแบบเฉพาะ
ให้เปลี่ยนเป็น structured input แบบตัวอย่างในส่วน Streaming

**cURL**

```bash
curl https://api.tinyapi.org/v1/responses \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-responses-model-id",
    "instructions": "Answer briefly.",
    "input": "Explain one benefit of AI.",
    "store": false
  }'
```

## Streaming

รูปแบบ structured input เหมาะกับ Codex และโมเดล reasoning
ข้อมูลจะถูกส่งเป็น event เช่น output item, text delta และ response completed

**cURL streaming**

```bash
curl https://api.tinyapi.org/v1/responses \\
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
  }'
```

## ข้อควรรู้

- เลือกโมเดลที่มี `openai-response` ในรายการ endpoint
ที่รองรับ
- บาง upstream รองรับเฉพาะ streaming หรือกำหนด input เป็น structured array
หากคำขอแบบสั้นไม่ผ่าน ให้ใช้ตัวอย่าง Streaming
- TinyAPI มี `/v1/responses/compact`
สำหรับ client ที่ต้องการ Responses compaction และต้องใช้โมเดลที่รองรับ
- หากใช้ Codex ให้กำหนด Base URL ตามคู่มือ Codex/CC-Switch
เพราะโปรแกรมอาจเติม path ให้เอง
