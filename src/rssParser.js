const RssParser = require('rss-parser');
const { FEEDS } = require('./feeds');

// Only include articles from the last 7 days
const MAX_AGE_DAYS = 7;

const parser = new RssParser({
    timeout: 15000,
    headers: {
        'User-Agent': 'CyberFeedBot/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
    },
});

/**
 * Fetch CISA KEV JSON feed.
 * @param {Object} feed - Feed config
 * @returns {Promise<Array>} Array of parsed items
 */
async function fetchJsonFeed(feed) {
    try {
        const response = await fetch(feed.url, {
            headers: { 'User-Agent': 'CyberFeedBot/1.0' },
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // CISA KEV format: { vulnerabilities: [ { cveID, vendorProject, product, ... } ] }
        const vulns = data.vulnerabilities || [];
        // Only take the most recent 20
        return vulns.slice(-20).reverse().map((v) => ({
            title: `${v.cveID} - ${v.vendorProject} ${v.product}`,
            link: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
            source: feed.name,
            category: feed.category,
            pubDate: v.dateAdded ? new Date(v.dateAdded) : new Date(),
            description: v.shortDescription
                ? v.shortDescription.substring(0, 200)
                : `${v.vulnerabilityName || ''}`.substring(0, 200),
        }));
    } catch (error) {
        console.warn(`⚠️  Failed to fetch ${feed.name}: ${error.message}`);
        return [];
    }
}

/**
 * Fetch and parse a single RSS feed.
 * @param {Object} feed - Feed config { name, url, category }
 * @returns {Promise<Array>} Array of parsed items
 */
async function fetchFeed(feed) {
    // Route JSON feeds to dedicated handler
    if (feed.isJson) return fetchJsonFeed(feed);

    try {
        const result = await parser.parseURL(feed.url);
        return (result.items || []).map((item) => ({
            title: item.title || 'No title',
            link: item.link || '',
            source: feed.name,
            category: feed.category,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            description: item.contentSnippet
                ? item.contentSnippet.substring(0, 200)
                : '',
        }));
    } catch (error) {
        console.warn(`⚠️  Failed to fetch ${feed.name}: ${error.message}`);
        return [];
    }
}

/**
 * Fetch all configured RSS feeds in parallel.
 * Uses Promise.allSettled so one failure doesn't block others.
 * @returns {Promise<Array>} All items from all feeds, sorted newest first
 */
async function fetchAllFeeds() {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));

    const allItems = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value);

    // Filter: only keep articles from the last MAX_AGE_DAYS
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);

    const recentItems = allItems.filter((item) => item.pubDate >= cutoffDate);

    const filtered = allItems.length - recentItems.length;
    if (filtered > 0) {
        console.log(`🗓️  Filtered out ${filtered} old articles (older than ${MAX_AGE_DAYS} days)`);
    }

    // Sort by date, newest first
    recentItems.sort((a, b) => b.pubDate - a.pubDate);

    return recentItems;
}

module.exports = { fetchAllFeeds, fetchFeed };
