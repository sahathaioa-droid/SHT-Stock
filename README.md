# StockPilot — ระบบบริหารจัดการสต๊อกสินค้า

แอปหน้าเดียว (HTML/CSS/JS) + backend ขนาดเล็กสำหรับแชร์ข้อมูลร่วมกันทุกเครื่อง (ทุกผู้ใช้เห็นข้อมูลชุดเดียวกันผ่านฐานข้อมูลกลาง `data/db.json`)

## โครงสร้าง

```
├── index.html          # หน้าเข้าสู่ระบบ
├── app.html            # ตัวแอปหลัก (SPA)
├── server.js           # backend: เสิร์ฟ static + REST API /api/db
├── package.json        # ข้อมูลโปรเจกต์ (เริ่มด้วย node server.js)
├── render.yaml         # config deploy ไป Render
├── Procfile            # config deploy ไป Railway / Heroku
├── js/
│   ├── config.js       # APP config (apiBase, prefix)
│   ├── remote.js       # ตรวจว่ามี backend หรือไม่ (โหมดแชร์ข้อมูล vs โหมด local)
│   ├── db.js           # ชั้นข้อมูล (localStorage หรือ server อัตโนมัติ)
│   └── ...
└── data/db.json        # ข้อมูลกลาง (สร้างอัตโนมัติ, ไม่ push ขึ้น Git)
```

## โหมดการทำงาน

- **โหมดแชร์ข้อมูล (Remote)**: เมื่อเปิดผ่าน `server.js` → ทุกคนใช้ข้อมูลชุดเดียวกันจากเซิร์ฟเวอร์
- **โหมด Local (demo)**: เมื่อเปิด `index.html` ตรง ๆ หรือ static server ธรรมดา → ข้อมูลอยู่ใน localStorage ของเบราว์เซอร์แต่ละเครื่อง (แบบเดิม)
- ระบบตรวจจับอัตโนมัติผ่าน `js/remote.js` (`GET /api/ping` สำเร็จ = โหมดแชร์ข้อมูล)
- ข้อมูล `session` (สถานะล็อกอิน) เก็บใน localStorage เสมอ — ผู้ใช้แต่ละคนล็อกอินแยกกันบนเครื่องของตัวเอง

## รันในเครื่อง (ต้องติดตั้ง Node.js ≥ 16)

```bash
npm start
# หรือ
node server.js
```

เปิด `http://localhost:3000`

## อัปโหลดขึ้น GitHub

1. สร้าง repository ใหม่ที่ https://github.com/new (ชื่อเช่น `stockpilot`)
2. อัปโหลดไฟล์ทั้งหมด (ยกเว้น `node_modules/`, `data/` — มีใน `.gitignore` แล้ว) ด้วย Git หรือวิธีอัปโหลดผ่านเว็บ
3. ติดตั้ง Git ตามวิธีที่สะดวก เช่น Git for Windows (https://git-scm.com) แล้วรัน:

```bash
git init
git add .
git commit -m "StockPilot v1.1.0"
git branch -M main
git remote add origin https://github.com/<your-username>/stockpilot.git
git push -u origin main
```

## Deploy (ตัวเลือกที่แนะนำ: Render)

1. ไปที่ https://render.com สมัครบัญชีฟรี แล้วคลิก **New → Blueprint**
2. เชื่อมบัญชี GitHub และเลือก repository `stockpilot`
3. Render จะอ่าน `render.yaml` และ deploy ให้อัตโนมัติ (ฟรี)
4. หลัง deploy เสร็จจะได้ URL เช่น `https://stockpilot.onrender.com` — แจก URL นี้ให้ทีมเปิดใช้ได้เลย

> หมายเหตุ: บัญชีฟรีของ Render จะหลับเมื่อไม่มีการใช้งาน ~15 นาที แล้วตื่นเองเมื่อมีคนเข้า (ครั้งแรกอาจรอ ~50 วินาที) — เหมาะกับการใช้งานภายในทีมเล็ก ๆ

## Deploy ทางเลือก: Railway

1. ไปที่ https://railway.app → **New Project → Deploy from GitHub** เลือก repo นี้
2. Railway อ่าน `Procfile` (`web: node server.js`) และใช้พอร์ตจากตัวแปร `PORT` ที่ตั้งให้อัตโนมัติ
3. ตั้ง Environment Variables ตามขั้นตอนด้านล่างส่วน Google Sheets

> หมายเหตุสำคัญ: หน้าเว็บและ API ต้องอยู่บน **origin เดียวกัน** (deploy ผ่าน `server.js` ซึ่งเสิร์ฟทั้งหน้าเว็บและ API) — อย่าแยกหน้าเว็บไป GitHub Pages เพราะการเขียนข้อมูลข้าม origin ไม่รองรับในเวอร์ชันนี้

## สำรองข้อมูล

หน้า **ตั้งค่าระบบ → ข้อมูล & ระบบ** ยังมีปุ่ม "สำรองข้อมูล" / "กู้คืนข้อมูล" ทำงานร่วมกับ backend ได้ (ไฟล์ JSON เดียวกันทั้งระบบ) และไฟล์ `data/db.json` บนเซิร์ฟเวอร์คือข้อมูลกลางทั้งหมด

---

## เชื่อมต่อ Google Sheets (ฐานข้อมูลฟรี)

ถ้าไม่ตั้งค่า Google Sheets ระบบจะเก็บข้อมูลในไฟล์ `data/db.json` ตามเดิม (ไม่เสียหาย) การตั้งค่า Google Sheets ทำให้ข้อมูลเก็บใน cloud แบบ persistent — ไม่หายเมื่อ server restart

### ขั้นตอนที่ 1: สร้าง Google Service Account

1. ไปที่ https://console.cloud.google.com → เลือกหรือสร้าง Project
2. ไปที่ **IAM & Admin → Service Accounts** → คลิก **Create Service Account**
3. ตั้งชื่อ เช่น `stockpilot-sheets` → คลิก **Create and Continue**
4. ข้าม Role → คลิก **Done**
5. คลิกที่ Service Account ที่สร้าง → แท็บ **Keys** → **Add Key → Create new key** → เลือก **JSON** → ดาวน์โหลดไฟล์

### ขั้นตอนที่ 2: เปิด Google Sheets API

1. ใน Google Cloud Console → ไปที่ **APIs & Services → Library**
2. ค้นหา **Google Sheets API** → คลิก → คลิก **Enable**

### ขั้นตอนที่ 3: สร้าง Google Spreadsheet

1. ไปที่ https://sheets.google.com → สร้าง Spreadsheet ใหม่
2. สร้าง Sheet ชื่อ **store** (ชื่อต้องตรง)
3. เพิ่ม Header ในแถวที่ 1: Column A = `key`, Column B = `value`
4. คลิก **Share** → เพิ่มอีเมล Service Account จากขั้นตอนที่ 1 → ตั้งเป็น **Editor**
5. คัดลอก Spreadsheet ID จาก URL (ตัวเลข/ตัวอักษรหลัง `/d/`)

### ขั้นตอนที่ 4: ตั้งค่า Env Vars

**บน Railway:**
1. ไป Dashboard → Variables → เพิ่ม 3 ตัว:
   - `GOOGLE_SHEETS_ID` = Spreadsheet ID จากขั้นตอนที่ 3
   - `GOOGLE_SA_EMAIL` = อีเมล Service Account
   - `GOOGLE_SA_JSON` = JSON ทั้งหมดจากไฟล์ที่ดาวน์โหลด (วางทั้งก้อน)

**บน Render:**
1. ไป Dashboard → เลือก service → **Environment** tab
2. ตั้ง `GOOGLE_SHEETS_ID`, `GOOGLE_SA_EMAIL`, `GOOGLE_SA_JSON` ตามขั้นตอน Railway

**ในเครื่อง (dev):**
```bash
set GOOGLE_SHEETS_ID=1-xxxxxxxxxxx
set GOOGLE_SA_EMAIL=xxx@xxx.iam.gserviceaccount.com
set GOOGLE_SA_JSON={"type":"service_account","project_id":"...",...}
node server.js
```

### วิธีทดสอบ

1. เปิดแอป → ไป **ตั้งค่าระบบ** → ดูที่แท็บข้อมูล ควรมี `storage: google-sheets`
2. บันทึกข้อมูลใดก็ได้ → เปิดอีกเบราว์เซอร์/เครื่อง → ข้อมูลควรเห็นเหมือนกัน
3. ไปที่ Google Spreadsheet → แท็บ `store` → ควรเห็นข้อมูลอยู่

### โครงสร้างข้อมูลใน Google Sheets

แท็บ `store` มี 2 คอลัมน์:
- Column A = key (เช่น `stockpilot_users`)
- Column B = value (JSON string ของ array)

ข้อมูลจะถูกเก็บด้วย prefix `stockpilot_` เหมือนเดิม ทำให้ **สำรอง/กู้คืนข้อมูล** ยังใช้งานได้ตามปกติ
