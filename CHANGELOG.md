# Changelog

## 2.0.0 - 2026-11-04

- Migrasi runtime Cloudflare Workers ke Next.js App Router untuk Vercel.
- Migrasi D1 ke Supabase PostgreSQL dengan RLS aktif dan tanpa policy publik.
- Pertahankan kontrak webhook, HMAC per perangkat, deduplikasi, dan TTL 15 menit.
- Tambahkan endpoint cleanup yang dilindungi `CRON_SECRET` dan konfigurasi Vercel Cron.
- Jadwalkan cleanup sekali sehari agar kompatibel dengan batas Vercel Hobby; TTL API tetap 15 menit.
- Migrasi dashboard static menjadi React Client Component responsif.
- Pisahkan kebijakan konten, pemrosesan webhook, dan repository agar dapat diuji tanpa database nyata.
- Perbarui dokumentasi instalasi lokal, Supabase, Vercel, dan Android.
