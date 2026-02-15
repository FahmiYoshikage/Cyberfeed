# 🛡️ CyberFeed Bot

Bot Telegram yang berjalan di **Azure Functions** untuk mengirim notifikasi CVE terbaru dan berita cybersecurity secara real-time.

## ✨ Fitur

- ⏱️ **Polling setiap 1 menit** via Azure Functions Timer Trigger
- 📡 **8 RSS/JSON feed sources** (CVE + cybersecurity news)
- 🔄 **Dedup otomatis** - tidak ada pesan duplikat
- 🚀 **Rate limiting** - aman dari Telegram API limit
- 📱 **Format Markdown** dengan emoji dan link

## 📡 Sumber Feed

| Sumber | Kategori |
|--------|----------|
| 🔴 CISA KEV (Known Exploited Vulnerabilities) | CVE |
| 🟠 SecurityWeek | News |
| 📋 NVD Recent | CVE |
| 📰 The Hacker News | News |
| 💻 BleepingComputer | News |
| 🌑 Dark Reading | News |
| 🔐 Krebs on Security | News |
| 🛡️ SANS ISC | News |

## 🚀 Setup

### 1. Buat Telegram Bot

1. Chat [@BotFather](https://t.me/BotFather) di Telegram
2. Kirim `/newbot` dan ikuti instruksi
3. Simpan **Bot Token** yang diberikan
4. Mulai chat dengan bot Anda, lalu kunjungi:
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```
5. Cari `chat.id` dari response JSON

### 2. Konfigurasi

Edit `local.settings.json`:
```json
{
  "Values": {
    "TELEGRAM_BOT_TOKEN": "123456:ABC-DEF...",
    "TELEGRAM_CHAT_ID": "123456789"
  }
}
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Run locally (butuh Azure Functions Core Tools)
npm start

# Atau test RSS parsing saja
npm test
```

### 4. Install Azure Functions Core Tools

```bash
# Ubuntu/Debian
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4

# Atau via npm
npm install -g azure-functions-core-tools@4
```

## 📁 Struktur Project

```
cyberFeed/
├── host.json              # Azure Functions host config
├── local.settings.json    # Environment variables (gitignored)
├── package.json           # Node.js dependencies
├── .env.example           # Template env vars
└── src/
    ├── feeds.js           # Daftar RSS feed sources
    ├── rssParser.js       # RSS/JSON feed parser
    ├── telegram.js        # Telegram Bot API client
    ├── dedup.js           # Dedup module (in-memory)
    ├── test.js            # Quick test script
    └── functions/
        └── cyberFeedTimer.js  # Azure timer trigger (1 min)
```

## 🔧 Deploy ke Azure

### Option 1: CLI (Recommended)

```bash
# Login ke Azure
az login

# Deploy via func
func azure functionapp publish CyberFeed-TelegramBot --javascript
```

### Option 2: Manual Zip Deploy (Jika CLI Gagal)

Jika mengalami error network/SSL saat deploy via CLI:

1. Buat file zip dari source code (exclude node_modules):
   ```bash
   zip -r deploy.zip . -x "node_modules/*" ".env" ".env.example" "src/test.js" "src/testLocal.js"
   ```
2. Buka **Function App** di Azure Portal
3. Pergi ke **Development Tools** > **Advanced Tools** > **Go** (Kudu)
4. Di Kudu, buka menu **Tools** > **Zip Push Deploy** (`/ZipDeployUI`)
5. Drag & drop file `deploy.zip` ke halaman tersebut
6. Tunggu hingga status deploy sukses ✅

## 📝 Catatan

- **Dedup**: Menggunakan in-memory Map, akan reset saat function app restart. Untuk persistence, upgrade ke Azure Table Storage.
- **Rate Limit**: Maks 20 pesan per trigger run, dengan delay 100ms antar pesan.
- **Error Handling**: Satu feed error tidak menghentikan feed lainnya (menggunakan `Promise.allSettled`).
