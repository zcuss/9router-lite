# 9Router Lite

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

**9Router Lite** is a rebuilt, lightweight edition of the original 9Router. This package is maintained as the author's own lite rebuild of the original project, designed to be lighter, more flexible, and support custom database configurations.

**Never stop coding. Save 20-40% tokens with RTK + auto-fallback to FREE & cheap AI models.**

**Connect AI code tools (Claude Code, Cursor, Antigravity, Copilot, Codex, Gemini, OpenCode, Cline, OpenClaw...) to many AI providers and models.**

[![npm](https://img.shields.io/npm/v/9router-lite.svg)](https://www.npmjs.com/package/9router-lite)
[![Downloads](https://img.shields.io/npm/dm/9router-lite.svg)](https://www.npmjs.com/package/9router-lite)
[![License](https://img.shields.io/npm/l/9router-lite.svg)](./LICENSE)

---

### 🤔 Why 9Router Lite?

**Stop wasting money, tokens and hitting limits:**

- ❌ Subscription quota expires unused every month
- ❌ Rate limits stop you mid-coding
- ❌ Tool outputs (git diff, grep, ls...) burn tokens fast
- ❌ Expensive APIs ($20-50/month per provider)

**9Router Lite solves this:**

- ✅ **RTK Token Saver** - Auto-compress tool_result, save 20-40% tokens
- ✅ **Maximize subscriptions** - Track quota, use every bit before reset
- ✅ **Auto fallback** - Subscription → Cheap → Free, zero downtime
- ✅ **Multi-account** - Round-robin between accounts per provider
- ✅ **Universal** - Works with any OpenAI/Claude-compatible CLI
- ✅ **Lite rebuild** - Reworked and packaged as `9router-lite`
- ✅ **DB Selectable** - Choose between SQL.js (local), PostgreSQL, or CockroachDB

---

### ⚡ Quick Start

#### Option 1 — npm (recommended for desktop):

```bash
npm install -g 9router-lite
9router-lite

# Or run directly with npx
npx 9router-lite
```

The package also keeps a compatibility alias:

```bash
9router
```

🎉 Dashboard opens at `http://localhost:20129`

#### Option 2 — Docker (server/VPS):

```bash
docker run -d --name 9router-lite -p 20129:20129 \
  -v "$HOME/.9router-lite:/app/data" -e DATA_DIR=/app/data \
  ghcr.io/YOUR_GITHUB_USERNAME/9router-lite:latest
```

Replace `YOUR_GITHUB_USERNAME` with the GitHub owner that publishes this fork.

---

### 🚀 CLI Options

```bash
9router-lite                    # Start with default settings
9router-lite --port 8080        # Custom port
9router-lite --no-browser       # Don't open browser
9router-lite --skip-update      # Skip auto-update check
9router-lite --help             # Show all options
```

**Dashboard**: `http://localhost:20129/dashboard`

---

### 💾 Data Location

- **macOS/Linux**: `~/.9router-lite/`
- **Windows**: `%APPDATA%/9router-lite/`
- **Docker**: `/app/data` (mount `$HOME/.9router-lite` to persist)

---

## Bahasa Indonesia

**9Router Lite** adalah rebuild ringan dari 9Router original yang gue susun ulang supaya lebih simpel, lebih enteng dipakai, dan lebih fleksibel untuk kebutuhan sendiri maupun orang lain.

**Jangan pernah berhenti coding. Hemat 20-40% token dengan RTK + auto-fallback ke model AI GRATIS & murah.**

**Hubungkan tool AI coding (Claude Code, Cursor, Antigravity, Copilot, Codex, Gemini, OpenCode, Cline, OpenClaw...) ke berbagai provider dan model AI.**

---

### 🤔 Kenapa 9Router Lite?

**Stop buang-buang uang, token, dan terkena rate limit:**

- ❌ Kuota langganan hangus sia-sia setiap bulan
- ❌ Rate limit menghentikan lo di tengah-tengah coding
- ❌ Output tool (git diff, grep, ls...) membakar token dengan cepat
- ❌ API mahal ($20-50/bulan per provider)

**9Router Lite menyelesaikan ini:**

- ✅ **RTK Token Saver** - Kompres otomatis tool_result, hemat 20-40% token
- ✅ **Maksimalkan langganan** - Lacak kuota, gunakan setiap bit sebelum reset
- ✅ **Auto fallback** - Langganan → Murah → Gratis, tanpa downtime
- ✅ **Multi-account** - Round-robin antar akun per provider
- ✅ **Universal** - Bekerja dengan CLI apa pun yang kompatibel dengan OpenAI/Claude
- ✅ **Lite rebuild** - Dibuat ulang dan dikemas sebagai `9router-lite`
- ✅ **Pilihan Database** - Pilih antara SQL.js (lokal), PostgreSQL, atau CockroachDB

---

### ⚡ Quick Start

#### Opsi 1 — npm (direkomendasikan untuk desktop):

```bash
npm install -g 9router-lite
9router-lite

# Atau jalankan langsung dengan npx
npx 9router-lite
```

Package ini juga menyediakan alias kompatibilitas:

```bash
9router
```

🎉 Dashboard terbuka di `http://localhost:20129`

#### Opsi 2 — Docker (server/VPS):

```bash
docker run -d --name 9router-lite -p 20129:20129 \
  -v "$HOME/.9router-lite:/app/data" -e DATA_DIR=/app/data \
  ghcr.io/YOUR_GITHUB_USERNAME/9router-lite:latest
```

Ganti `YOUR_GITHUB_USERNAME` dengan username GitHub lo.

---

### 🚀 Opsi CLI

```bash
9router-lite                    # Mulai dengan pengaturan default
9router-lite --port 8080        # Port kustom
9router-lite --no-browser       # Jangan buka browser otomatis
9router-lite --skip-update      # Lewati pemeriksaan pembaruan otomatis
9router-lite --help             # Tampilkan semua opsi
```

**Dashboard**: `http://localhost:20129/dashboard`

---

### 💾 Lokasi Data

- **macOS/Linux**: `~/.9router-lite/`
- **Windows**: `%APPDATA%/9router-lite/`
- **Docker**: `/app/data` (mount `$HOME/.9router-lite` untuk persistensi)

---

## Tentang Project Ini / About This Project

Project ini bukan mirror biasa. Ini adalah hasil karya rebuild yang gue bikin dari 9Router original dengan tujuan:
- bikin versi yang lebih ringan
- tetap nyaman dipakai sehari-hari
- lebih enak buat maintain dan publish sendiri
- lebih fleksibel untuk pemilihan database dan runtime packaging

This project is not a simple mirror. It is a custom rebuild of the original 9Router with the goal of providing a lighter, more maintainable, and database-flexible gateway for personal and community use.

---

## Publish ke npm via GitHub Actions

Repo ini sudah disiapkan supaya publish npm jalan dari GitHub Actions pakai secret `NPM_TOKEN`.

Flow-nya:
- push ke branch utama (`main`)

---

## Acknowledgments

- Rebuilt from the original 9Router idea and ecosystem
- **[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)** - Original Go implementation inspiration

## License

MIT License - see [LICENSE](LICENSE) for details.
