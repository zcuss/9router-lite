# PRODUCT REQUIREMENTS DOCUMENT (PRD) - 9ROUTER-LITE V2

## 1. AUTHENTICATION & RBAC (ROLE-BASED ACCESS CONTROL)

### Mekanisme Keamanan
- **Autentikasi**: Username & password hashing via bcrypt (salt round 10).
- **Sesi**: Stateless JWT disimpan di HttpOnly Cookie (Secure, SameSite=Strict).
- **Middleware**: Guard Next.js memvalidasi JWT & Role pada route `/api/v1/*` dan `/api/management/*`.

### Matriks Akses Role
| Fitur / Hak Akses | Admin | Dev | Premium+ | Premium | User |
| :--- | :--- | :--- | :--- | :--- | :--- |
| CRUD Provider Key | ✅ (Auto-Approve) | ⚠️ (Pending state) | ❌ | ❌ | ❌ |
| Approve/Reject Request | ✅ | ❌ | ❌ | ❌ | ❌ |
| Buat Global Combo | ✅ | ❌ | ❌ | ❌ | ❌ |
| Buat Personal Combo | ✅ | ✅ | ✅ (Unlimited) | ✅ (Maks 10 target) | ❌ (Hanya default) |
| Algoritma Cost/Latency | ✅ | ✅ | ✅ | ❌ | ❌ |
| Rate Limit Harian | ❌ | ❌ | ❌ | ⚠️ (Longgar) | ⚠️ (Ketat) |
| Dashboard Override (Unlock) | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 2. GOVERNANCE & APPROVAL WORKFLOW

### Siklus Status Koneksi
1. **Submit** (Dev) → Status `pending`. Simpan di DB.
2. **Edit** (Dev) → Config aktif tetap jalan. Perubahan masuk kolom `pending_revision` (JSON).
3. **Approve** (Admin) → `pending_revision` replace config utama → Status `approved`.
4. **Reject** (Admin) → `pending_revision` dihapus, config lama tetap aktif → Status `rejected`.
5. **Delete Request** (Dev) → Status `delete_pending` → Nonaktif untuk routing baru → Approve Admin untuk hapus permanen.

---

## 3. SKEMA DATABASE DDL (COCKROACHDB)

```sql
-- 1. Tabel Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username STRING UNIQUE NOT NULL,
  password_hash STRING NOT NULL,
  role STRING NOT NULL DEFAULT 'user',
  status STRING NOT NULL DEFAULT 'pending',
  approved_by UUID NULL REFERENCES users(id),
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel Provider Connections
CREATE TABLE provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name STRING NOT NULL,
  provider STRING NOT NULL,
  api_key STRING NOT NULL, -- Ciphertext AES-256-GCM
  base_url STRING NULL,
  status STRING NOT NULL DEFAULT 'pending',
  allowed_roles JSONB NOT NULL DEFAULT '["admin","dev","premium+"]',
  submitted_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID NULL REFERENCES users(id),
  approved_at TIMESTAMPTZ NULL,
  rejection_reason STRING NULL,
  pending_revision JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabel Provider Locks (Audit & Sync fallback)
CREATE TABLE provider_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES provider_connections(id) ON DELETE CASCADE,
  model STRING NOT NULL,
  lock_type STRING NOT NULL,
  reason STRING NOT NULL,
  locked_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL REFERENCES users(id),
  UNIQUE (connection_id, model)
);

-- 4. Tabel Routing Combos
CREATE TABLE routing_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name STRING NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabel Combo Targets
CREATE TABLE combo_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID REFERENCES routing_combos(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES provider_connections(id) ON DELETE CASCADE,
  model STRING NOT NULL,
  step_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (combo_id, step_order)
);

-- 6. Tabel Usage Logs
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role STRING NOT NULL,
  combo_id STRING NULL,
  combo_step INT DEFAULT 0,
  connection_id UUID NULL REFERENCES provider_connections(id) ON DELETE SET NULL,
  provider STRING NOT NULL,
  model STRING NOT NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  cost_in NUMERIC DEFAULT 0,
  cost_out NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  latency_ms INT NOT NULL,
  status_code INT NOT NULL,
  error_message STRING NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Database Performance Indexing
CREATE INDEX idx_usage_user ON usage_logs(user_id);
CREATE INDEX idx_usage_combo ON usage_logs(combo_id);
CREATE INDEX idx_usage_model ON usage_logs(model);
CREATE INDEX idx_usage_created ON usage_logs(created_at);
CREATE INDEX idx_provider_status ON provider_connections(status);
CREATE INDEX idx_combo_user ON routing_combos(user_id);
```

---

## 4. SECURE KEY ENCRYPTION STANDARDS

- **Standard**: **AES-256-GCM** (Galois/Counter Mode).
- **Flow**: API Key dienkripsi di level server Next.js sebelum disimpan ke CockroachDB.
- **Key Storage**: Master key 32-byte disimpan aman pada environment variable (`ENCRYPTION_SECRET`).
- **Data Payload**: Hasil enkripsi menyimpan `ciphertext` + `iv` + `authTag` untuk verifikasi integritas data dekripsi.

---

## 5. CIRCUIT BREAKER & FAST-FAILING CACHE (REDIS)

Mencegah latensi akibat query CockroachDB berulang untuk mengecek status lock model:
- **In-Memory Caching**: Status lock disimpan ke Redis lokal.
- **Key Pattern**: `lock:{connection_id}:{model}`.
- **TTL**:
  - Soft Lock (Rate limit/429): TTL disinkronkan dengan target lock (misal 5-30 menit).
  - Hard Lock (Invalid Auth/Quota): TTL tanpa batas (Manual Unlock).
- **Routing Decision**:
  - Request masuk → Cek Redis via `EXISTS lock:{connection_id}:{model}`.
  - `1` (Terkuci) → Skip koneksi, fallback ke provider berikutnya.
  - `0` (Normal) → Eksekusi request.
  - Database CockroachDB hanya di-write secara asinkron untuk audit log & history lock.

---

## 6. RATE LIMITING (SLIDING WINDOW REDIS)

- **Teknologi**: Redis Sorted Set (`ZSET`) untuk kalkulasi real-time sliding window 24 jam.
- **Key**: `user:quota:{user_id}`.
- **Algoritma**:
  1. Bersihkan request expired: `ZREMRANGEBYSCORE user:quota:{user_id} 0 {now - 86400}`.
  2. Hitung jumlah request aktif: `ZCARD user:quota:{user_id}`.
  3. Bandingkan dengan limit role (User: 100/hari, Premium: 1000/hari).
  4. Jika overload → Blokir dengan status HTTP `429`.
  5. Jika aman → Catat request baru: `ZADD user:quota:{user_id} {now} {uuid}`.

---

## 7. USAGE & ACCURATE COST ENGINE

- **Token Extraction**:
  - Non-streaming: Parse `usage` object pada response body upstream.
  - Streaming: Tangkap chunk terakhir (OpenAI/Anthropic) ATAU jalankan token estimator lokal (`gpt-tokenizer`) pada akumulasi input & output text.
- **Cost Calculation**:
  $$\text{Cost} = \frac{(\text{prompt\_tokens} \times \text{price\_in}) + (\text{completion\_tokens} \times \text{price\_out})}{1.000.000}$$
- **Combo Cost Accumulation**:
  - Step gagal tanpa token usage → Cost `0`.
  - Step gagal parsial (mengeluarkan token sebelum putus/timeout) → Biaya parsial dihitung sebagai `retry_overhead_cost`.
  - Step sukses → Dihitung penuh.

---

## 8. CLIENT-SIDE CRASH PROTECTION (i18n FIX)

- **Problem**: Transisi render client-side playground memutus context `NextIntlClientProvider` sehingga memicu crash.
- **Solusi**: Custom hook `useSafeTranslations` untuk menangani exception context.

```typescript
// src/i18n/useSafeTranslations.ts
"use client";

import { useTranslations } from "next-intl";

export function useSafeTranslations(namespace?: string) {
  try {
    return useTranslations(namespace);
  } catch (error) {
    const fallbackT = (key: string) => key;
    fallbackT.rich = (key: string) => key;
    fallbackT.markup = (key: string) => key;
    fallbackT.raw = (key: string) => key;
    return fallbackT as any;
  }
}
```

Semua component client di `/playground` wajib menggunakan hook ini.

---

## 9. DESIGN & VISUAL THEMING (ZEROAGENT x 9ROUTER)

- **Tema ZeroAgent**: Dark mode solid (`#050505`), border ultra tipis transparan (`rgba(255, 255, 255, 0.05)`), teks putih pekat & abu-abu redup, aksen hijau neon (`#00ff66`), font monospace untuk data metrik & token.
- **Layout UI 9router**: Sidebar minimalis statis di kiri. Card layout tegas (`rounded-[12px]`).
- **Indikator Status**:
  - Hijau: Approved / Aktif.
  - Kuning: Pending / Menunggu Approval.
  - Merah: Locked / Circuit Breaker Aktif.
  - Abu-abu: Disabled.