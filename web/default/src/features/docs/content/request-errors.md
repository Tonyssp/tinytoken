# ข้อผิดพลาดจากการเรียก API

เมื่อเรียกใช้งาน TinyAPI แล้วคำขอไม่สำเร็จ ระบบจะส่ง HTTP status code พร้อมรายละเอียดข้อผิดพลาดกลับมา โดยรูปแบบคำตอบส่วนใหญ่เข้ากันได้กับ OpenAI API

> API Endpoint: `https://api.tinyapi.org`

## รูปแบบ Error Response

ตัวอย่างคำตอบแบบ OpenAI-compatible:

```json
{
  "error": {
    "message": "รายละเอียดข้อผิดพลาด",
    "type": "new_api_error",
    "param": "",
    "code": "invalid_request"
  }
}
```

บางข้อผิดพลาดอาจไม่มี `param` หรือ `code` และข้อความอาจมี Request ID ต่อท้าย เพื่อให้ผู้ดูแลระบบตรวจสอบรายการเรียกใช้งานได้

ตัวอย่างคำตอบจาก Claude Messages API:

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request",
    "message": "รายละเอียดข้อผิดพลาด"
  }
}
```

## HTTP Status Code ที่พบบ่อย

| Status | Error code / ประเภท | สาเหตุที่พบบ่อย | วิธีแก้ |
| --- | --- | --- | --- |
| `400 Bad Request` | `invalid_request` | JSON ไม่ถูกต้อง, ไม่ได้ส่ง `model`, parameter ไม่รองรับ หรือรูปแบบคำขอไม่ตรงกับ endpoint | ตรวจสอบ JSON, ชื่อโมเดล และ endpoint ที่ใช้ |
| `401 Unauthorized` | `new_api_error` | ไม่ได้ส่ง API Key, API Key ไม่ถูกต้อง, ถูกลบ หรือหมดอายุ | สร้างหรือตรวจสอบ API Key ที่หน้า [API Keys](https://tinyapi.org/keys) และส่ง `Authorization: Bearer sk-...` |
| `403 Forbidden` | `insufficient_user_quota` | เครดิตคงเหลือไม่เพียงพอ หรือโควตาของ API Key ไม่เพียงพอ | เติมเครดิตที่หน้า [กระเป๋าเงิน](https://tinyapi.org/wallet) หรือตรวจสอบโควตาของ API Key |
| `403 Forbidden` | `access_denied` | IP ปัจจุบันไม่อยู่ในรายการที่ API Key อนุญาต | แก้ไขการจำกัด IP ของ API Key หรือเรียกจาก IP ที่อนุญาต |
| `403 Forbidden` | `new_api_error` | API Key ไม่มีสิทธิ์ใช้โมเดลหรือกลุ่มที่เลือก, บัญชีถูกปิดใช้งาน หรือ channel ถูกปิด | ตรวจสอบสิทธิ์โมเดลของ API Key หรือแจ้งผู้ดูแลระบบ |
| `404 Not Found` | `invalid_request_error` | URL หรือ path ไม่ถูกต้อง | ตรวจสอบ Base URL และ path เช่น `/v1/chat/completions`, `/v1/responses` หรือ `/v1/messages` |
| `413 Content Too Large` | `read_request_body_failed` | request body, ไฟล์ หรือข้อมูลหลังแตกการบีบอัดมีขนาดเกินที่ระบบกำหนด | ลดขนาดไฟล์ รูปภาพ หรือ request body แล้วลองใหม่ |
| `429 Too Many Requests` | `new_api_error` หรือ `rate_limit_error` | ส่งคำขอถี่เกินไป หรือถึงขีดจำกัดที่กำหนดสำหรับผู้ใช้ กลุ่ม หรือ IP | รอแล้วลองใหม่ ใช้ exponential backoff และลดจำนวนคำขอพร้อมกัน |
| `500 Internal Server Error` | `new_api_error` | ระบบภายในตรวจสอบ rate limit, ฐานข้อมูล หรือประมวลผลคำขอไม่สำเร็จ | ลองใหม่ภายหลัง หากยังเกิดซ้ำให้ส่ง Request ID ให้ผู้ดูแลระบบ |
| `501 Not Implemented` | `api_not_implemented` | endpoint นี้ยังไม่รองรับ | เปลี่ยนไปใช้ endpoint ที่รองรับในเอกสาร TinyAPI |
| `503 Service Unavailable` | `model_not_found` | ไม่พบ channel ที่พร้อมใช้งานสำหรับโมเดลและกลุ่มที่เลือก หรือ upstream ไม่พร้อมให้บริการ | ตรวจสอบชื่อโมเดล ลองใหม่ภายหลัง หรือเลือกโมเดลอื่น |

> Status code จาก upstream provider อาจถูกส่งกลับมาตามเดิม หรือถูกแปลงตามการตั้งค่า channel ของระบบ ดังนั้นข้อความใน `error.message` และ `error.code` เป็นข้อมูลสำคัญสำหรับการตรวจสอบปัญหา

## ตัวอย่าง Error: API Key ไม่ถูกต้อง

```json
{
  "error": {
    "message": "Invalid token",
    "type": "new_api_error",
    "code": ""
  }
}
```

ตรวจสอบว่าคำขอมี header ดังนี้:

```http
Authorization: Bearer sk-xxxxxxxxxxxxxxxx
Content-Type: application/json
```

## ตัวอย่าง Error: เครดิตไม่เพียงพอ

```json
{
  "error": {
    "message": "เครดิตของผู้ใช้ไม่เพียงพอ",
    "type": "new_api_error",
    "param": "",
    "code": "insufficient_user_quota"
  }
}
```

เมื่อพบ error นี้ ให้ตรวจสอบเครดิตคงเหลือและโควตาของ API Key ก่อนส่งคำขอใหม่

## ตัวอย่าง Error: ไม่พบโมเดลที่พร้อมใช้งาน

```json
{
  "error": {
    "message": "ไม่พบ channel ที่พร้อมใช้งานสำหรับโมเดลนี้",
    "type": "new_api_error",
    "code": "model_not_found"
  }
}
```

ตรวจสอบชื่อโมเดลให้ตรงกับหน้า All AI Model และตรวจสอบว่า API Key มีสิทธิ์ใช้โมเดลนั้น

## Rate Limit

TinyAPI มีระบบจำกัดจำนวนคำขอเพื่อป้องกันการใช้งานผิดปกติและรักษาเสถียรภาพของบริการ โดยอาจจำกัดตาม:

- IP address
- ผู้ใช้
- กลุ่มผู้ใช้
- จำนวนคำขอที่สำเร็จ
- จำนวนคำขอทั้งหมด รวมคำขอที่ล้มเหลว
- ข้อจำกัดของ upstream provider แต่ละราย

ค่า rate limit สามารถเปลี่ยนได้ตามการตั้งค่าระบบ แพ็กเกจ หรือโมเดลที่เลือก จึงไม่ควรใช้ตัวเลขคงที่ในโปรแกรม

เมื่อได้รับ `429 Too Many Requests`:

1. หยุดส่งคำขอชั่วคราว
2. รอระยะหนึ่งก่อนลองใหม่
3. ใช้ exponential backoff เช่น `1`, `2`, `4`, `8` วินาที
4. ลดจำนวน parallel หรือ concurrent requests
5. หลีกเลี่ยงการ retry ทันทีแบบวนซ้ำ

ตัวอย่าง JavaScript:

```js
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

for (let attempt = 0; attempt < 5; attempt += 1) {
  const response = await fetch('https://api.tinyapi.org/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer sk-xxxxxxxxxxxxxxxx',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'ชื่อโมเดล',
      messages: [{ role: 'user', content: 'สวัสดี' }],
    }),
  })

  if (response.status !== 429) {
    console.log(await response.json())
    break
  }

  await delay(1000 * 2 ** attempt)
}
```

## วิธีส่งข้อมูลให้ผู้ดูแลระบบตรวจสอบ

หากลองแก้ตามคำแนะนำแล้วยังใช้งานไม่ได้ ให้ส่งข้อมูลต่อไปนี้:

- วันและเวลาที่เกิดปัญหา
- Endpoint ที่เรียก โดยไม่ส่ง API Key
- ชื่อโมเดล
- HTTP status code
- `error.message`
- `error.code`
- Request ID ที่แสดงในข้อความ error

> ห้ามส่ง API Key แบบเต็มให้บุคคลอื่น หากจำเป็นให้แสดงเฉพาะช่วงต้นและท้าย เช่น `sk-abcd...wxyz`
