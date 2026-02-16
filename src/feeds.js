/**
 * RSS Feed sources for cybersecurity news and CVE updates.
 */

const FEEDS = [
  {
    name: '🔴 CISA KEV',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    category: 'cve',
    isJson: true,
  },
  {
    name: '🟠 SecurityWeek',
    url: 'https://feeds.feedburner.com/securityweek',
    category: 'news',
  },
  // NVD removed: spams old CVEs (lists by modification date, not publish date)
  {
    name: '📰 The Hacker News',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    category: 'news',
  },
  {
    name: '💻 BleepingComputer',
    url: 'https://www.bleepingcomputer.com/feed/',
    category: 'news',
  },
  {
    name: '🌑 Dark Reading',
    url: 'https://www.darkreading.com/rss.xml',
    category: 'news',
  },
  {
    name: '🔐 Krebs on Security',
    url: 'https://krebsonsecurity.com/feed/',
    category: 'news',
  },
  {
    name: '🛡️ SANS ISC',
    url: 'https://isc.sans.edu/rssfeed.xml',
    category: 'news',
  },
  // --- CVE / Vulnerability Feeds ---
  {
    name: '⚔️ Exploit-DB',
    url: 'https://www.exploit-db.com/rss.xml',
    category: 'cve',
  },
  {
    name: '🎯 Zero Day Initiative',
    url: 'https://www.zerodayinitiative.com/rss/published/',
    category: 'cve',
  },
  {
    name: '🏛️ CISA Advisories',
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    category: 'cve',
  },
  // --- Cybersecurity News Feeds ---
  {
    name: '🦠 Threatpost',
    url: 'https://threatpost.com/feed/',
    category: 'news',
  },
  {
    name: '🔬 Naked Security',
    url: 'https://nakedsecurity.sophos.com/feed/',
    category: 'news',
  },
  {
    name: '🧠 Schneier on Security',
    url: 'https://www.schneier.com/feed/',
    category: 'news',
  },
  {
    name: '🕵️ Security Affairs',
    url: 'https://securityaffairs.com/feed',
    category: 'news',
  },
];

module.exports = { FEEDS };
