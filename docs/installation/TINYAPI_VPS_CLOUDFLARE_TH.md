# คู่มือติดตั้ง TinyAPI บน VPS และซ่อน IP ด้วย Cloudflare Tunnel

คู่มือนี้จัดทำสำหรับโปรเจกต์ TinyAPI ใน `D:\one api` โดยเฉพาะ อ้างอิงวิธีติดตั้ง Docker Compose จาก GitHub ของโปรเจกต์ต้นฉบับ New API แล้วปรับให้ตรงกับโครงสร้าง Production, PostgreSQL, Redis, ฐานข้อมูลเดิม และโดเมนของ TinyAPI

> คู่มือนี้ไม่ใช้ Docker image สำเร็จรูป `calciumion/new-api:latest` เพราะเว็บไซต์ TinyAPI มีโค้ด หน้าเว็บ เอกสาร และคำแปลที่แก้ไขเอง จึงต้อง Build จาก Source Code ของ TinyAPI

## โครงสร้างระบบที่แนะนำ

```text
ผู้ใช้
  |
  v
Cloudflare HTTPS / WAF
  |
  v
Cloudflare Tunnel (การเชื่อมต่อออกจาก VPS)
  |
  v
127.0.0.1:3000
  |
  +-- TinyAPI
  +-- PostgreSQL (เครือข่าย Docker ภายใน)
  +-- Redis (เครือข่าย Docker ภายใน)
```

ด้วยโครงสร้างนี้:

- ไม่ต้องเปิดพอร์ต `80`, `443` หรือ `3000` จากอินเทอร์เน็ตเข้าหา VPS
- TinyAPI รับการเชื่อมต่อเฉพาะ `127.0.0.1:3000`
- Cloudflare Tunnel เชื่อมต่อจาก VPS ออกไปยัง Cloudflare
- ผู้ใช้เห็น IP ของ Cloudflare แทน IP จริงของ VPS
- PostgreSQL และ Redis ไม่ถูกเปิดออกสู่อินเทอร์เน็ต

## ไฟล์ที่เตรียมไว้แล้ว

ใช้ไฟล์ต่อไปนี้ในการ Deploy:

| รายการ | ตำแหน่งบน Windows |
|---|---|
| Source Code สำหรับ VPS | `D:\tinyapi-backups\tinyapi-vps-deploy-ready-20260614.zip` |
| ฐานข้อมูลสำหรับ VPS | `D:\tinyapi-backups\tinyapi-db-vps-clean-20260614-060424.dump` |
| Source Code ก่อนล้างข้อมูล | `D:\tinyapi-backups\tinyapi-source-before-cleanup-20260614-055935.zip` |
| ฐานข้อมูลก่อนล้างข้อมูล | `D:\tinyapi-backups\tinyapi-db-before-cleanup-20260614-055935.dump` |

ไฟล์ฐานข้อมูลสำหรับ VPS เก็บเฉพาะบัญชีแอดมินที่เตรียมไว้แล้ว ส่วนไฟล์ `before-cleanup` ต้องเก็บไว้นอก VPS เพื่อใช้กู้คืนหากจำเป็น

## สเปก VPS

### สเปกแนะนำ

- CPU: 2 vCPU ขึ้นไป
- RAM: 4 GB ขึ้นไป
- Storage: SSD 40-60 GB ขึ้นไป
- OS: Ubuntu Server 24.04 LTS แบบ x86_64/AMD64
- Network: Public IPv4 หนึ่งหมายเลข

### ถ้าใช้ 2 vCPU / RAM 2 GB

ใช้งานจริงได้สำหรับจำนวนผู้ใช้เริ่มต้น แต่ขั้นตอน Build Source Code อาจใช้ RAM มาก แนะนำให้สร้าง Swap 4 GB ก่อน Build และควรเฝ้าดู RAM, CPU และพื้นที่ดิสก์

## สิ่งที่ต้องเตรียม

1. VPS ที่ติดตั้ง Ubuntu Server
2. Username, Password หรือ SSH Key ของ VPS
3. โดเมน `tinyapi.org` อยู่ในบัญชี Cloudflare
4. เครื่อง Windows ที่มีไฟล์สำรองด้านบน
5. สิทธิ์เข้าหน้า Cloudflare Dashboard
6. เก็บ VPS IP, รหัสผ่าน, Tunnel Token และไฟล์ `.env.production` เป็นความลับ

---

## ขั้นตอนที่ 1: เชื่อมต่อ VPS

เปิด PowerShell บน Windows:

```powershell
ssh <VPS_USER>@<VPS_IP>
```

ตัวอย่าง:

```powershell
ssh root@203.0.113.10
```

`203.0.113.10` เป็น IP ตัวอย่างเท่านั้น ห้ามคัดลอกไปใช้จริง

หลังเข้าสู่ VPS แล้ว ตรวจสอบระบบ:

```bash
cat /etc/os-release
uname -m
free -h
df -h
```

ค่า `uname -m` ควรเป็น `x86_64`

## ขั้นตอนที่ 2: อัปเดตระบบและติดตั้งเครื่องมือพื้นฐาน

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl unzip openssl ufw
sudo timedatectl set-timezone Asia/Bangkok
timedatectl
```

## ขั้นตอนที่ 3: สร้าง Swap ถ้า RAM มีเพียง 2 GB

ตรวจสอบก่อน:

```bash
swapon --show
```

ถ้ายังไม่มี Swap ให้สร้าง 4 GB:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

ถ้า VPS มี RAM 4 GB ขึ้นไป จะสร้าง Swap 2-4 GB ไว้ก็ได้

## ขั้นตอนที่ 4: ตั้ง Firewall ของ VPS

ต้องอนุญาต SSH ก่อนเปิด UFW มิฉะนั้นอาจเชื่อมต่อ VPS ไม่ได้:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status verbose
```

ไม่ต้องเปิดพอร์ตเหล่านี้:

```text
80
443
3000
5432
6379
```

ถ้าผู้ให้บริการ VPS มี Network Firewall หรือ Security Group ให้ตั้งดังนี้:

| ทิศทาง | พอร์ต | การตั้งค่า |
|---|---:|---|
| Inbound | TCP 22 | อนุญาตเฉพาะ IP ของผู้ดูแลถ้าทำได้ |
| Inbound | อื่นทั้งหมด | ปิด |
| Outbound | TCP 443 | อนุญาต |
| Outbound | TCP/UDP 7844 | อนุญาตสำหรับ Cloudflare Tunnel |
| Outbound | DNS และการอัปเดตระบบ | อนุญาต |

> Cloudflare Tunnel ใช้การเชื่อมต่อขาออก จึงไม่ต้องเปิด Inbound `80`, `443` หรือ `3000`

## ขั้นตอนที่ 5: ติดตั้ง Docker จาก Repository ทางการ

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

เพิ่ม Docker Repository:

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

ติดตั้ง Docker Engine และ Docker Compose:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

ตรวจสอบ:

```bash
sudo docker version
sudo docker compose version
sudo docker run --rm hello-world
```

ถ้าใช้ผู้ใช้ที่ไม่ใช่ `root` และต้องการเรียก Docker โดยไม่ใส่ `sudo`:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker version
```

> สมาชิกกลุ่ม `docker` มีสิทธิ์ระดับสูงบนเครื่อง ให้เพิ่มเฉพาะบัญชีผู้ดูแลที่ไว้ใจได้

## ขั้นตอนที่ 6: อัปโหลด Source Code และฐานข้อมูล

เปิด PowerShell ใหม่บน Windows แล้วใช้คำสั่งต่อไปนี้:

```powershell
scp "D:\tinyapi-backups\tinyapi-vps-deploy-ready-20260614.zip" `
  <VPS_USER>@<VPS_IP>:/tmp/

scp "D:\tinyapi-backups\tinyapi-db-vps-clean-20260614-060424.dump" `
  <VPS_USER>@<VPS_IP>:/tmp/
```

กลับไปที่หน้าต่าง SSH แล้วตรวจสอบ:

```bash
ls -lh /tmp/tinyapi-vps-deploy-ready-20260614.zip
ls -lh /tmp/tinyapi-db-vps-clean-20260614-060424.dump
```

## ขั้นตอนที่ 7: แตกไฟล์เข้า `/opt/tinyapi`

```bash
sudo rm -rf /tmp/tinyapi-unpack
sudo mkdir -p /tmp/tinyapi-unpack
sudo mkdir -p /opt/tinyapi
sudo unzip -q /tmp/tinyapi-vps-deploy-ready-20260614.zip \
  -d /tmp/tinyapi-unpack
sudo cp -a "/tmp/tinyapi-unpack/one api/." /opt/tinyapi/
sudo chown -R "$USER":"$USER" /opt/tinyapi
cd /opt/tinyapi
```

ตรวจสอบไฟล์สำคัญ:

```bash
ls -lh Dockerfile docker-compose.production.yml .env.production.example
```

สร้างโฟลเดอร์เก็บฐานข้อมูลสำรอง:

```bash
mkdir -p /opt/tinyapi/backups
cp /tmp/tinyapi-db-vps-clean-20260614-060424.dump \
  /opt/tinyapi/backups/initial-clean.dump
chmod 600 /opt/tinyapi/backups/initial-clean.dump
```

## ขั้นตอนที่ 8: สร้างไฟล์ Production Secret

GitHub ของ New API ระบุค่าหลักที่ต้องใช้ ได้แก่:

- `SQL_DSN`
- `REDIS_CONN_STRING`
- `SESSION_SECRET`
- `CRYPTO_SECRET` เมื่อใช้ Redis

สร้างรหัสแบบสุ่ม:

```bash
cd /opt/tinyapi

POSTGRES_PASSWORD="$(openssl rand -hex 32)"
REDIS_PASSWORD="$(openssl rand -hex 32)"
SESSION_SECRET="$(openssl rand -hex 48)"
CRYPTO_SECRET="$(openssl rand -hex 48)"

cat > .env.production <<EOF
APP_BIND_IP=127.0.0.1
APP_PORT=3000

POSTGRES_USER=tinyapi
POSTGRES_DB=tinyapi
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

REDIS_PASSWORD=${REDIS_PASSWORD}
SESSION_SECRET=${SESSION_SECRET}
CRYPTO_SECRET=${CRYPTO_SECRET}

TZ=Asia/Bangkok
NODE_NAME=tinyapi-vps-1
EOF

chmod 600 .env.production
```

ตรวจเฉพาะชื่อค่าที่ตั้งไว้โดยไม่แสดง Secret:

```bash
grep -E '^(APP_BIND_IP|APP_PORT|POSTGRES_USER|POSTGRES_DB|TZ|NODE_NAME)=' \
  .env.production
```

ห้ามทำสิ่งต่อไปนี้:

- ห้ามอัปโหลด `.env.production` ไป GitHub
- ห้ามส่งไฟล์นี้ในแชตหรือโพสต์สาธารณะ
- ห้ามใช้ Secret เดียวกันกับรหัสผ่านบัญชีแอดมิน
- ห้ามเปลี่ยน `SESSION_SECRET` หรือ `CRYPTO_SECRET` ทุกครั้งที่ Restart

## ขั้นตอนที่ 9: ตรวจ Docker Compose

```bash
cd /opt/tinyapi
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  config --quiet
```

ถ้าไม่มีข้อความ Error แสดงว่าโครงสร้าง Compose ถูกต้อง

ตรวจสอบว่าพอร์ตแอปผูกกับ localhost:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  config | grep -A 3 published
```

ค่าที่ต้องการคือ Host IP `127.0.0.1` และพอร์ต `3000`

## ขั้นตอนที่ 10: เปิด PostgreSQL และ Redis

```bash
cd /opt/tinyapi
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d postgres redis
```

รอประมาณ 15-30 วินาที แล้วตรวจสอบ:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

สถานะของ `tinyapi-postgres` และ `tinyapi-redis` ควรเป็น `healthy`

## ขั้นตอนที่ 11: Restore ฐานข้อมูล TinyAPI

คัดลอก Dump เข้า Container:

```bash
docker cp /opt/tinyapi/backups/initial-clean.dump \
  tinyapi-postgres:/tmp/tinyapi.dump
```

Restore ฐานข้อมูล:

```bash
docker exec tinyapi-postgres pg_restore \
  -U tinyapi \
  -d tinyapi \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  /tmp/tinyapi.dump
```

ลบไฟล์ชั่วคราวใน Container:

```bash
docker exec tinyapi-postgres rm -f /tmp/tinyapi.dump
```

ตรวจสอบรายชื่อ Table:

```bash
docker exec tinyapi-postgres psql \
  -U tinyapi \
  -d tinyapi \
  -c '\dt'
```

## ขั้นตอนที่ 12: Build และเปิด TinyAPI

Build จาก Source Code:

```bash
cd /opt/tinyapi
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  build --pull new-api
```

บน VPS RAM 2 GB ขั้นตอนนี้อาจใช้เวลานาน ควรมี Swap 4 GB และอย่าปิด SSH ระหว่าง Build

หลัง Build สำเร็จ:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d
```

ตรวจสอบ Container:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

ดู Log:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --tail=100 new-api
```

ทดสอบจากภายใน VPS:

```bash
curl -fsS http://127.0.0.1:3000/api/status
```

ตรวจสอบว่าพอร์ตไม่เปิดเป็น `0.0.0.0:3000`:

```bash
sudo ss -lntp | grep ':3000'
```

ผลลัพธ์ควรแสดง `127.0.0.1:3000`

> อย่าเปลี่ยน `APP_BIND_IP` เป็น `0.0.0.0` ถ้าต้องการซ่อน Origin IP ด้วย Cloudflare Tunnel

## ขั้นตอนที่ 13: ติดตั้ง Cloudflared

ติดตั้ง Package จาก Cloudflare Repository ทางการ:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null

echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update
sudo apt install -y cloudflared
cloudflared --version
```

## ขั้นตอนที่ 14: สร้าง Cloudflare Tunnel

1. เข้า [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. เลือกบัญชีและโดเมน `tinyapi.org`
3. ไปที่ **Networking > Tunnels**
4. ถ้าเมนูนี้ไม่ปรากฏ ให้เข้า **Zero Trust > Networks > Connectors > Cloudflare Tunnels**
5. กด **Create a tunnel**
6. เลือก Connector เป็น **Cloudflared**
7. ตั้งชื่อ `tinyapi-vps-production`
8. เลือก Environment เป็น Linux และ Architecture ให้ตรงกับ VPS
9. Cloudflare จะแสดงคำสั่งติดตั้ง Service พร้อม Tunnel Token

บน VPS ให้ใช้คำสั่งที่ Cloudflare แสดง รูปแบบจะคล้าย:

```bash
sudo cloudflared service install <TUNNEL_TOKEN>
```

`<TUNNEL_TOKEN>` เป็นข้อมูลลับ ห้ามนำไปใส่ GitHub, Markdown, Screenshot หรือส่งให้บุคคลอื่น

ตรวจสอบ Service:

```bash
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
```

ดู Log:

```bash
sudo journalctl -u cloudflared -n 100 --no-pager
```

## ขั้นตอนที่ 15: ทดสอบด้วย Subdomain ชั่วคราวก่อนย้ายเว็บไซต์จริง

ใน Tunnel ที่สร้างไว้:

1. เปิดเมนู **Published application routes** หรือ **Public Hostnames**
2. เพิ่ม Hostname `vps-test.tinyapi.org`
3. Service Type เลือก `HTTP`
4. URL ใส่ `localhost:3000`
5. บันทึก

ทดสอบ:

```bash
curl -I https://vps-test.tinyapi.org
curl -fsS https://vps-test.tinyapi.org/api/status
```

เปิดใน Browser:

```text
https://vps-test.tinyapi.org
```

ตรวจให้ครบก่อนย้ายโดเมนจริง:

- หน้าแรกเปิดได้
- เข้าสู่ระบบด้วยบัญชีแอดมินได้
- หน้า Docs เปิดได้
- หน้า Models และ Channels มีข้อมูล
- สร้าง API Key ได้
- ทดสอบโมเดลได้
- หน้าเติมเครดิตและระบบที่แก้ไขไว้แสดงถูกต้อง
- ภาษาไทยและ Logo ยังอยู่ครบ

## ขั้นตอนที่ 16: เชื่อมโดเมนจริง

หลัง `vps-test.tinyapi.org` ทำงานถูกต้อง ให้เพิ่ม Route:

| Hostname | Service |
|---|---|
| `tinyapi.org` | `http://localhost:3000` |
| `api.tinyapi.org` | `http://localhost:3000` |

ถ้าต้องการ `www` ให้เพิ่ม:

| Hostname | Service |
|---|---|
| `www.tinyapi.org` | `http://localhost:3000` |

Cloudflare Tunnel จะสร้าง DNS Record ที่ชี้ไปยัง:

```text
<TUNNEL_UUID>.cfargotunnel.com
```

ถ้ามี DNS Record ชื่อเดิมอยู่แล้ว Cloudflare อาจแจ้ง Conflict ให้ตรวจและลบ Record เก่าที่ซ้ำก่อน

### ลำดับย้ายจากเครื่อง Windows เดิมไป VPS

1. อย่าเพิ่งปิด Tunnel เดิมบน Windows
2. ทดสอบ `vps-test.tinyapi.org` ให้เรียบร้อย
3. เพิ่ม Route ของ `tinyapi.org` และ `api.tinyapi.org` ไป Tunnel ใหม่
4. ตรวจหน้าเว็บและ API ผ่านโดเมนจริง
5. เมื่อยืนยันว่า VPS ทำงานแล้ว จึงหยุด Tunnel เดิมบน Windows
6. เก็บไฟล์สำรองก่อนลบ Container หรือข้อมูลเก่าบน Windows

## ขั้นตอนที่ 17: ตั้ง Cloudflare เพื่อไม่รบกวน API

### 17.1 ปิด Cache สำหรับ API

ไปที่:

```text
Cloudflare Dashboard
> tinyapi.org
> Caching
> Cache Rules
> Create rule
```

สร้าง Rule ชื่อ `Bypass TinyAPI API cache`

Expression:

```text
(http.host eq "api.tinyapi.org")
or (http.request.uri.path starts_with "/v1/")
or (http.request.uri.path starts_with "/api/")
```

Action:

```text
Cache eligibility: Bypass cache
```

ห้ามใช้ `Cache Everything` กับ API เพราะอาจทำให้คำตอบของผู้ใช้คนหนึ่งถูก Cache และส่งให้ผู้ใช้อื่น

### 17.2 หลีกเลี่ยง Browser Challenge บน API

เครื่องมืออย่าง Claude Code, Codex CLI, OpenCode และ OpenClaw ไม่สามารถกด CAPTCHA หรือ Browser Challenge ได้

ดังนั้น:

- อย่าใช้ Managed Challenge กับ `api.tinyapi.org`
- อย่าใช้ JavaScript Challenge กับ `/v1/*`
- อย่าใช้ Cloudflare Access ครอบทั้ง `api.tinyapi.org`
- ถ้าจะป้องกันหน้าแอดมิน ให้ทำ Rule เฉพาะ Path ของหน้าแอดมิน
- เปิด WAF Managed Rules ได้ แต่ต้องตรวจ False Positive จาก API Request

ตัวอย่างขอบเขต API ที่ไม่ควรถูก Browser Challenge:

```text
api.tinyapi.org/*
tinyapi.org/v1/*
tinyapi.org/api/*
```

### 17.3 HTTPS

ตั้งค่า:

- Always Use HTTPS: เปิด
- Minimum TLS Version: TLS 1.2
- Automatic HTTPS Rewrites: เปิดได้

เมื่อใช้ Cloudflare Tunnel ไม่จำเป็นต้องติดตั้ง Nginx หรือ Origin Certificate บน VPS สำหรับ Route นี้ เพราะ Tunnel เชื่อมต่อโดยตรงกับ `localhost:3000`

### 17.4 Rate Limit

เริ่มต้นอย่าตั้ง Rate Limit ที่ Cloudflare ต่ำเกินไป เพราะ AI API ใช้ Streaming และโปรแกรม Coding Agent อาจส่งหลาย Request พร้อมกัน

แนะนำ:

- ใช้ Rate Limit ภายใน TinyAPI เป็นหลัก
- หากเพิ่ม Cloudflare Rate Limiting ให้เริ่มแบบ Log/Monitor ก่อน
- แยก Rule ของหน้า Login ออกจาก `/v1/*`
- อย่าใช้ Browser Challenge เป็นคำตอบสำหรับ API Rate Limit

## ขั้นตอนที่ 18: ตรวจว่า IP จริงไม่รั่ว

ไปที่หน้า DNS ของ Cloudflare แล้วตรวจ:

- ลบ `A` หรือ `AAAA` Record ที่ชี้ตรงไปยัง VPS IP
- ลบ Record แบบ DNS only ที่ชี้ไป VPS เดียวกัน เช่น `origin`, `direct`, `panel`, `ftp`
- `tinyapi.org` และ `api.tinyapi.org` ควรเชื่อมผ่าน Tunnel
- อย่าเผยแพร่ VPS IP ใน Docs, GitHub, Screenshot หรือข้อความสาธารณะ
- อย่ารัน Mail Server บน VPS เครื่องเดียวกัน เพราะ MX หรือ Mail Header อาจเปิดเผย IP
- ใช้ผู้ให้บริการ SMTP ภายนอกสำหรับ `noreply@tinyapi.org`
- ปิดพอร์ต `80`, `443`, `3000`, `5432`, `6379` ที่ Firewall ของผู้ให้บริการ VPS

ตรวจจาก VPS:

```bash
sudo ufw status verbose
sudo ss -lntp
```

ตรวจ DNS จากเครื่อง Windows:

```powershell
Resolve-DnsName tinyapi.org
Resolve-DnsName api.tinyapi.org
```

ผลลัพธ์สาธารณะไม่ควรแสดง VPS IP จริง

> Cloudflare Tunnel ซ่อน IP ต้นทางจากผู้เข้าชมเว็บไซต์ แต่ Upstream API Provider ที่ TinyAPI เชื่อมต่อออกไปยังคงเห็น Outbound IP ของ VPS ตามปกติ

## ขั้นตอนที่ 19: ทดสอบเว็บไซต์และ API

ทดสอบหน้าเว็บ:

```bash
curl -I https://tinyapi.org
```

ทดสอบสถานะ:

```bash
curl -fsS https://api.tinyapi.org/api/status
```

ทดสอบรายการโมเดล:

```bash
curl https://api.tinyapi.org/v1/models \
  -H "Authorization: Bearer sk-YOUR_API_KEY"
```

ทดสอบ Chat Completions:

```bash
curl https://api.tinyapi.org/v1/chat/completions \
  -H "Authorization: Bearer sk-YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "YOUR_MODEL_NAME",
    "messages": [
      {
        "role": "user",
        "content": "Reply with OK"
      }
    ],
    "stream": false
  }'
```

ห้ามใช้ API Key จริงใน Screenshot หรือเอกสารสาธารณะ

## ขั้นตอนที่ 20: ตั้ง Backup ฐานข้อมูลรายวัน

สร้าง Script:

```bash
sudo tee /usr/local/sbin/backup-tinyapi-db.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/tinyapi/backups/daily"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/tinyapi-${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"
docker exec tinyapi-postgres pg_dump \
  -U tinyapi \
  -d tinyapi \
  -Fc > "${BACKUP_FILE}"

chmod 600 "${BACKUP_FILE}"
find "${BACKUP_DIR}" -type f -name 'tinyapi-*.dump' -mtime +7 -delete
EOF

sudo chmod 700 /usr/local/sbin/backup-tinyapi-db.sh
sudo /usr/local/sbin/backup-tinyapi-db.sh
ls -lh /opt/tinyapi/backups/daily
```

เพิ่ม Cron ให้ทำงานทุกวันเวลา 03:30:

```bash
sudo crontab -e
```

เพิ่มบรรทัด:

```cron
30 3 * * * /usr/local/sbin/backup-tinyapi-db.sh >> /var/log/tinyapi-backup.log 2>&1
```

Backup ที่อยู่ใน VPS เครื่องเดียวกันยังไม่เพียงพอ ควรคัดลอกออกไปเก็บใน:

- Cloud Object Storage
- คอมพิวเตอร์อีกเครื่อง
- Storage ของผู้ให้บริการอื่น

ควรสำรองเพิ่มเติม:

- `/opt/tinyapi/.env.production`
- `/opt/tinyapi/data`
- Source Code เวอร์ชันที่ใช้งาน
- PostgreSQL Dump

ไฟล์ `.env.production` ต้องเข้ารหัสหรือเก็บใน Password Manager

## ขั้นตอนที่ 21: คำสั่งดูแลระบบ

เข้าโฟลเดอร์:

```bash
cd /opt/tinyapi
```

ดูสถานะ:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

ดู Log แอป:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs -f --tail=200 new-api
```

Restart แอป:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  restart new-api
```

Restart ทั้งระบบ:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  restart
```

ตรวจพื้นที่ Docker:

```bash
docker system df
```

อย่าใช้ `docker system prune -a` โดยไม่ตรวจสอบ เพราะอาจลบ Image ที่ต้องใช้ Rollback

## ขั้นตอนที่ 22: วิธีอัปเดต TinyAPI ภายหลัง

ก่อนอัปเดตทุกครั้ง:

```bash
sudo /usr/local/sbin/backup-tinyapi-db.sh
cp /opt/tinyapi/.env.production \
  "/opt/tinyapi/backups/env-$(date +%Y%m%d-%H%M%S).production"
chmod 600 /opt/tinyapi/backups/env-*.production
```

ลำดับที่ปลอดภัย:

1. Build และทดสอบโค้ดใหม่บน localhost ก่อน
2. สร้าง ZIP ใหม่โดยไม่รวม Cache, Log, `node_modules` และข้อมูลผู้ใช้ที่ไม่ต้องการ
3. อัปโหลด ZIP ไป VPS
4. ห้ามเขียนทับ `.env.production`
5. Backup PostgreSQL
6. แตก Source Code เวอร์ชันใหม่
7. ตรวจ `docker compose config --quiet`
8. Build Image ใหม่
9. เปิด Container
10. ทดสอบ `/api/status`, Login และ API จริง
11. เก็บ Image หรือ ZIP เวอร์ชันก่อนหน้าไว้สำหรับ Rollback

ห้ามใช้ `git pull` ทับโปรเจกต์ TinyAPI โดยตรง เพราะโปรเจกต์มีการแก้หน้าเว็บ ภาษาไทย Docs ระบบเติมเครดิต และฟังก์ชันเฉพาะจำนวนมาก

## ขั้นตอนที่ 23: การแก้ปัญหา

### Cloudflare Error 1033

ความหมาย: Cloudflare หา Tunnel Connector ที่เชื่อมต่ออยู่ไม่พบ

ตรวจ:

```bash
sudo systemctl status cloudflared --no-pager
sudo journalctl -u cloudflared -n 100 --no-pager
```

### Cloudflare Error 502

ความหมาย: Tunnel เชื่อมต่อ Cloudflare ได้ แต่เข้าถึง TinyAPI ที่ `localhost:3000` ไม่ได้

ตรวจ:

```bash
curl -v http://127.0.0.1:3000/api/status
docker ps
docker logs --tail=100 tinyapi-app
```

ตรวจว่า Route ใน Tunnel เป็น:

```text
HTTP
localhost:3000
```

### Container ไม่ Healthy

```bash
docker inspect tinyapi-app \
  --format='{{json .State.Health}}'
docker logs --tail=200 tinyapi-app
```

### Build หยุดเพราะ RAM ไม่พอ

```bash
free -h
swapon --show
dmesg -T | grep -i -E 'oom|out of memory'
```

ถ้าไม่มี Swap ให้กลับไปทำขั้นตอนที่ 3

### PostgreSQL Restore ไม่ผ่าน

```bash
docker logs --tail=100 tinyapi-postgres
docker exec tinyapi-postgres pg_isready -U tinyapi -d tinyapi
```

ตรวจว่าใช้:

```text
--no-owner
--no-privileges
```

### API ใช้ผ่าน localhost ได้ แต่ผ่านโดเมนไม่ได้

ตรวจตามลำดับ:

1. `curl http://127.0.0.1:3000/api/status`
2. `systemctl status cloudflared`
3. Route ของ `api.tinyapi.org`
4. DNS Record ซ้ำ
5. WAF หรือ Browser Challenge
6. Cache Rule

## Checklist ก่อนเปิดใช้งานจริง

- [ ] ระบบปฏิบัติการและ Package อัปเดตแล้ว
- [ ] เปิด UFW และอนุญาตเฉพาะ SSH
- [ ] ไม่เปิด Inbound `80`, `443`, `3000`, `5432`, `6379`
- [ ] `APP_BIND_IP=127.0.0.1`
- [ ] ตั้ง `SESSION_SECRET`
- [ ] ตั้ง `CRYPTO_SECRET`
- [ ] ตั้งรหัส PostgreSQL และ Redis คนละค่า
- [ ] Restore ฐานข้อมูลสำเร็จ
- [ ] TinyAPI Container เป็น Healthy
- [ ] `curl http://127.0.0.1:3000/api/status` ผ่าน
- [ ] Cloudflare Tunnel เป็น Healthy
- [ ] ทดสอบ `vps-test.tinyapi.org` ก่อนย้ายโดเมนจริง
- [ ] `tinyapi.org` เปิดได้
- [ ] `api.tinyapi.org` เรียก API ได้
- [ ] ไม่มี A/AAAA Record เปิดเผย VPS IP
- [ ] ปิด Cache สำหรับ API
- [ ] ไม่มี Browser Challenge บน API
- [ ] ทดสอบ Login, API Key, Models, Channels และเติมเครดิต
- [ ] ตั้ง Backup PostgreSQL รายวัน
- [ ] มี Backup นอก VPS
- [ ] เก็บ Tunnel Token และ `.env.production` เป็นความลับ

## เอกสารอ้างอิง

- [GitHub: QuantumNous/new-api](https://github.com/QuantumNous/new-api)
- [New API: Installation Documentation](https://docs.newapi.pro/en/docs/installation)
- [New API: Environment Variables](https://docs.newapi.pro/en/docs/installation/config-maintenance/environment-variables)
- [Docker Engine: Install on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Cloudflare Tunnel: Create a remotely-managed tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)
- [Cloudflare Tunnel: Firewall requirements](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/)
- [Cloudflare Tunnel: Monitoring](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/monitoring/)
- [Cloudflare: Protect origin IP](https://developers.cloudflare.com/learning-paths/prevent-ddos-attacks/advanced/protect-origin-ip/)
- [Cloudflare Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)
- [Ubuntu Server: Firewall](https://ubuntu.com/server/docs/how-to/security/firewalls/)
