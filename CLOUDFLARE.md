# Cloudflare Deployment Guide for Relay SaaS

Aplikasi Next.js 16 ini dikonfigurasi menggunakan mode **standalone**. Karena membutuhkan runtime Node.js native, koneksi database PostgreSQL (CockroachDB), dan file sistem/kriptografi, murni deploy ke Cloudflare Workers tanpa modifikasi akan memicu error limitasi runtime.

Berikut adalah 2 arsitektur deployment yang direkomendasikan untuk menempatkan Relay di belakang infrastruktur Cloudflare.

---

## Opsi A: Cloudflare Tunnel (Recommended)
Cara termudah dan paling stabil. Aplikasi tetap berjalan di VPS (misal: port 20129) menggunakan runtime Node.js full, kemudian di-expose aman ke internet via Cloudflare Tunnel.

### Langkah-langkah
1. **Instal cloudflared di VPS:**
   ```bash
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
   chmod +x /usr/local/bin/cloudflared
   ```
2. **Login Cloudflare CLI:**
   ```bash
   cloudflared tunnel login
   ```
3. **Buat Tunnel Baru:**
   ```bash
   cloudflared tunnel create relay-tunnel
   ```
4. **Buat File Konfigurasi (`~/.cloudflared/config.yml`):**
   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

   ingress:
     - hostname: relay.domain.com
       service: http://localhost:20129
     - service: http_status:404
   ```
5. **Daftarkan DNS Route:**
   ```bash
   cloudflared tunnel route dns relay-tunnel relay.domain.com
   ```
6. **Jalankan Tunnel sebagai Service:**
   ```bash
   cloudflared tunnel service install
   systemctl start cloudflared
   ```

---

## Opsi B: Serverless Workers (via OpenNext)
Jika Anda ingin deploy ke infrastruktur Serverless Cloudflare secara native, Anda harus menggunakan adapter **OpenNext** untuk men-transform output standalone ke bentuk worker.

### Syarat Database (Critical)
Cloudflare Workers berjalan di environment V8 isolasi (non-Node). Workers **tidak mendukung koneksi TCP raw** PostgreSQL default.
- Anda **wajib** mengkonfigurasi **Cloudflare Hyperdrive** di dashboard Cloudflare untuk memproksi koneksi ke CockroachDB.
- Alternatif lain: Gunakan database connection pooler HTTP (misal: Prisma Data Proxy, Neon Serverless Driver, atau Supabase Connection Pooler).

### File Konfigurasi wrangler.toml (Template)
Buat file `wrangler.toml` di root folder:

```toml
name = "relay-saas"
main = ".open-next/worker.js"
compatibility_date = "2024-05-02"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

# Definisikan Hyperdrive untuk CockroachDB / Postgres TCP Bypass
[[hyperdrive]]
binding = "DB"
id = "<HYPERDRIVE_ID>"
local_connection_string = "postgresql://root@localhost:26257/defaultdb"

[vars]
NEXT_PUBLIC_API_URL = "https://relay.domain.com"
MIDTRANS_IS_PRODUCTION = "false"
# Pindahkan semua credentials sensitif ke Cloudflare Secrets (wrangler secret put KEY)
```

### Build & Deploy Command
Jalankan langkah ini di pipeline CI/CD atau terminal lokal:
1. Build aplikasi:
   ```bash
   npm run build
   ```
2. Jalankan OpenNext Cloudflare adapter:
   ```bash
   npx @opennextjs/cloudflare@latest build
   ```
3. Deploy ke Cloudflare:
   ```bash
   npx wrangler deploy
   ```
