const { app } = require('@azure/functions');
const { handleCommand } = require('../commands');
const { sendMessage } = require('../telegram');

app.http('cyberFeedWebhook', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'webhook',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            context.log('📩 Webhook received:', JSON.stringify(body).substring(0, 200));

            // Extract message or edited_message
            const message = body.message || body.edited_message;
            if (!message || !message.text) {
                return { status: 200, body: 'OK - no text message' };
            }

            const text = message.text.trim();
            const chatId = message.chat.id.toString();
            const from = message.from;
            const botToken = process.env.TELEGRAM_BOT_TOKEN;

            // Only process commands (messages starting with /)
            if (!text.startsWith('/')) {
                return { status: 200, body: 'OK - not a command' };
            }

            context.log(`🤖 Command: ${text} from ${from?.first_name || 'Unknown'} (${chatId})`);

            // Handle the command
            const response = await handleCommand(text, from);

            // Send response back to the user
            await sendMessage(botToken, chatId, response);

            return { status: 200, body: 'OK' };
        } catch (error) {
            context.log(`❌ Webhook error: ${error.message}`);
            context.log(error.stack);
            return { status: 200, body: 'OK - error handled' };
        }
    },
});
