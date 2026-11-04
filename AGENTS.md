# AGENTS.md - Handoff untuk AI coding agent

Baca file ini bersama `README.md` setiap kali melanjutkan proyek.

## Konteks

- Bahasa UI dan dokumentasi: Bahasa Indonesia.
- Stack utama: Next.js App Router, JavaScript, Supabase PostgreSQL, dan Vercel.
- Frontend tidak mengakses Supabase langsung. Seluruh akses database melalui Route Handler server-side.
- Pengguna memiliki 1-2 HP Android dengan SMS to URL Forwarder dan HMAC berbeda per perangkat.
- Source belum terbukti live atau terhubung ke HP pengguna. Jangan mengklaim deployment produksi berhasil tanpa verifikasi.
- Instalasi Python lokal pengguna adalah sistem terpisah.

## Tujuan yang diizinkan

1. Menerima pesan dummy `LABTEST 123456` atau `Tes koneksi HP 123456`.
2. Menerima `INFO PUBLIK: ...` dari sender dalam `PUBLIC_NOTICE_SENDERS`.
3. Menampilkan hanya data non-sensitif pada dashboard publik.
4. Meningkatkan keamanan, observabilitas tanpa PII, UX, deployment, dan pengujian.

## Invarian wajib

- SMS bukan sumber tepercaya. Sender ID dapat dipalsukan; HMAC hanya mengautentikasi HP pengirim webhook.
- Jangan simpan raw SMS, nomor pribadi, service-role key, HMAC secret, atau data autentikasi dalam database/log/response.
- HMAC-SHA256 dihitung dari raw request body dan secret berbeda untuk `hp1` dan `hp2`.
- `/api/devices` dan `/api/messages` publik dan tidak boleh mengandung PII atau secret.
- Validasi harus server-side. Filter Android dan frontend bukan kontrol keamanan utama.
- Pengumuman memerlukan prefix, allowlist sender, dan larangan digit/link/kata autentikasi. Allowlist default kosong.
- Batasi body 16 KB, deduplikasi melalui request hash unik, TTL 15 menit, dan render React tanpa HTML mentah.
- Supabase service-role key hanya boleh ada di server dan tidak boleh memakai prefix `NEXT_PUBLIC_`.
- RLS kedua tabel harus aktif tanpa policy publik. Jangan membuka akses anon langsung.
- Sistem pesan privat harus dirancang terpisah dengan login, consent, ownership, access control, audit, dan encryption at rest.

## File penting

- `app/api/webhook/[device]/route.js`: entrypoint webhook.
- `lib/webhook.js`: validasi raw body dan orkestrasi penyimpanan.
- `lib/policy.js`: HMAC dan kebijakan kategori pesan.
- `lib/repository.js`: query Supabase dan TTL.
- `app/api/devices/route.js`, `app/api/messages/route.js`: API publik.
- `app/api/cleanup/route.js`: cleanup yang dilindungi `CRON_SECRET`.
- `app/dashboard.js`: UI dan polling 20 detik.
- `schema.sql`: PostgreSQL schema, constraints, index, RLS.
- `.env.example`: daftar environment variable tanpa secret nyata.
- `tests/*.test.js`: unit test tanpa database nyata.

## Cara kerja

1. Baca `README.md`, file ini, dan source terkait.
2. Tentukan perubahan kontrak API/data sebelum mengedit.
3. Pertahankan tes OTP eksternal, HMAC, device isolation, sender spoofing, deduplikasi, dan TTL.
4. Jalankan `npm test` dan `npm run build`.
5. Jangan deploy, merotasi secret, atau menjalankan schema pada database produksi tanpa izin jelas.
6. Catat perubahan arsitektur/schema di README dan CHANGELOG.

## Kriteria minimum

- Pesan dummy tersimpan tanpa menyimpan sender.
- OTP pihak ketiga tidak pernah diteruskan ke repository.
- Pengumuman hanya lolos dengan allowlist dan konten aman.
- Signature salah menghasilkan HTTP 401 dan secret HP terisolasi.
- Retry identik menghasilkan fingerprint identik untuk constraint deduplikasi.
- API publik hanya membentuk data generik yang belum melewati TTL.
- `npm test` dan `npm run build` lulus.
