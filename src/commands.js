const { fetchAllFeeds } = require('./rssParser');
const { escapeMarkdownV2 } = require('./telegram');
const { FEEDS } = require('./feeds');
const { getCacheSize } = require('./dedup');

// Bot start time for uptime tracking
const BOT_START_TIME = new Date();

/**
 * Route a command to its handler.
 * @param {string} command - The command text (e.g., "/latest")
 * @param {Object} from - Telegram user object
 * @returns {Promise<string>} MarkdownV2 formatted response
 */
async function handleCommand(command, from) {
    const cmd = command.split(' ')[0].toLowerCase().replace(/@\w+$/, '');

    switch (cmd) {
        case '/start':
            return handleStart(from);
        case '/help':
            return handleHelp();
        case '/latest':
            return handleLatest();
        case '/cve':
            return handleCve();
        case '/news':
            return handleNews();
        case '/sources':
            return handleSources();
        case '/status':
            return handleStatus();
        default:
            return handleUnknown(cmd);
    }
}

/**
 * /start - Welcome message
 */
function handleStart(from) {
    const name = from?.first_name
        ? escapeMarkdownV2(from.first_name)
        : 'there';

    return [
        `🛡️ *Selamat Datang, ${name}\\!*`,
        '',
        '🤖 Saya *CyberFeed Bot* — asisten keamanan siber kamu\\.',
        '',
        'Saya akan otomatis mengirimkan berita cybersecurity',
        'dan vulnerability terbaru dari 15\\+ sumber terpercaya\\.',
        '',
        '⚡ *Fitur:*',
        '• 📡 Auto\\-feed setiap menit',
        '• 🔴 CVE \\& vulnerability alerts',
        '• 📰 Berita cybersecurity terkini',
        '• 🎯 On\\-demand fetch via commands',
        '',
        '💡 Ketik /help untuk melihat semua commands\\.',
    ].join('\n');
}

/**
 * /help - Command list
 */
function handleHelp() {
    return [
        '📖 *CyberFeed \\- Daftar Commands*',
        '',
        '🔹 /start — Intro \\& welcome',
        '🔹 /help — Tampilkan menu ini',
        '🔹 /latest — 5 berita terbaru \\(semua kategori\\)',
        '🔹 /cve — Vulnerability \\& CVE terbaru',
        '🔹 /news — Berita cybersecurity terbaru',
        '🔹 /sources — Daftar semua sumber feed',
        '🔹 /status — Status \\& statistik bot',
        '',
        '💡 _Bot juga otomatis kirim berita baru setiap menit\\._',
    ].join('\n');
}

/**
 * /latest - Fetch 5 latest articles (all categories)
 */
async function handleLatest() {
    try {
        const items = await fetchAllFeeds();
        if (items.length === 0) {
            return '😔 Tidak ada berita terbaru saat ini\\. Coba lagi nanti\\.';
        }

        const top5 = items.slice(0, 5);
        return formatItemsList('📰 *5 Berita Terbaru*', top5);
    } catch (error) {
        return `❌ Gagal mengambil berita: ${escapeMarkdownV2(error.message)}`;
    }
}

/**
 * /cve - Fetch latest CVE/vulnerability items
 */
async function handleCve() {
    try {
        const items = await fetchAllFeeds();
        const cveItems = items.filter((i) => i.category === 'cve');

        if (cveItems.length === 0) {
            return '✅ Tidak ada CVE baru saat ini\\. Sistem aman\\! 🛡️';
        }

        const top5 = cveItems.slice(0, 5);
        return formatItemsList('🔴 *Vulnerability Terbaru*', top5);
    } catch (error) {
        return `❌ Gagal mengambil CVE: ${escapeMarkdownV2(error.message)}`;
    }
}

/**
 * /news - Fetch latest news items
 */
async function handleNews() {
    try {
        const items = await fetchAllFeeds();
        const newsItems = items.filter((i) => i.category === 'news');

        if (newsItems.length === 0) {
            return '😔 Tidak ada berita baru saat ini\\.';
        }

        const top5 = newsItems.slice(0, 5);
        return formatItemsList('📰 *Cyber News Terbaru*', top5);
    } catch (error) {
        return `❌ Gagal mengambil berita: ${escapeMarkdownV2(error.message)}`;
    }
}

/**
 * /sources - List all feed sources
 */
function handleSources() {
    const cveFeeds = FEEDS.filter((f) => f.category === 'cve');
    const newsFeeds = FEEDS.filter((f) => f.category === 'news');

    let lines = ['🗂️ *Sumber Feed CyberFeed*', ''];

    lines.push(`*🔴 Vulnerability \\(${cveFeeds.length}\\):*`);
    for (const feed of cveFeeds) {
        lines.push(`  • ${escapeMarkdownV2(feed.name)}`);
    }

    lines.push('');
    lines.push(`*🔵 News \\(${newsFeeds.length}\\):*`);
    for (const feed of newsFeeds) {
        lines.push(`  • ${escapeMarkdownV2(feed.name)}`);
    }

    lines.push('');
    lines.push(`📊 Total: *${FEEDS.length}* sumber aktif`);

    return lines.join('\n');
}

/**
 * /status - Bot status info
 */
function handleStatus() {
    const now = new Date();
    const uptimeMs = now - BOT_START_TIME;
    const uptimeHours = Math.floor(uptimeMs / 3600000);
    const uptimeMins = Math.floor((uptimeMs % 3600000) / 60000);

    const startStr = BOT_START_TIME.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return [
        '⚙️ *CyberFeed Bot Status*',
        '',
        `🟢 *Status:* Online`,
        `⏱️ *Uptime:* ${escapeMarkdownV2(`${uptimeHours}j ${uptimeMins}m`)}`,
        `🕐 *Started:* ${escapeMarkdownV2(startStr)}`,
        `📡 *Feeds:* ${FEEDS.length} sumber aktif`,
        `💾 *Cache:* ${getCacheSize()} item di\\-dedup`,
        `⚡ *Interval:* Setiap 1 menit`,
        `🖥️ *Platform:* Azure Functions`,
        '',
        '💡 _Kirim /help untuk daftar commands\\._',
    ].join('\n');
}

/**
 * Unknown command handler
 */
function handleUnknown(cmd) {
    return [
        `❓ Command ${escapeMarkdownV2(cmd)} tidak dikenali\\.`,
        '',
        '💡 Ketik /help untuk melihat daftar commands\\.',
    ].join('\n');
}

/**
 * Format a list of items into a compact message.
 */
function formatItemsList(header, items) {
    let lines = [header, ''];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const num = `${i + 1}`;
        const title = escapeMarkdownV2(item.title);
        const source = escapeMarkdownV2(item.source);

        // Relative time
        const diffMs = Date.now() - item.pubDate;
        const diffHours = Math.floor(diffMs / 3600000);
        let timeStr;
        if (diffHours < 1) {
            timeStr = `${Math.floor(diffMs / 60000)}m lalu`;
        } else if (diffHours < 24) {
            timeStr = `${diffHours}j lalu`;
        } else {
            timeStr = `${Math.floor(diffHours / 24)}h lalu`;
        }

        // Short description (first 150 chars)
        let desc = '';
        if (item.description && item.description.length > 10) {
            desc = item.description.substring(0, 150).trim();
            if (item.description.length > 150) desc += '...';
            desc = `\n   _${escapeMarkdownV2(desc)}_`;
        }

        lines.push(`*${escapeMarkdownV2(num)}\\)* [${title}](${item.link})`);
        lines.push(`   ${source} • ${escapeMarkdownV2(timeStr)}${desc}`);
        lines.push('');
    }

    return lines.join('\n');
}

module.exports = { handleCommand };
