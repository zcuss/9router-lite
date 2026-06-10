# Vercel Deployment Instructions for 9router-lite

Karena v2 dibatalkan dan semua digabung langsung ke `9router-lite` (v1), ikuti langkah ini untuk setup di Vercel:

## Langkah Setup:
1. Pastikan Anda mengimpor folder `/root/workspace/9router-lite` ke repositori Git Anda.
2. Di Dashboard Vercel, tambahkan Environment Variables berikut:
   - `DATABASE_URL`: URL PostgreSQL/CockroachDB Anda (contoh: `postgresql://user:pass@host:port/db`)
   - `DB_DRIVER`: `postgres` atau `cockroach`
   - `IS_BUILD_STEP`: `true` (opsional, untuk mempercepat build time)
3. Set Project Settings:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
4. Deploy!

## Catatan Penting:
- **Tanpa Daemon**: Vercel menjalankan Next.js secara Serverless. Daemon latar belakang seperti `tailscale` dan `cloudflared` otomatis dinonaktifkan di Vercel, tetapi dashboard dan API inti tetap berfungsi penuh menggunakan remote database.
- **SQLite Bypass**: SQLite lokal tidak digunakan di Vercel, sistem otomatis memotong fallback SQLite dan mewajibkan koneksi remote PostgreSQL/CockroachDB.
