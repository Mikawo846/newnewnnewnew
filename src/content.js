console.log('Marketplace Analyzer Content Script Loaded');

const STORAGE_KEYS = {
  ACTIVITY_LOG: 'activity_log',
  LISTINGS: 'listings_data'
};

const MARKETPLACES = {
  avito: { domain: 'avito.ru', selector: '[data-marker]' },
  ozon: { domain: 'ozon.ru', selector: '[data-productid]' },
  yandex: { domain: 'market.yandex.ru', selector: '[data-autotest-id*="product"]' },
  aliexpress: { domain: 'aliexpress.com', selector: '[data-product-id]' },
  ebay: { domain: 'ebay.com', selector: '[data-itemid]' }
};

function getCurrentMarketplace() {
  const hostname = window.location.hostname;
  for (const [key, config] of Object.entries(MARKETPLACES)) {
    if (hostname.includes(config.domain)) {
      return { name: key, config };
    }
  }
  return null;
}

function collectListingData() {
  const marketplace = getCurrentMarketplace();
  if (!marketplace) return null;

  const listingItems = document.querySelectorAll(marketplace.config.selector);
  const listings = [];

  listingItems.forEach((item, index) => {
    if (index < 50) {
      const title = item.textContent?.substring(0, 100) || 'Unknown';
      listings.push({
        id: Math.random().toString(36).substr(2, 9),
        title: title.trim(),
        marketplace: marketplace.name,
        timestamp: Date.now(),
        url: window.location.href
      });
    }
  });

  return listings;
}

function trackActivity() {
  console.log('Tracking activity...');
  const listings = collectListingData();
  
  if (listings && listings.length > 0) {
    chrome.runtime.sendMessage({
      action: 'TRACK_ACTIVITY',
      data: {
        type: 'listings_viewed',
        count: listings.length,
        listings: listings,
        timestamp: Date.now(),
        url: window.location.href
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Message sent (background might be inactive)');
      } else {
        console.log('Activity tracked:', response);
      }
    });
  }
}

window.addEventListener('load', () => {
  console.log('Page loaded, starting tracking...');
  trackActivity();
});

window.addEventListener('scroll', () => {
  trackActivity();
}, { passive: true });

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-productid], [data-marker], [data-itemid]')) {
    trackActivity();
  }
}, true);
