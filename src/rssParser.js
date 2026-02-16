const RssParser = require('rss-parser');
const { FEEDS } = require('./feeds');

// Only include articles from the last 7 days
const MAX_AGE_DAYS = 7;

// Max items per feed to prevent one source from dominating
const MAX_ITEMS_PER_FEED = 5;

// For NVD: only include CVEs from recent years
const MIN_CVE_YEAR = new Date().getFullYear() - 1; // current year and last year

const parser = new RssParser({
    timeout: 15000,
    headers: {
        'User-Agent': 'CyberFeedBot/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
    },
});

/**
 * Extract CVE year from title (e.g., "CVE-2023-12345" -> 2023)
 */
function getCveYear(title) {
    const match = title.match(/CVE-(\d{4})-/i);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Filter NVD items: only keep CVEs from recent years
 */
function filterNvdItems(items) {
    return items.filter((item) => {
        const year = getCveYear(item.title);
        // If no CVE ID found, keep the item
        if (year === null) return true;
        // Only keep CVEs from MIN_CVE_YEAR onwards
        return year >= MIN_CVE_YEAR;
    });
}

/**
 * Fetch CISA KEV JSON feed.
 */
async function fetchJsonFeed(feed) {
    try {
        const response = await fetch(feed.url, {
            headers: { 'User-Agent': 'CyberFeedBot/1.0' },
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const vulns = data.vulnerabilities || [];
        // Only take the most recent entries, limited
        return vulns
            .slice(-MAX_ITEMS_PER_FEED)
            .reverse()
            .map((v) => ({
                title: `${v.cveID} - ${v.vendorProject} ${v.product}`,
                link: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
                source: feed.name,
                category: feed.category,
                pubDate: v.dateAdded ? new Date(v.dateAdded) : new Date(),
                description: v.shortDescription
                    ? v.shortDescription.substring(0, 500)
                    : `${v.vulnerabilityName || ''}`.substring(0, 500),
            }));
    } catch (error) {
        console.warn(`⚠️  Failed to fetch ${feed.name}: ${error.message}`);
        return [];
    }
}

/**
 * Fetch and parse a single RSS feed.
 */
async function fetchFeed(feed) {
    if (feed.isJson) return fetchJsonFeed(feed);

    try {
        const result = await parser.parseURL(feed.url);
        let items = (result.items || []).map((item) => ({
            title: item.title || 'No title',
            link: item.link || '',
            source: feed.name,
            category: feed.category,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            description: item.contentSnippet
                ? item.contentSnippet.substring(0, 500)
                : '',
        }));

        // Special filter for NVD: only recent CVE years
        if (feed.name.includes('NVD')) {
            items = filterNvdItems(items);
        }

        // Limit items per feed
        return items.slice(0, MAX_ITEMS_PER_FEED);
    } catch (error) {
        console.warn(`⚠️  Failed to fetch ${feed.name}: ${error.message}`);
        return [];
    }
}

/**
 * Fetch all configured RSS feeds in parallel.
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
        console.log(
            `🗓️  Filtered out ${filtered} old articles (older than ${MAX_AGE_DAYS} days)`
        );
    }

    // Sort by date, newest first
    recentItems.sort((a, b) => b.pubDate - a.pubDate);

    return recentItems;
}

module.exports = { fetchAllFeeds, fetchFeed };
