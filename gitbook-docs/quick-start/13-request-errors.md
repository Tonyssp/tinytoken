# (13) Error Response Rate Limit

## Error Response Rate Limit

**Quick Start** · 2026/6/13 · อ่านประมาณ 5 นาที

รวมรูปแบบ Error Response, HTTP status code, วิธีแก้ปัญหา และข้อจำกัดการเรียก API ที่ TinyAPI รองรับจริง

## รูปแบบ Error Response

เมื่อคำขอไม่สำเร็จ TinyAPI จะส่ง HTTP status code พร้อมรายละเอียดข้อผิดพลาดกลับมา
รูปแบบคำตอบส่วนใหญ่เข้ากันได้กับ OpenAI API และอาจมี Request ID
ต่อท้ายข้อความเพื่อใช้ตรวจสอบรายการเรียกใช้งาน

**OpenAI-compatible error**

```bash
{
  "error": {
    "message": "Error details",
    "type": "new_api_error",
    "param": "",
    "code": "invalid_request"
  }
}
```

ถ้าเรียกผ่าน Claude Messages API ที่ `/v1/messages`
รูปแบบคำตอบจะเป็นแบบ Claude native

**Claude native error**

```bash
{
  "type": "error",
  "error": {
    "type": "invalid_request",
    "message": "Error details"
  }
}
```

## HTTP Status Code ที่พบบ่อย

| STATUS | ERROR CODE / TYPE | สาเหตุและวิธีแก้ |
| --- | --- | --- |
| 400 Bad Request | invalid_request | JSON ไม่ถูกต้อง, ไม่ได้ส่ง model, parameter ไม่รองรับ หรือใช้รูปแบบคำขอไม่ตรงกับ endpoint ให้ตรวจ JSON ชื่อโมเดล และ path |
| 401 Unauthorized | new_api_error | ไม่ได้ส่ง API Key หรือคีย์ไม่ถูกต้อง ถูกลบ หรือหมดอายุ ให้ใช้ Authorization: Bearer sk-... |
| 403 Forbidden | insufficient_user_quota | เครดิตคงเหลือหรือโควตาของ API Key ไม่เพียงพอ ให้เติมเครดิตหรือตรวจสอบวงเงินของคีย์ |
| 403 Forbidden | access_denied | IP ปัจจุบันไม่อยู่ในรายการที่ API Key อนุญาต ให้แก้การจำกัด IP หรือเรียกจาก IP ที่อนุญาต |
| 403 Forbidden | new_api_error | API Key ไม่มีสิทธิ์ใช้โมเดลหรือกลุ่มที่เลือก บัญชีหรือ channel อาจถูกปิดใช้งาน |
| 404 Not Found | invalid_request_error | URL หรือ path ไม่ถูกต้อง ให้ตรวจ Base URL และ path เช่น /v1/chat/completions, /v1/responses หรือ /v1/messages |
| 413 Content Too Large | read_request_body_failed | request body หรือไฟล์มีขนาดเกินค่าที่ระบบกำหนด ให้ลดขนาดข้อมูลแล้วลองใหม่ |
| 429 Too Many Requests | new_api_error / rate limit | ส่งคำขอถี่เกินไปหรือถึงข้อจำกัดของผู้ใช้ กลุ่ม IP หรือ upstream ให้รอแล้วลองใหม่และลด parallel requests |
| 500 Internal Server Error | new_api_error | ระบบภายในตรวจสอบฐานข้อมูล rate limit หรือประมวลผลไม่สำเร็จ ให้ลองใหม่และเก็บ Request ID |
| 501 Not Implemented | api_not_implemented | endpoint ที่เรียกยังไม่รองรับ ให้เปลี่ยนไปใช้ endpoint ที่มีในเอกสาร TinyAPI |
| 503 Service Unavailable | model_not_found | ไม่พบ channel ที่พร้อมใช้สำหรับโมเดลและกลุ่มนี้ ให้ตรวจชื่อโมเดล ลองใหม่ภายหลัง หรือเลือกโมเดลอื่น |

>
TinyAPI ใช้ `403 Forbidden` พร้อม code
`insufficient_user_quota` เมื่อเครดิตไม่พอ ไม่ใช่
`402` แบบเว็บไซต์ตัวอย่างบางแห่ง

## ตัวอย่างข้อผิดพลาด

ถ้า API Key ไม่ถูกต้อง ให้ตรวจว่าคีย์ขึ้นต้นด้วย `sk-`
และส่ง header ตามตัวอย่างนี้

**Authorization**

```
Authorization: Bearer sk-xxxxxxxxxxxxxxxx
```

**Content-Type**

```
Content-Type: application/json
```

ถ้า error code เป็น `insufficient_user_quota`
ให้ตรวจเครดิตคงเหลือที่หน้ากระเป๋าเงินและตรวจโควตาของ API Key

ถ้า error code เป็น `model_not_found`
ให้คัดลอกชื่อโมเดลจากหน้า All AI Model ให้ตรงทุกตัวอักษร
และตรวจว่า API Key มีสิทธิ์ใช้โมเดลนั้น

## Rate Limit และข้อจำกัด

TinyAPI มีระบบจำกัดจำนวนคำขอจริง แต่ไม่ได้ใช้ limit แบบเดียวกับเว็บไซต์ในภาพตัวอย่าง
ค่าบางส่วนปรับได้จาก environment และหน้า System Settings
จึงอาจเปลี่ยนตามการตั้งค่าของผู้ดูแลระบบ

| NAME | ค่าปัจจุบัน / ค่าเริ่มต้น | DESCRIPTION |
| --- | --- | --- |
| Global API rate limit | 180 requests / 180 วินาที / IP | เปิดใช้งานเป็นค่าเริ่มต้นและนับตาม IP เมื่อเกินระบบตอบ 429 ผู้ดูแลสามารถเปลี่ยนค่าได้ |
| User / group model rate limit | ยังไม่เปิดใช้งาน | ระบบรองรับการจำกัดจำนวนคำขอทั้งหมดและคำขอที่สำเร็จตามผู้ใช้หรือกลุ่ม เมื่อเปิดใช้จะตอบ 429 เมื่อเกินกำหนด |
| Concurrent streams ต่อ API Key | ไม่มีค่าคงที่ในระบบ | ไม่พบการกำหนด 30 streams ต่อ key แบบภาพตัวอย่าง จำนวนที่ใช้งานได้จริงขึ้นกับ upstream และทรัพยากรของ server |
| Request body | กำหนดด้วย MAX_REQUEST_BODY_MB | เมื่อ request body หลัง decompression ใหญ่เกินค่าที่ตั้งไว้ ระบบตอบ 413 Content Too Large |
| Streaming timeout | 300 วินาที | ระยะเวลารอข้อมูล streaming เริ่มต้น ผู้ดูแลสามารถเปลี่ยนด้วย STREAMING_TIMEOUT |
| API Key quota | กำหนดแยกต่อคีย์ได้ | ถ้าคีย์หรือบัญชีมีเครดิตไม่พอ ระบบตอบ 403 พร้อม code insufficient_user_quota |
| IP restriction | ไม่บังคับ หากไม่ได้ตั้งค่า | ถ้ากำหนด IP ให้ API Key คำขอจาก IP อื่นจะตอบ 403 access_denied |

>
TinyAPI ไม่มี endpoint `/v1/me` หรือ
`/v1/usage` แบบในภาพตัวอย่าง และไม่ควรนำตัวเลข Rate Limit
ของเว็บไซต์อื่นมาใช้กับ TinyAPI

## วิธีจัดการ Error 429

- หยุดส่งคำขอชั่วคราวและรอก่อนลองใหม่
- ใช้ exponential backoff เช่น `1, 2, 4, 8` วินาที
- ลดจำนวน parallel หรือ concurrent requests
- หลีกเลี่ยงการ retry ทันทีแบบวนซ้ำ เพราะจะทำให้ถูกจำกัดนานขึ้น

**JavaScript retry example**

```js
const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms))

for (let attempt = 0; attempt < 5; attempt += 1) {
  const res = await fetch('https://api.tinyapi.org/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer sk-...',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    }),
  })

  if (res.status !== 429) {
    break
  }

  await delay(1000 * 2 ** attempt)
}
```

## ส่งข้อมูลให้ Admin ตรวจสอบ

ถ้าปัญหายังเกิดซ้ำ ให้ส่งข้อมูลเหล่านี้ให้ Admin:

- HTTP status code
- error code หรือ type
- Request ID ถ้ามี
- endpoint ที่เรียก
- ชื่อโมเดล
- เวลาโดยประมาณที่เกิดปัญหา

ห้ามส่ง API Key แบบเต็มให้บุคคลอื่น หากจำเป็นให้แสดงเฉพาะต้นและท้าย เช่น `sk-abcd...wxyz`
