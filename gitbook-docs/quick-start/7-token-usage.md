# (7) ข้อมูลเครดิตคงเหลือ

## ข้อมูล API Key และเครดิตคงเหลือ

**Quick Start** · 2026/6/13 · อ่านประมาณ 3 นาที

ตรวจสอบชื่อ API Key, เครดิตทั้งหมด, เครดิตที่ใช้ไป, เครดิตคงเหลือ, วันหมดอายุ และสิทธิ์โมเดลของคีย์ที่ใช้เรียก

## Endpoint

TinyAPI ใช้ endpoint ด้านล่างสำหรับตรวจข้อมูลและเครดิตของ API Key โดยตรง
คำขอนี้ใช้ API Key ที่ขึ้นต้นด้วย `sk-`

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

>
Endpoint นี้เป็นของ TinyAPI โดยเฉพาะ จึงใช้ path
`/api/usage/token` ไม่ใช่
`/v1/me` หรือ `/v1/usage`

## ตัวอย่างคำสั่ง

เปิด Command Prompt, PowerShell หรือ Terminal แล้วแทนที่
`sk-YOUR_API_KEY` ด้วยคีย์ของคุณ

**cURL**

```bash
curl https://api.tinyapi.org/api/usage/token \\
  -H "Authorization: Bearer sk-YOUR_API_KEY"
```
**Example response**

```json
{
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
}
```

## ข้อมูลที่ได้รับ

| FIELD | TYPE | DESCRIPTION |
| --- | --- | --- |
| name | string | ชื่อ API Key ที่กำหนดไว้ตอนสร้างคีย์ |
| total_granted | number | เครดิตหรือโควตารวมของ API Key ก่อนหักการใช้งาน |
| total_used | number | เครดิตหรือโควตาที่ API Key ใช้ไปแล้ว |
| total_available | number | เครดิตหรือโควตาคงเหลือของ API Key |
| unlimited_quota | boolean | true หมายถึง API Key ไม่ได้จำกัดโควตาแยกจากบัญชี |
| model_limits_enabled | boolean | แสดงว่า API Key เปิดการจำกัดรายชื่อโมเดลหรือไม่ |
| model_limits | object | รายชื่อโมเดลที่คีย์ได้รับอนุญาต เมื่อเปิดการจำกัดโมเดล |
| expires_at | number | เวลา Unix ที่ API Key หมดอายุ ค่า 0 หมายถึงไม่มีวันหมดอายุ |

## ข้อควรรู้

- ค่าเครดิตจาก endpoint นี้เป็นหน่วยโควตาภายในของ TinyAPI
การแสดงเป็นเงินหรือเครดิตบนหน้าเว็บขึ้นกับการตั้งค่าของระบบ
- Endpoint นี้แสดงข้อมูลของ API Key แต่ไม่ส่งอีเมลหรือข้อมูลส่วนตัวของเจ้าของบัญชี
- ถ้าต้องการดูยอดในรูปแบบหน้าเว็บ ให้เปิดหน้า

กระเป๋าเงิน
- แม้คีย์หมดเครดิตหรือหมดอายุ endpoint แบบอ่านอย่างเดียวนี้ยังใช้ตรวจข้อมูลคีย์ได้
