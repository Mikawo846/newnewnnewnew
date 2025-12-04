// Content Script - Injected into marketplace pages

// Initialize listener for page messages
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data.fromMarketplaceAnalyzer) return;
  
  const action = event.data.action;
  
  if (action === 'COLLECT_LISTING_DATA') {
    const listingData = collectListingData();
    chrome.runtime.sendMessage({
      action: 'saveActivity',
      data: {
        type: 'listing_viewed',
        marketplace: detectMarketplace(),
        listingId: listingData.id,
        listingTitle: listingData.title,
        details: listingData
      }
    });
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getListingData') {
    sendResponse({ data: collectListingData() });
  } else if (request.action === 'injectTracking') {
    injectTrackingCode();
    sendResponse({ status: 'injected' });
  }
});

function detectMarketplace() {
  const hostname = window.location.hostname;
  if (hostname.includes('avito')) return 'avito';
  if (hostname.includes('market.yandex')) return 'yandex_market';
  if (hostname.includes('ozon')) return 'ozon';
  if (hostname.includes('aliexpress')) return 'aliexpress';
  if (hostname.includes('ebay')) return 'ebay';
  return 'unknown';
}

function collectListingData() {
  const marketplace = detectMarketplace();
  let data = {
    id: generateListingId(),
    title: '',
    price: '',
    currency: '',
    seller: '',
    date: new Date().toISOString(),
    url: window.location.href
  };
  
  switch(marketplace) {
    case 'avito':
      data = { ...data, ...parseAvitoData() };
      break;
    case 'yandex_market':
      data = { ...data, ...parseYandexMarketData() };
      break;
    case 'ozon':
      data = { ...data, ...parseOzonData() };
      break;
    case 'aliexpress':
      data = { ...data, ...parseAliexpressData() };
      break;
    case 'ebay':
      data = { ...data, ...parseEbayData() };
      break;
  }
  
  return data;
}

function parseAvitoData() {
  const data = {};
  try {
    const titleEl = document.querySelector('[itemprop="name"]');
    const priceEl = document.querySelector('[itemprop="price"]');
    data.title = titleEl ? titleEl.innerText : '';
    data.price = priceEl ? priceEl.getAttribute('content') : '';
  } catch (e) {
    console.log('Error parsing Avito data:', e);
  }
  return data;
}

function parseYandexMarketData() {
  const data = {};
  try {
    const titleEl = document.querySelector('h1');
    data.title = titleEl ? titleEl.innerText : '';
  } catch (e) {
    console.log('Error parsing Yandex Market data:', e);
  }
  return data;
}

function parseOzonData() {
  const data = {};
  try {
    const titleEl = document.querySelector('[data-testid="breadcrumbs"]')?.nextElementSibling?.querySelector('h1');
    data.title = titleEl ? titleEl.innerText : '';
  } catch (e) {
    console.log('Error parsing Ozon data:', e);
  }
  return data;
}

function parseAliexpressData() {
  const data = {};
  try {
    const titleEl = document.querySelector('.product-title');
    data.title = titleEl ? titleEl.innerText : '';
  } catch (e) {
    console.log('Error parsing Aliexpress data:', e);
  }
  return data;
}

function parseEbayData() {
  const data = {};
  try {
    const titleEl = document.querySelector('.it-ttl');
    data.title = titleEl ? titleEl.innerText : '';
  } catch (e) {
    console.log('Error parsing eBay data:', e);
  }
  return data;
}

function injectTrackingCode() {
  const script = document.createElement('script');
  script.textContent = `
    document.addEventListener('click', (e) => {
      const listing = e.target.closest('[data-item-id], .item, .product');
      if (listing) {
        window.postMessage({
          fromMarketplaceAnalyzer: true,
          action: 'COLLECT_LISTING_DATA'
        }, '*');
      }
    });
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

function generateListingId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id') || urlParams.get('item') || Math.random().toString(36).substr(2, 9);
}

// Auto-inject tracking on page load
injectTrackingCode();
