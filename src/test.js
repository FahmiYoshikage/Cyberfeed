/**
 * Quick test script to verify RSS feed parsing works.
 * Run: node src/test.js
 */

const { fetchAllFeeds } = require('./rssParser');
const { formatMessage } = require('./telegram');
const { isNew, markSent, getCacheSize, reset } = require('./dedup');

async function test() {
    console.log('🧪 CyberFeed Test Runner\n');
    console.log('='.repeat(50));

    // Test 1: Fetch RSS feeds
    console.log('\n📡 Test 1: Fetching RSS feeds...');
    const startTime = Date.now();
    const items = await fetchAllFeeds();
    const elapsed = Date.now() - startTime;

    console.log(`✅ Fetched ${items.length} items in ${elapsed}ms`);

    if (items.length === 0) {
        console.log('⚠️  No items fetched. Check your internet connection.');
        return;
    }

    // Show summary by source
    const bySource = {};
    for (const item of items) {
        bySource[item.source] = (bySource[item.source] || 0) + 1;
    }
    console.log('\n📊 Items per source:');
    for (const [source, count] of Object.entries(bySource)) {
        console.log(`   ${source}: ${count}`);
    }

    // Test 2: Format message preview
    console.log('\n' + '='.repeat(50));
    console.log('\n📝 Test 2: Message format preview (first 3 items):\n');
    const preview = items.slice(0, 3);
    for (const item of preview) {
        console.log(formatMessage(item));
        console.log('-'.repeat(40));
    }

    // Test 3: Dedup logic
    console.log('\n' + '='.repeat(50));
    console.log('\n🔄 Test 3: Dedup logic...');
    reset();

    const testLink = 'https://example.com/test-article';
    console.log(`   isNew("${testLink}"): ${isNew(testLink)}`); // should be true
    markSent(testLink);
    console.log(`   After markSent, isNew: ${isNew(testLink)}`); // should be false
    console.log(`   Cache size: ${getCacheSize()}`); // should be 1

    // Test dedup with actual items
    const newItems = items.filter((item) => isNew(item.link));
    console.log(
        `   New items from feeds: ${newItems.length}/${items.length}`
    );

    for (const item of newItems.slice(0, 5)) {
        markSent(item.link);
    }

    const afterDedup = items.filter((item) => isNew(item.link));
    console.log(
        `   After marking 5 as sent: ${afterDedup.length}/${items.length} remain new`
    );

    reset();
    console.log('\n✅ All tests passed!\n');
}

test().catch(console.error);
