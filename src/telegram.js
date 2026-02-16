const https = require('https');

const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Send a text message via Telegram Bot API using MarkdownV2.
 */
function sendMessage(botToken, chatId, text) {
    return new Promise((resolve, reject) => {
        const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;

        const postData = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'MarkdownV2',
            disable_web_page_preview: false,
            link_preview_options: {
                is_disabled: false,
                show_above_text: false,
                prefer_small_media: true,
            },
        });

        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) {
                        resolve(parsed);
                    } else {
                        reject(
                            new Error(`Telegram API error: ${parsed.description}`)
                        );
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Escape special MarkdownV2 characters for Telegram.
 */
function escapeMarkdownV2(text) {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Get severity/category badge for the item.
 */
function getCategoryBadge(item) {
    const badges = {
        cve: '🔴 VULNERABILITY',
        news: '🔵 CYBER NEWS',
    };
    return badges[item.category] || '⚪ INFO';
}

/**
 * Get source icon based on feed name.
 */
function getSourceIcon(source) {
    // Extract the emoji already in the source name
    const emojiMatch = source.match(
        /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/u
    );
    return emojiMatch ? emojiMatch[0] : '📰';
}

/**
 * Get clean source name without emoji prefix.
 */
function getCleanSourceName(source) {
    return source
        .replace(
            /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu,
            ''
        )
        .trim();
}

/**
 * Calculate relative time string (e.g., "2 jam lalu", "3 hari lalu").
 */
function getRelativeTime(pubDate) {
    const now = new Date();
    const diffMs = now - pubDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'Kemarin';
    return `${diffDays} hari lalu`;
}

/**
 * Format a feed item into a premium Telegram message.
 */
function formatMessage(item) {
    const badge = getCategoryBadge(item);
    const icon = getSourceIcon(item.source);
    const cleanSource = getCleanSourceName(item.source);

    const date = item.pubDate.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const relativeTime = getRelativeTime(item.pubDate);
    const escapedTitle = escapeMarkdownV2(item.title);
    const escapedSource = escapeMarkdownV2(cleanSource);
    const escapedDate = escapeMarkdownV2(date);
    const escapedRelative = escapeMarkdownV2(relativeTime);

    // Build the message
    let lines = [];

    // ── Header: Badge + Source ──
    lines.push(`${badge}`);
    lines.push(`${icon} *${escapedSource}*`);
    lines.push('');

    // ── Title ──
    lines.push(`*${escapedTitle}*`);
    lines.push('');

    // ── Description / Insight ──
    if (item.description && item.description.trim().length > 10) {
        // Clean up description
        let desc = item.description.trim();
        // Remove "Read more..." or similar suffixes
        desc = desc.replace(/\s*Read more\.{0,3}\s*$/i, '');
        desc = desc.replace(/\s*Continue reading\.{0,3}\s*$/i, '');

        if (desc.length > 0) {
            const escapedDesc = escapeMarkdownV2(desc);
            lines.push(`💡 _${escapedDesc}_`);
            lines.push('');
        }
    }

    // ── Footer: Time + Link ──
    lines.push(`🕐 ${escapedDate} \\(${escapedRelative}\\)`);
    lines.push('');
    lines.push(`📖 [Baca Selengkapnya ➜](${item.link})`);

    return lines.join('\n');
}

/**
 * Delay helper for rate limiting.
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send multiple items to Telegram with rate limiting.
 */
async function sendItems(botToken, chatId, items) {
    let sentCount = 0;

    for (const item of items) {
        try {
            const message = formatMessage(item);
            await sendMessage(botToken, chatId, message);
            sentCount++;
            // Rate limit: wait 150ms between messages to avoid Telegram limits
            await delay(150);
        } catch (error) {
            console.warn(
                `⚠️  Failed to send "${item.title}": ${error.message}`
            );
            // If MarkdownV2 parsing failed, try fallback plain text
            try {
                const fallback = `${item.source}\n${item.title}\n\n${item.description || ''}\n\n${item.link}`;
                await sendMessage(botToken, chatId, escapeMarkdownV2(fallback));
                sentCount++;
            } catch {
                console.warn(`⚠️  Fallback also failed for "${item.title}"`);
            }
        }
    }

    return sentCount;
}

module.exports = { sendMessage, formatMessage, sendItems, escapeMarkdownV2 };
