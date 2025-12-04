console.log('Marketplace Analyzer Content Script Loaded');

const STORAGE_KEYS = {
  ACTIVITY_LOG: 'activity_log',
  LISTINGS: 'listings_data'
};

const MARKETPLACES = {
  avito: { 
    domain: 'avito.ru', 
    selector: '[data-marker]'
  },
  ozon: { 
    domain: 'ozon.ru', 
    selector: '[data-productid]'
  },
  yandex: { 
    domain: 'market.yandex.ru', 
    selector: '[data-autotest-id*="product"]'
  },
  aliexpress: { 
    domain: 'aliexpress.com', 
    selector: '[data-product-id]'
  },
  ebay: { 
    domain: 'ebay.com', 
    selector: '[data-itemid]'
  }
};

let activityTracker = {
  lastTrack: 0
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

function extractListingTitle(element) {
  const titleEl = element.querySelector('[class*="title"]') || 
                  element.querySelector('h1') || 
                  element.querySelector('h2') || 
                  element.querySelector('a');
  return (titleEl ? titleEl.textContent : 'Unknown').substring(0, 100).trim();
}

function collectListingData() {
  const marketplace = getCurrentMarketplace();
  if (!marketplace) return null;
  
  const listingItems = document.querySelectorAll(marketplace.config.selector);
  const listings = [];
  
  listingItems.forEach((item, index) => {
    if (index < 50 && listings.length < 50) {
      const title = extractListingTitle(item);
      
      listings.push({
        id: Math.random().toString(36).substr(2, 9),
        title: title,
        marketplace: marketplace.name,
        timestamp: Date.now(),
        url: window.location.href
      });
    }
  });
  
  return listings;
}

function trackActivity() {
  const now = Date.now();
  
  if (now - activityTracker.lastTrack < 2000) {
    return;
  }
  
  activityTracker.lastTrack = now;
  
  const listings = collectListingData();
  
  if (listings && listings.length > 0) {
    console.log('Tracking', listings.length, 'listings');
    
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
        console.log('Message error:', chrome.runtime.lastError.message);
      } else if (response) {
        console.log('Tracked successfully');
      }
    });
  }
}

window.addEventListener('load', () => {
  console.log('Content script ready');
  trackActivity();
});

window.addEventListener('scroll', () => {
  trackActivity();
}, { passive: true });

document.addEventListener('click', () => {
  setTimeout(trackActivity, 100);
}, true);

setTimeout(() => {
  trackActivity();
}, 500);
