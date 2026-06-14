# คู่มือใช้งาน TinyToken Setup Tool

โฟลเดอร์นี้เก็บเครื่องมือสำหรับตั้งค่า TinyToken ให้กับเครื่องมือ AI หลายตัว เช่น Claude Code, Codex CLI, Gemini-compatible และโปรแกรมที่รองรับ OpenAI-compatible API

## ไฟล์ในชุดนี้

- `tinytoken-setup.mjs` ไฟล์หลักของเมนู setup
- `install.ps1` ตัวเปิดใช้งานสำหรับ PowerShell
- `install.cmd` ตัวเปิดใช้งานสำหรับ CMD บน Windows
- `install.sh` ตัวเปิดใช้งานสำหรับ Linux/macOS

## เครื่องมือนี้ทำอะไร

เครื่องมือนี้ช่วยตั้งค่า endpoint, API key และ model ให้กับโปรแกรมต่าง ๆ โดยอัตโนมัติ

เมื่อเลือกเมนู Claude Code หรือ Codex CLI ระบบจะเขียน config file ที่จำเป็นให้เอง และจะ backup ไฟล์เดิมก่อนแก้ไขเสมอ

ตำแหน่ง backup:

```text
~/.tinytoken/backups
```

ถ้า config ผิดหรืออยากย้อนกลับ ให้ใช้เมนู:

```text
8. Restore backup
```

## วิธีรันบนเครื่องนี้

วิธีง่ายสุดบน Windows คือดับเบิลคลิก:

```text
run.cmd
```

หรือเปิด PowerShell/CMD แล้วรัน:

```powershell
cd "D:\one api\too setting"
.\run.cmd
```

ถ้าต้องการรันตรงด้วย Node.js:

เปิด PowerShell หรือ CMD แล้วรัน:

```powershell
cd "D:\one api\too setting"
node .\tinytoken-setup.mjs
```

ถ้าเครื่องยังไม่มี Node.js ต้องติดตั้ง Node.js เวอร์ชัน 20 หรือใหม่กว่า

## เมนูหลัก

```text
1. ตั้งค่า Claude Code
2. ตั้งค่า Codex CLI
3. ตั้งค่า Gemini-compatible
4. ตั้งค่าโปรแกรมอื่น / OpenAI-compatible
5. ทดสอบ connection / check key
6. เปลี่ยน endpoint และ model เริ่มต้น
7. ดู config ปัจจุบัน
8. ย้อนกลับ backup
9. ออก
```

## วิธีใช้งานแนะนำ

Flow ที่ง่ายสุด:

```text
เลือกเครื่องมือ -> ใส่ Endpoint -> ใส่ API key -> ใส่ Model -> ทดสอบใช้งาน
```

ถ้าใช้ TinyToken domain จริง ให้กด Enter ในช่อง Endpoint เพื่อใช้ค่า `https://api.tinyapi.org`

ถ้าทดสอบบนเครื่องตัวเอง ให้ใส่:

```text
http://127.0.0.1:3000
```

ถ้าต้องการทดสอบ key ก่อน ให้ใช้เมนู `ทดสอบ connection / check key`

ถ้า config ผิดหรืออยากย้อนกลับ ให้ใช้เมนู `ย้อนกลับ backup`

หมายเหตุ: หลังจากเลือกเมนูแล้ว ถ้าขึ้นช่อง `Endpoint / Base URL` ไม่ต้องพิมพ์เลขเมนูซ้ำ ถ้าจะใช้ค่าเดิมในวงเล็บให้กด Enter ได้เลย หรือวาง URL endpoint ใหม่

## Endpoint วางได้แบบไหน

ช่อง Endpoint สามารถวางได้ทั้ง Base URL และ URL เต็ม

ตัวอย่างที่ใช้ได้:

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/v1
http://127.0.0.1:3000/v1/chat/completions
http://localhost:3000/v1/models
https://api.tinyapi.org
https://api.tinyapi.org/v1/messages
https://api.tinyapi.org/v1beta/models
```

ระบบจะตัด URL ให้เหลือ Base URL อัตโนมัติ เช่น:

```text
http://127.0.0.1:3000/v1/chat/completions
```

จะถูกใช้เป็น:

```text
http://127.0.0.1:3000
```

## API Key

API key ต้องขึ้นต้นด้วย:

```text
sk-
```

ตัวอย่าง:

```text
sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Model name

ให้ใส่ชื่อ model ที่ต้องการใช้ เช่น:

```text
claude-opus-4-6
claude-sonnet-4-6
gpt-5.5
gpt-5.4
codex
```

ชื่อ model ต้องตรงกับ model ที่เปิดใช้งานในเว็บ TinyToken

## การตั้งค่า Claude Code

เลือกเมนู:

```text
1. Claude Code
```

ระบบจะถาม:

```text
Endpoint / Base URL
API key
Model name
```

หลังจากนั้นระบบจะตั้งค่าไฟล์ของ Claude Code ให้อัตโนมัติ เช่น:

```text
~/.claude.json
~/.claude/settings.json
```

แล้วสามารถใช้งาน Claude Code ผ่าน TinyToken endpoint ได้

## การตั้งค่า Codex CLI

เลือกเมนู:

```text
2. Codex CLI
```

ระบบจะถาม:

```text
Endpoint / Base URL
API key
Model name
```

หลังจากนั้นระบบจะตั้งค่าไฟล์ของ Codex ให้อัตโนมัติ เช่น:

```text
~/.codex/config.toml
~/.codex/tinytoken.config.toml
~/.codex/auth.json
```

เวลาใช้งาน Codex ให้ใช้ profile:

```text
codex --profile tinytoken
```

## การทดสอบ API Key และ Endpoint

เลือกเมนู:

```text
5. Test connection / check key
```

เลือกชนิดการทดสอบ:

```text
1. OpenAI model list /v1/models
2. Claude message /v1/messages
3. OpenAI chat /v1/chat/completions
4. Gemini-compatible model list /v1beta/models
```

แนะนำให้ทดสอบแบบ `1` ก่อน เพราะเป็นการดูรายชื่อ model และปกติไม่ใช้เครดิต

ถ้าต้องการทดสอบว่าเรียก model ได้จริง ให้ใช้ `2` หรือ `3` แต่อาจใช้เครดิตเล็กน้อย

## วิธีใช้ผ่านเว็บในอนาคต

เมื่ออัปโหลดไฟล์ขึ้นเว็บแล้ว ลูกค้าสามารถรันได้แบบนี้

PowerShell:

```powershell
irm https://tinyapi.org/install.ps1 | iex
```

CMD:

```cmd
curl -fsSL https://tinyapi.org/install.cmd -o install.cmd && install.cmd
```

Linux/macOS:

```bash
curl -fsSL https://tinyapi.org/install.sh | bash
```

## หมายเหตุสำคัญ

- ควรทดสอบ endpoint บน localhost ก่อน เช่น `http://127.0.0.1:3000`
- เมื่อเว็บพร้อมใช้งานจริง ค่อยเปลี่ยนเป็น `https://api.tinyapi.org`
- ถ้าไม่แน่ใจว่า model ใช้ได้ไหม ให้ทดสอบด้วยเมนู `5` ก่อน
- ถ้าตั้งค่าผิด ให้ใช้เมนู `8` เพื่อย้อนกลับ config เดิม
