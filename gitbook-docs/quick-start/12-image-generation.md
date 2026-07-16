# (12) Image Generation

## Image Generation

**Quick Start** · 2026/6/13 · อ่านประมาณ 5 นาที

สร้างรูปภาพผ่าน OpenAI Images API-compatible endpoint โดยเลือกโมเดลสร้างภาพที่เปิดใช้งานใน TinyAPI

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
| model | ใช่ | Model ID ที่รองรับ image-generation |
| prompt | ใช่ | รายละเอียดรูปภาพที่ต้องการสร้าง |
| n | ไม่ | จำนวนรูปที่ต้องการ ค่าที่รองรับขึ้นกับโมเดลและ upstream |
| size | ไม่ | ขนาดรูป เช่น 1024x1024 เมื่อโมเดลรองรับ |
| quality | ไม่ | คุณภาพรูป เช่น standard หรือ hd เมื่อรองรับ |
| response_format | ไม่ | url หรือ b64_json ตามความสามารถของ provider |
| style | ไม่ | รูปแบบภาพสำหรับโมเดลที่รองรับ parameter นี้ |
| user | ไม่ | รหัสผู้ใช้ปลายทางสำหรับระบบของ client |

## ตัวอย่างสร้างภาพ

            เปลี่ยน `ชื่อโมเดลสร้างภาพ` เป็น Model ID ที่มี
            `image-generation` ในรายการ endpoint ที่รองรับ

          **cURL**

```bash
curl https://api.tinyapi.org/v1/images/generations \\
  -H "Authorization: Bearer sk-YOUR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-image-model-id",
    "prompt": "A clean product photo of a black coffee mug on a white desk with studio lighting.",
    "n": 1,
    "size": "1024x1024",
    "response_format": "url"
  }'
```

## รูปแบบผลลัพธ์

            เมื่อใช้ `response_format: url`
            ผู้ให้บริการที่รองรับจะคืน URL ของรูปภาพ

          **Example response**

```json
{
  "created": 1780591766,
  "data": [
    {
      "url": "https://example.com/generated-image.png",
      "revised_prompt": ""
    }
  ]
}
```

            ถ้าเลือก `b64_json` และโมเดลรองรับ
            ผลลัพธ์จะอยู่ใน field `data[0].b64_json`
            ซึ่งต้องนำไป decode และบันทึกเป็นไฟล์รูปภาพ

## ข้อควรรู้

            - API Key ต้องมีสิทธิ์ใช้โมเดลสร้างภาพ หากเปิด Model limits ไว้
              ต้องเพิ่มโมเดลนั้นเข้าไปในคีย์ด้วย
            - ขนาด จำนวนรูป คุณภาพ และ response format ที่รองรับแตกต่างกันตาม provider
              ให้ดูรายละเอียดของโมเดลก่อนใช้งาน
            - การแก้ไขภาพใช้ endpoint `/v1/images/edits`
              ซึ่งเป็นคนละรูปแบบคำขอกับการสร้างภาพใหม่
            - ถ้าได้ error `model_not_found`
              ให้ตรวจว่าเลือกโมเดลที่รองรับ image-generation และสะกดชื่อถูกต้อง
