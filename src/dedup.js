/**
 * Deduplication module to prevent sending the same article twice.
 * Uses an in-memory Map with timestamps for auto-cleanup.
 */

// Map<string, number> : link hash -> timestamp when it was added
const sentItems = new Map();

// How long to keep items in the dedup cache (24 hours)
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Check if an item link is new (not yet sent).
 * @param {string} link - Article link/URL
 * @returns {boolean} true if the item is new
 */
function isNew(link) {
    if (!link) return false;
    return !sentItems.has(link);
}

/**
 * Mark an item as sent.
 * @param {string} link - Article link/URL
 */
function markSent(link) {
    if (!link) return;
    sentItems.set(link, Date.now());
}

/**
 * Clean up old entries from the dedup cache.
 * Removes items older than TTL_MS.
 */
function cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [link, timestamp] of sentItems.entries()) {
        if (now - timestamp > TTL_MS) {
            sentItems.delete(link);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} old entries from dedup cache`);
    }
}

/**
 * Get the current size of the dedup cache.
 * @returns {number}
 */
function getCacheSize() {
    return sentItems.size;
}

/**
 * Reset the dedup cache. Useful for testing.
 */
function reset() {
    sentItems.clear();
}

module.exports = { isNew, markSent, cleanup, getCacheSize, reset };
