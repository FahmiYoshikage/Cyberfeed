const { app } = require('@azure/functions');
const { fetchAllFeeds } = require('../rssParser');
const { sendItems } = require('../telegram');
const { isNew, markSent, cleanup, getCacheSize } = require('../dedup');

app.timer('cyberFeedTimer', {
    // Run every 1 minute
    schedule: '0 */1 * * * *',
    handler: async (myTimer, context) => {
        context.log('⚡ CyberFeed Timer triggered at:', new Date().toISOString());

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
            context.log('❌ TELEGRAM_BOT_TOKEN is not configured!');
            return;
        }

        if (!chatId || chatId === 'YOUR_CHAT_ID_HERE') {
            context.log('❌ TELEGRAM_CHAT_ID is not configured!');
            return;
        }

        try {
            // 1. Fetch all RSS feeds
            context.log('📡 Fetching RSS feeds...');
            const allItems = await fetchAllFeeds();
            context.log(`📥 Fetched ${allItems.length} total items from all feeds`);

            // 2. Filter new items only
            const newItems = allItems.filter((item) => isNew(item.link));
            context.log(`🆕 Found ${newItems.length} new items`);

            if (newItems.length === 0) {
                context.log('✅ No new items to send');
                return;
            }

            // 3. Limit batch size to avoid overwhelming Telegram (max 20 per run)
            const batch = newItems.slice(0, 20);

            // 4. Send to Telegram
            context.log(`📤 Sending ${batch.length} items to Telegram...`);
            const sentCount = await sendItems(botToken, chatId, batch);

            // 5. Mark all batch items as sent
            for (const item of batch) {
                markSent(item.link);
            }

            // 6. Periodic cleanup of old dedup entries
            cleanup();

            context.log(
                `✅ Done! Sent ${sentCount}/${batch.length} messages. Cache size: ${getCacheSize()}`
            );
        } catch (error) {
            context.log(`❌ Error in CyberFeed Timer: ${error.message}`);
            context.log(error.stack);
        }
    },
});
