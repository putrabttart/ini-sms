# SMS Receiver LAB v2.0

Dashboard SMS laboratorium berbasis **Next.js App Router**, **Supabase PostgreSQL**, dan **Vercel**. Aplikasi menerima pesan uji sintetik dari satu atau dua HP Android dan hanya menampilkan data non-sensitif pada dashboard publik.

> Proyek ini bukan shared OTP inbox. OTP Netflix, Disney+, bank, akun pribadi, dan SMS umum lainnya harus diabaikan dan tidak disimpan.

## Status

- Source Next.js dan unit test tersedia secara lokal.
- Database produksi Supabase belum dibuat atau dimigrasikan oleh source ini secara otomatis.
- Deployment Vercel belum dilakukan dan belum terhubung ke HP pengguna.
- Instalasi Python lokal yang pernah digunakan adalah sistem terpisah.

## Arsitektur

```text
HP Android 1/2 + SMS to URL Forwarder
        |
        | HTTPS JSON + HMAC-SHA256 atas raw body
        v
Next.js Route Handler di Vercel
  /api/webhook/hp1 atau /api/webhook/hp2
        |
        | validasi server-side dan deduplikasi
        v
Supabase PostgreSQL (RLS aktif, tanpa policy publik)
        |
        v
/api/devices dan /api/messages
        |
        v
Dashboard React publik, polling 20 detik
```

HMAC membuktikan request berasal dari perangkat yang memegang secret. HMAC tidak membuktikan Sender ID SMS asli karena identitas pengirim SMS dapat dipalsukan.

## Pesan yang diterima

| Kategori | Format | Pengirim |
|---|---|---|
| Kode dummy | `LABTEST 123456` | Siapa pun pada SIM pengujian |
| Kode dummy | `Tes koneksi HP 123456` | Siapa pun pada SIM pengujian |
| Pengumuman uji | `INFO PUBLIK: Jadwal pengujian berlangsung` | Harus ada di `PUBLIC_NOTICE_SENDERS` |

Pengumuman ditolak jika mengandung angka, URL, email, atau istilah autentikasi. Allowlist kosong berarti pengumuman dinonaktifkan. Pesan lain menghasilkan status `ignored` dan tidak masuk database.

## Struktur proyek

```text
app/
  api/cleanup/route.js          endpoint Vercel Cron
  api/devices/route.js          metadata perangkat publik
  api/messages/route.js         daftar pesan aman publik
  api/webhook/[device]/route.js webhook hp1/hp2
  health/route.js               health check
  dashboard.js                  dashboard React
  globals.css                   tampilan responsif
lib/
  policy.js                     HMAC dan kebijakan konten
  repository.js                 query Supabase
  supabase.js                   client service-role server-only
  webhook.js                    alur pemrosesan webhook
schema.sql                      schema PostgreSQL + RLS
tests/                          unit test tanpa Supabase nyata
scripts/                        generator secret dan pengirim demo
vercel.json                     jadwal cleanup
```

## Persyaratan

- Node.js 20.9 atau lebih baru.
- Akun Supabase.
- Akun Vercel untuk deployment.
- Satu atau dua HP Android dengan SMS to URL Forwarder.
- SIM khusus pengujian yang tidak terhubung ke akun penting sangat disarankan.

## 1. Instalasi lokal

Clone atau buka folder proyek, lalu instal dependency:

```powershell
npm install
```

Buat secret lokal:

```powershell
node scripts/generate-secrets.mjs
```

Perintah tersebut membuat `.env.local` dan tidak akan menimpa file yang sudah ada. Jangan commit atau membagikan `.env.local`.

## 2. Membuat proyek Supabase

1. Masuk ke https://supabase.com/dashboard.
2. Pilih **New project**.
3. Tentukan organisasi, nama proyek, region, dan password database yang kuat.
4. Tunggu hingga proyek siap.
5. Buka **SQL Editor** lalu buat query baru.
6. Salin seluruh isi `schema.sql`, jalankan sekali, dan pastikan tidak ada error.

Schema aman dijalankan ulang karena menggunakan `CREATE TABLE IF NOT EXISTS` dan `CREATE INDEX IF NOT EXISTS`. RLS diaktifkan dan tidak ada policy untuk `anon` atau `authenticated`. Hanya backend dengan service-role yang boleh mengakses tabel.

## 3. Mengambil kredensial Supabase

Di Supabase Dashboard, buka **Project Settings > API** atau halaman API keys proyek:

- Project URL menjadi `SUPABASE_URL`.
- Secret/service-role key menjadi `SUPABASE_SERVICE_ROLE_KEY`.

Tambahkan ke `.env.local`:

```dotenv
SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="SECRET_SERVICE_ROLE_KEY"
```

Peringatan:

- Jangan menggunakan prefix `NEXT_PUBLIC_` pada service-role key.
- Jangan memasukkan service-role key ke source, browser, screenshot, atau repository.
- Publishable/anon key tidak diperlukan oleh aplikasi ini karena frontend tidak mengakses Supabase langsung.

Isi `.env.local` lengkap:

```dotenv
SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="SECRET_SERVICE_ROLE_KEY"
SMS_SECRET_HP1="SECRET_ACAK_MINIMAL_32_KARAKTER"
SMS_SECRET_HP2="SECRET_ACAK_MINIMAL_32_KARAKTER"
PUBLIC_NOTICE_SENDERS=""
CRON_SECRET="SECRET_CRON_ACAK"
```

Untuk mengaktifkan pengumuman, pisahkan sender yang dikelola sendiri dengan koma:

```dotenv
PUBLIC_NOTICE_SENDERS="+6281200001111,+6281200002222"
```

Nomor harus sama persis dengan field `from` dari aplikasi Android. Sender allowlist bukan autentikasi kuat dan hanya sesuai untuk pengumuman laboratorium berisiko rendah.

## 4. Menjalankan lokal

```powershell
npm run dev
```

Buka http://localhost:3000 dan periksa:

```text
http://localhost:3000/health
```

Respons yang diharapkan:

```json
{"ok":true,"mode":"nextjs-supabase-lab"}
```

Kirim pesan demo bertanda tangan HMAC:

```powershell
node scripts/send-demo.mjs http://localhost:3000 hp1 123456
```

Respons pertama seharusnya `saved`; mengirim payload identik kembali akan menjadi `duplicate`. Script membuat timestamp baru setiap dijalankan sehingga eksekusi terpisah dianggap request baru.

## 5. Pengujian dan build

```powershell
npm test
npm run build
npm start
```

Unit test tidak memerlukan Supabase. Build memvalidasi struktur Next.js. Pengujian integrasi database memerlukan proyek Supabase dan environment lokal yang benar.

## 6. Deploy ke Vercel

1. Push proyek ke repository GitHub/GitLab/Bitbucket privat atau publik tanpa `.env.local`.
2. Masuk ke https://vercel.com dan pilih **Add New > Project**.
3. Import repository.
4. Framework preset seharusnya terdeteksi sebagai **Next.js**.
5. Tambahkan seluruh environment variable berikut pada **Project Settings > Environment Variables**:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SMS_SECRET_HP1
SMS_SECRET_HP2
PUBLIC_NOTICE_SENDERS
CRON_SECRET
```

6. Terapkan variabel minimal pada Production. Tambahkan juga ke Preview hanya jika database preview memang disiapkan dan aman.
7. Klik **Deploy**.
8. Setelah deployment selesai, buka `https://DOMAIN-VERCEL/health` dan dashboard utama.
9. Periksa **Settings > Cron Jobs**. `vercel.json` menjadwalkan `/api/cleanup` setiap satu jam.

Vercel mengirim `Authorization: Bearer <CRON_SECRET>` saat menjalankan cron. Endpoint menolak request tanpa secret valid. Frekuensi cron yang tersedia dapat bergantung pada paket Vercel. Data tetap tersembunyi setelah 15 menit melalui filter query walaupun cleanup fisik terlambat.

Jangan menganggap deployment sudah terhubung ke HP sebelum URL dan HMAC di Android dikonfigurasi serta diuji.

## 7. Konfigurasi Android

Aplikasi referensi: https://github.com/bogkonstantin/android_income_sms_gateway_webhook

Buat aturan terpisah pada setiap HP:

| Aturan | Sender | Text filter | URL |
|---|---|---|---|
| Kode dummy | `*` pada SIM uji | `^(Tes koneksi HP|LABTEST) [0-9]{6}$` | `https://DOMAIN/api/webhook/hp1` |
| Pengumuman | Nomor milik sendiri | `^INFO PUBLIK: .+$` | `https://DOMAIN/api/webhook/hp1` |

Untuk HP kedua gunakan `/api/webhook/hp2` dan `SMS_SECRET_HP2`.

Pengaturan wajib:

- Aktifkan **Sign with HMAC-SHA-256**.
- Gunakan secret yang sesuai dengan perangkat.
- `Ignore SSL errors = OFF`.
- `Chunked mode = OFF`.
- Gunakan HTTPS domain deployment nyata.
- Jangan membuat wildcard tanpa filter pada SIM yang menerima SMS akun penting.

Filter Android adalah lapisan tambahan, bukan kontrol utama. Server selalu memvalidasi ulang seluruh payload.

## Kontrak API

### `POST /api/webhook/hp1` dan `/api/webhook/hp2`

Header:

```http
Content-Type: application/json
X-Signature: <64 karakter hex HMAC-SHA256>
```

HMAC dihitung dari byte request body yang persis sama. Batas body adalah 16 KB.

Contoh payload dummy:

```json
{"from":"DEMO-LAB","text":"Tes koneksi HP 482916","sentStamp":1793784000000,"receivedStamp":1793784000000,"sim":"0"}
```

Contoh respons:

```json
{"status":"saved","device":"hp1","category":"lab"}
{"status":"duplicate","device":"hp1","category":"lab"}
{"status":"ignored","reason":"not_public_test_message"}
{"error":"HMAC tidak valid"}
```

Status `ignored` memakai HTTP 200 tetapi pesan tidak tersimpan. HMAC salah memakai HTTP 401.

### `GET /api/devices`

Mengembalikan HP1 dan HP2, jumlah pesan yang belum kedaluwarsa, dan waktu pesan terbaru.

### `GET /api/messages?device=hp1`

Mengembalikan maksimal 50 data aman terbaru:

```json
{"device":"hp1","messages":[{"id":"lab-7","kind":"lab","sender":"PENGIRIM UJI","text":"Kode pengujian: 482916","code":"482916","received_at":"2026-11-04T10:00:00.000Z"}]}
```

API GET bersifat publik. Jangan menambahkan nomor asli, raw SMS, key, atau secret ke respons.

## Retensi dan deduplikasi

- API hanya membaca data dengan `created_at` dalam 15 menit terakhir.
- Vercel Cron menghapus data lama secara fisik.
- Hash SHA-256 dari `device + raw body` disimpan sebagai `request_hash` unik.
- Retry webhook yang byte-for-byte sama tidak menghasilkan baris ganda.
- Database hanya menyimpan kode dummy atau teks pengumuman aman, device ID, waktu, dan hash.

## Troubleshooting

| Masalah | Pemeriksaan |
|---|---|
| HTTP 401 webhook | Secret perangkat berbeda atau body berubah setelah HMAC dibuat |
| HTTP 200 `ignored` | Format pesan tidak termasuk kategori publik yang diizinkan |
| `unapproved_announcement_sender` | Allowlist kosong atau field `from` tidak sama persis |
| `unsafe_announcement` | Isi memuat angka, tautan, email, atau istilah autentikasi |
| HTTP 503 API | Periksa URL/key Supabase dan apakah `schema.sql` sudah dijalankan |
| Dashboard kosong | Pesan mungkin ditolak atau sudah melewati TTL 15 menit |
| Android tidak POST | Periksa permission SMS, filter, RCS vs SMS, baterai, dan Syslog aplikasi |
| Cron 401 | Pastikan `CRON_SECRET` tersedia pada environment Production |
| Build gagal karena Node | Gunakan Node.js 20.9 atau lebih baru |

## Batas keamanan

- Sender ID SMS dapat dipalsukan.
- Filter regex tidak mendeteksi semua PII atau data sensitif.
- Service-role Supabase melewati RLS, sehingga hanya boleh berada di backend.
- Proyek ini belum menyediakan login/admin dashboard atau inbox privat.
- Jika pesan privat diperlukan, buat sistem terpisah dengan login, consent, ownership SIM, kontrol akses per pengguna, audit, dan encryption at rest.

Jangan menghapus HMAC, membuka policy publik Supabase, menyimpan raw SMS, atau mengubah dashboard ini menjadi inbox OTP publik.
#   i n i - s m s  
 