# (8) รายการโมเดล

## รายการโมเดล

**Quick Start** · 2026/6/13 · อ่านประมาณ 3 นาที

ดึงรายชื่อโมเดลที่ API Key ของคุณสามารถใช้งานได้จริง พร้อมประเภท endpoint ที่รองรับในแต่ละโมเดล

## Endpoint

ใช้ endpoint นี้เพื่อดึงรายการโมเดลตามกลุ่ม สิทธิ์ และข้อจำกัดของ API Key
ที่ส่งมากับคำขอ

**Method**

```
GET
```

**Endpoint**

```
${apiUrl
```

**Authorization**

```
Authorization: Bearer sk-YOUR_API_KEY
```

## ตัวอย่างคำสั่ง

**cURL**

```bash
curl https://api.tinyapi.org/v1/models \\
  -H "Authorization: Bearer sk-YOUR_API_KEY"
```
**Example response**

```json
{
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
}
```

## อ่านผลลัพธ์

| FIELD | DESCRIPTION |
| --- | --- |
| id | ชื่อ Model ID ที่ต้องนำไปใส่ใน field model ตอนเรียก API |
| object | ประเภทข้อมูล โดยรายการโมเดลจะเป็น model |
| owned_by | แหล่งที่มาหรือประเภทเจ้าของข้อมูลโมเดลในระบบ |
| supported_endpoint_types | รายการ protocol หรือ endpoint ที่โมเดลนี้รองรับ |

>
ให้คัดลอกค่า `id` ไปวางใน field
`model` แบบตรงทุกตัวอักษร อย่าใช้ชื่อที่คาดเดาเอง

## ประเภท endpoint

| VALUE | ENDPOINT ที่เกี่ยวข้อง |
| --- | --- |
| openai | /v1/chat/completions |
| openai-response | /v1/responses |
| openai-response-compact | /v1/responses/compact |
| anthropic | /v1/messages |
| image-generation | /v1/images/generations |
| embeddings | /v1/embeddings |

โมเดลหนึ่งตัวอาจรองรับมากกว่าหนึ่งประเภท หากไม่เห็นประเภทที่ต้องการ
ให้เลือกโมเดลอื่นหรือดูรายละเอียดจากหน้า All AI Model
