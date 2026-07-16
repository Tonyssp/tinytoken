# (6) โมเดลเข้ากันได้

## คำนำ: โมเดลเข้ากันได้

**Quick Start** · 2026/6/12 · อ่านประมาณ 3 นาที

อ่านหน้านี้ก่อนนำ API Key ไปใช้กับโปรแกรมอื่น เพื่อเลือก endpoint และ header ให้ตรงกับเครื่องมือที่ใช้

## สรุปสั้น

            TinyAPI ออกแบบให้ใช้งานแบบ **OpenAI-compatible** เป็นทางหลัก
            ดังนั้นโปรแกรมส่วนใหญ่ที่มีช่อง OpenAI Base URL / OpenAI API Key สามารถใส่
            endpoint ของ TinyAPI และใช้ API Key ที่ขึ้นต้นด้วย `sk-`
            ได้ทันที

>
            ถ้าไม่แน่ใจ ให้เริ่มจาก OpenAI-compatible ก่อนเสมอ:

            Base URL: `https://api.tinyapi.org/v1`

            Chat URL: `https://api.tinyapi.org/v1/chat/completions`

## API Address ของ TinyAPI

            สำหรับโดเมนจริงของ TinyAPI ให้ใช้ `https://api.tinyapi.org` เป็น
            API Address หลัก ถ้าโปรแกรมถามหา Base URL ของ OpenAI SDK ให้ใส่
            `https://api.tinyapi.org/v1`

          **API Address**

```
https://api.tinyapi.org
```

**OpenAI Base URL**

```
${apiUrl
```

**Chat URL**

```
${apiUrl
```

**Claude Native URL**

```
${apiUrl
```

**Gemini Native URL**

```
${apiUrl
```

            เวลาใช้ localhost เพื่อทดสอบบนเครื่อง ให้เปลี่ยนเฉพาะโดเมนหน้าแรก เช่น
            `http://127.0.0.1:3000` แล้วค่อยต่อ path เดิมตามประเภท
            endpoint

## ประเภท endpoint ที่รองรับ

          | ประเภท | Path | ใช้เมื่อไร |
| --- | --- | --- |
| OpenAI-compatible Chat | /v1/chat/completions | แนะนำเป็นค่าเริ่มต้น ใช้กับ chat model ส่วนใหญ่ รวมถึงโมเดลที่ไม่ใช่ OpenAI เมื่อโปรแกรมรองรับ OpenAI format |
| OpenAI Responses | /v1/responses | ใช้เฉพาะโปรแกรมหรือโมเดลที่ระบุว่าต้องใช้ Responses API ถ้าไม่แน่ใจให้ใช้ Chat Completions ก่อน |
| Claude Native Messages | /v1/messages | ใช้กับเครื่องมือที่ต้องการ Claude/Anthropic native format เท่านั้น เช่นบางโหมดของ Claude Code หรือ Claude Desktop |
| Gemini Native | /v1beta/models/model:generateContent | ใช้กับเครื่องมือที่ต้องการ Gemini native format เท่านั้น และพารามิเตอร์ควรใช้รูปแบบ camelCase เช่น imageSize |

## การยืนยันตัวตน

            API Key ของ TinyAPI ขึ้นต้นด้วย `sk-` แต่ชื่อ header
            ที่ต้องใส่จะแตกต่างกันตาม format ที่โปรแกรมเลือกใช้

          | รูปแบบ | Header ที่ใช้ | ตัวอย่าง |
| --- | --- | --- |
| OpenAI-compatible | Authorization | Authorization: Bearer sk-xxxxxxxx |
| Claude native | x-api-key และ anthropic-version | x-api-key: sk-xxxxxxxx / anthropic-version: 2023-06-01 |
| Gemini native | x-goog-api-key | x-goog-api-key: sk-xxxxxxxx |

>
            `anthropic-version: 2023-06-01` คือเวอร์ชันของ Claude
            Messages API ไม่ใช่ปีของโมเดล จึงไม่ต้องเปลี่ยนเป็นปีใหม่เอง ถ้าโปรแกรมไม่ได้สั่งให้เปลี่ยน

## ควรเลือกแบบไหน

            - ถ้าโปรแกรมมีตัวเลือก OpenAI / OpenAI-compatible ให้ใช้
              `https://api.tinyapi.org/v1` และ header
              `Authorization: Bearer sk-...`
            - ถ้าโปรแกรมบังคับ Claude native ให้ใช้ `https://api.tinyapi.org/v1/messages`
              พร้อม `x-api-key` และ
              `anthropic-version`
            - ถ้าโปรแกรมบังคับ Gemini native ให้ใช้
              `https://api.tinyapi.org/v1beta/models/ชื่อโมเดล:generateContent`
              พร้อม `x-goog-api-key`
            - อย่าสลับ API Key กับ endpoint ของเว็บอื่น เพราะจะทำให้ทดสอบไม่ผ่านและหาสาเหตุยาก

## เอกสารอ้างอิง

            - OpenAI Chat Completions API
            - OpenAI Responses API
            - Anthropic Messages API
            - Gemini OpenAI Compatibility
