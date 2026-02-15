#!/usr/bin/env node
/**
 * 🧪 Local Test Script - Test bot tanpa Azure Functions
 * 
 * Jalankan: node src/testLocal.js
 * 
 * Script ini akan:
 * 1. Baca credentials dari .env file
 * 2. Fetch semua RSS feeds
 * 3. Kirim berita terbaru ke Telegram kamu
 */

const fs = require('fs');
const path = require('path');
const { fetchAllFeeds } = require('./rssParser');
const { sendItems, formatMessage, sendMessage } = require('./telegram');
const { isNew, markSent, getCacheSize, reset } = require('./dedup');

// Load .env file manually
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ File .env tidak ditemukan! Buat file .env dulu.');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    }
}

async function main() {
    loadEnv();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || botToken.includes('YOUR_')) {
        console.error('❌ TELEGRAM_BOT_TOKEN belum di-set di .env!');
        process.exit(1);
    }
    if (!chatId || chatId.includes('YOUR_')) {
        console.error('❌ TELEGRAM_CHAT_ID belum di-set di .env!');
        process.exit(1);
    }

    console.log('🤖 CyberFeed Bot - Local Test');
    console.log('='.repeat(50));
    console.log(`📱 Chat ID: ${chatId}`);
    console.log(`🔑 Bot Token: ${botToken.substring(0, 10)}...`);
    console.log('');

    // Step 1: Send test message
    console.log('📤 Mengirim pesan test ke Telegram...');
    try {
        await sendMessage(botToken, chatId,
            '🤖 *CyberFeed Bot \\- Test*\n\n✅ Bot berhasil terhubung\\!\nMulai mengambil berita cybersecurity\\.\\.\\.'
        );
        console.log('✅ Pesan test berhasil dikirim! Cek Telegram kamu.\n');
    } catch (error) {
        console.error(`❌ Gagal kirim pesan test: ${error.message}`);
        console.error('   Cek BOT_TOKEN dan CHAT_ID kamu.');
        process.exit(1);
    }

    // Step 2: Fetch RSS feeds
    console.log('📡 Mengambil berita dari RSS feeds...');
    const allItems = await fetchAllFeeds();
    console.log(`📥 Total ${allItems.length} artikel ditemukan\n`);

    // Show summary per source
    const bySource = {};
    for (const item of allItems) {
        bySource[item.source] = (bySource[item.source] || 0) + 1;
    }
    console.log('📊 Per sumber:');
    for (const [source, count] of Object.entries(bySource)) {
        console.log(`   ${source}: ${count}`);
    }
    console.log('');

    // Step 3: Filter new items
    const newItems = allItems.filter((item) => isNew(item.link));

    // Limit to 5 items for testing
    const batch = newItems.slice(0, 5);
    console.log(`📤 Mengirim ${batch.length} berita terbaru ke Telegram...\n`);

    // Step 4: Send to Telegram
    const sentCount = await sendItems(botToken, chatId, batch);

    for (const item of batch) {
        markSent(item.link);
    }

    console.log(`\n✅ Selesai! ${sentCount} pesan berhasil dikirim ke Telegram.`);
    console.log('📱 Cek Telegram kamu sekarang!');
}

main().catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
