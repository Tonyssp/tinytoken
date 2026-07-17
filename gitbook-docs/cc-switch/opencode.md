# OpenCode ตั้งค่า

**CC-Switch ใช้งาน** · 2026/6/12 · อ่านประมาณ 5 นาที

คู่มือภาษาไทยสำหรับตั้งค่า OpenCode ให้เรียกใช้โมเดลผ่าน TinyAPI ด้วย OpenAI-compatible endpoint

## ก่อนเริ่ม

OpenCode เป็น coding agent ที่ใช้งานผ่าน Terminal และสามารถต่อกับ provider ที่เป็น OpenAI-compatible ได้ คู่มือนี้จะใช้ TinyAPI เป็น provider ชื่อ `tinyapi`

>

ถ้าจะใช้โมเดล Gemini ใน OpenCode แนะนำให้ลองผ่านรูปแบบ Chat / OpenAI-compatible ก่อน เพราะบางเครื่องมืออาจไม่รองรับ Gemini native format ครบทุกพารามิเตอร์

![OpenCode logo](../.gitbook/assets/opencode-logo.png)

## ติดตั้ง OpenCode

วิธีติดตั้งจากเอกสารทางการที่ใช้ได้กับ MacOS / Linux คือ install script ด้านล่าง หลังติดตั้งเสร็จให้ตรวจเวอร์ชันด้วย `opencode --version`

**MacOS / Linux**

```
curl -fsSL https://opencode.ai/install | bash
```

**ตรวจเวอร์ชัน**

```
opencode --version
```

ถ้าเครื่องของคุณใช้ Node.js อยู่แล้ว สามารถติดตั้งผ่าน package manager ได้เช่นกัน โดยใช้แพ็กเกจ `opencode-ai`

**npm**

```
npm install -g opencode-ai
```

**pnpm**

```
pnpm install -g opencode-ai
```

## เชื่อมต่อ Provider ID

เปิด Terminal ในโฟลเดอร์โปรเจกต์ แล้วเข้า OpenCode ด้วยคำสั่ง `opencode` จากนั้นใช้คำสั่ง `/connect` เพื่อเพิ่ม provider ใหม่

**เข้าโฟลเดอร์งาน**

```
cd path/to/your-project
```

**เปิด OpenCode**

```
opencode
```

**เพิ่ม provider**

```
/connect
```

* เลือก provider ประเภท custom / other หรือ OpenAI-compatible ถ้ามีให้เลือก
* ตั้ง Provider ID เป็น `tinyapi`
* วาง API Key จากหน้า `https://tinyapi.org/keys` โดยคีย์ต้องขึ้นต้นด้วย `sk-`

>

Provider ID ที่ตั้งใน `/connect` ต้องตรงกับชื่อ key ในไฟล์ `opencode.json` แบบตัวพิมพ์เล็ก/ใหญ่ตรงกัน ตัวอย่างนี้ใช้ `tinyapi`

## สร้างไฟล์ opencode.json

OpenCode อ่าน config จากไฟล์ `opencode.json` ให้สร้างหรือแก้ไฟล์ ตาม path ของระบบที่ใช้งาน

**Windows**

```
%USERPROFILE%\\.config\\opencode\\opencode.json
```

**MacOS / Linux**

```
~/.config/opencode/opencode.json
```

**เปิดด้วย VS Code**

```
code ~/.config/opencode/opencode.json
```

## ตัวอย่าง config สำหรับ TinyAPI

ใช้ `@ai-sdk/openai-compatible` สำหรับ endpoint แบบ `/v1/chat/completions` และตั้ง `baseURL` เป็น `https://api.tinyapi.org/v1`

**opencode.json**

```json
{
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
}
```

## เปิดใช้และทดสอบโมเดล

* บันทึกไฟล์ `opencode.json`
* ปิด Terminal ที่เปิด OpenCode อยู่ แล้วเปิดใหม่
* เข้าโฟลเดอร์โปรเจกต์และรัน `opencode`
* พิมพ์ `/models` แล้วเลือก provider `TinyAPI`
* เลือกโมเดลที่ใส่ไว้ใน config แล้วลองถามข้อความสั้น ๆ

**เปิด OpenCode**

```
opencode
```

**เลือกโมเดล**

```
/models
```

**ข้อความทดสอบ**

```
ตอบกลับคำว่า TinyAPI OK เท่านั้น
```

## เช็กปัญหาที่พบบ่อย

* เช็กว่า Provider ID ใน `/connect` และ `opencode.json` ตรงกัน เช่น `tinyapi`
* เช็กว่า `baseURL` เป็น `https://api.tinyapi.org/v1`
* เช็กว่า API Key จากหน้า `https://tinyapi.org/keys` ยังใช้งานได้และมียอดคงเหลือ
* เช็กชื่อโมเดลใน `models` ว่าตรงกับชื่อในหน้า Pricing หรือ All AI Model ทุกตัวอักษร
* ถ้าแก้ config แล้วไม่เห็นโมเดล ให้ปิด Terminal ทั้งหมดแล้วเปิด OpenCode ใหม่
