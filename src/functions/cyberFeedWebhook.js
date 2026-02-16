const { app } = require('@azure/functions');
const { handleCommand } = require('../commands');
const { sendMessage, sendItems, escapeMarkdownV2 } = require('../telegram');
const { fetchAllFeeds } = require('../rssParser');
const { isNew, markSent, cleanup, clearCache } = require('../dedup');

app.http('cyberFeedWebhook', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'webhook',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            context.log('📩 Webhook received:', JSON.stringify(body).substring(0, 200));

            const message = body.message || body.edited_message;
            if (!message || !message.text) {
                return { status: 200, body: 'OK - no text message' };
            }

            const text = message.text.trim();
            const chatId = message.chat.id.toString();
            const from = message.from;
            const botToken = process.env.TELEGRAM_BOT_TOKEN;

            if (!text.startsWith('/')) {
                return { status: 200, body: 'OK - not a command' };
            }

            context.log(`🤖 Command: ${text} from ${from?.first_name || 'Unknown'} (${chatId})`);

            const response = await handleCommand(text, from);

            // Special handler for /refresh — sends multiple messages
            if (response && response.type === 'refresh') {
                await handleRefresh(botToken, chatId, context);
                return { status: 200, body: 'OK - refresh done' };
            }

            // Normal command — send single response
            await sendMessage(botToken, chatId, response);

            return { status: 200, body: 'OK' };
        } catch (error) {
            context.log(`❌ Webhook error: ${error.message}`);
            context.log(error.stack);
            return { status: 200, body: 'OK - error handled' };
        }
    },
});

/**
 * Handle /refresh — clear cache, fetch all feeds, send new items
 */
async function handleRefresh(botToken, chatId, context) {
    try {
        // 1. Notify user that refresh started
        await sendMessage(
            botToken,
            chatId,
            '🔄 *Refreshing semua feed\\.\\.\\.*\n\n⏳ _Mohon tunggu, sedang mengambil data dari 15 sumber\\._'
        );

        // 2. Clear dedup cache so all items are "new"
        clearCache();

        // 3. Fetch all feeds
        const allItems = await fetchAllFeeds();
        context.log(`📥 Refresh: fetched ${allItems.length} items`);

        if (allItems.length === 0) {
            await sendMessage(
                botToken,
                chatId,
                '😔 Tidak ada berita yang ditemukan saat ini\\.'
            );
            return;
        }

        // 4. Take top 10 items and send them
        const batch = allItems.slice(0, 10);
        const sentCount = await sendItems(botToken, chatId, batch);

        // 5. Mark all as sent
        for (const item of batch) {
            markSent(item.link);
        }
        cleanup();

        // 6. Send summary
        const summary = `✅ *Refresh selesai\\!*\n\n📊 ${allItems.length} artikel ditemukan\n📤 ${sentCount} berita terbaru dikirim`;
        await sendMessage(botToken, chatId, summary);

        context.log(`✅ Refresh done: sent ${sentCount} items`);
    } catch (error) {
        context.log(`❌ Refresh error: ${error.message}`);
        await sendMessage(
            botToken,
            chatId,
            `❌ Gagal refresh: ${escapeMarkdownV2(error.message)}`
        );
    }
}
