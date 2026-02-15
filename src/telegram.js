const https = require('https');
const http = require('http');

const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Send a text message via Telegram Bot API.
 * @param {string} botToken - Telegram bot token
 * @param {string} chatId - Target chat ID
 * @param {string} text - Message text (Markdown supported)
 * @returns {Promise<Object>} Telegram API response
 */
function sendMessage(botToken, chatId, text) {
    return new Promise((resolve, reject) => {
        const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;

        const postData = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
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
                        reject(new Error(`Telegram API error: ${parsed.description}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse Telegram response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Format a feed item into a pretty Telegram message.
 * @param {Object} item - Feed item { title, link, source, category, pubDate, description }
 * @returns {string} Formatted message string
 */
function formatMessage(item) {
    const date = item.pubDate.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const categoryIcon = item.category === 'cve' ? '🚨' : '📰';

    let msg = `${categoryIcon} *${item.source}*\n`;
    msg += `📌 ${escapeMarkdown(item.title)}\n`;

    if (item.description) {
        msg += `📝 _${escapeMarkdown(item.description)}_\n`;
    }

    msg += `🔗 [Baca selengkapnya](${item.link})\n`;
    msg += `📅 ${date}`;

    return msg;
}

/**
 * Escape special Markdown characters for Telegram.
 */
function escapeMarkdown(text) {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * Delay helper for rate limiting.
 * @param {number} ms - Delay in milliseconds
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send multiple items to Telegram with rate limiting.
 * @param {string} botToken
 * @param {string} chatId
 * @param {Array} items - Array of feed items
 * @returns {Promise<number>} Number of messages sent successfully
 */
async function sendItems(botToken, chatId, items) {
    let sentCount = 0;

    for (const item of items) {
        try {
            const message = formatMessage(item);
            await sendMessage(botToken, chatId, message);
            sentCount++;
            // Rate limit: wait 100ms between messages to avoid Telegram limits
            await delay(100);
        } catch (error) {
            console.warn(`⚠️  Failed to send message: ${error.message}`);
        }
    }

    return sentCount;
}

module.exports = { sendMessage, formatMessage, sendItems, escapeMarkdown };
