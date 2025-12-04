console.log('Marketplace Analyzer Content Script Loaded');

const STORAGE_KEYS = {
  ACTIVITY_LOG: 'activity_log',
  LISTINGS: 'listings_data'
};

const MARKETPLACES = {
  avito: { 
    domain: 'avito.ru', 
    selector: '[data-marker]',
    salesSelector: '[data-marker] [class*="sales"]'
  },
  ozon: { 
    domain: 'ozon.ru', 
    selector: '[data-productid]',
    salesSelector: '[class*="sales"], [class*="sold"], [data-test*="sales"]'
  },
  yandex: { 
    domain: 'market.yandex.ru', 
    selector: '[data-autotest-id*="product"]',
    salesSelector: '[data-test*="rating"], [class*="sales"]'
  },
  aliexpress: { 
    domain: 'aliexpress.com', 
    selector: '[data-product-id]',
    salesSelector: '[class*="Sold"], [class*="sold"], [class*="buyers"]'
  },
  ebay: { 
    domain: 'ebay.com', 
    selector: '[data-itemid]',
    salesSelector: '[class*="SOLD"], [class*="sold"]'
  }
};

let activityCounter = 0;

function getCurrentMarketplace() {
  const hostname = window.location.hostname;
  for (const [key, config] of Object.entries(MARKETPLACES)) {
    if (hostname.includes(config.domain)) {
      return { name: key, config };
    }
  }
  return null;
}

function extractSalesCount(element, marketplace) {
  try {
    let salesCount = 0;
    let salesText = '';
    
    if (marketplace === 'ozon') {
      const ratingEl = element.querySelector('[class*="rating"]');
      const soldEl = element.querySelector('[class*="sold"]');
      if (ratingEl) {
        const match = ratingEl.textContent.match(/(\d+)\s*(?:продано|sold|buyers)/i);
        if (match) salesCount = parseInt(match[1]);
      }
      if (soldEl) {
        const match = soldEl.textContent.match(/(\d+)/);
        if (match) salesCount = parseInt(match[1]);
      }
    } 
    else if (marketplace === 'avito') {
      const ratingEl = element.querySelector('[class*="rating"]');
      if (ratingEl) {
        const match = ratingEl.textContent.match(/(\d+)/);
        if (match) salesCount = parseInt(match[1]);
      }
    }
    else if (marketplace === 'yandex') {
      const ratingEl = element.querySelector('[data-test*="rating"]');
      if (ratingEl) {
        const match = ratingEl.textContent.match(/(\d+)/);
        if (match) salesCount = parseInt(match[1]);
      }
    }
    else if (marketplace === 'aliexpress') {
      const buyersEl = element.querySelector('[class*="Buyers"]') || 
                      element.querySelector('[class*="buyers"]');
      if (buyersEl) {
        const match = buyersEl.textContent.match(/(\d+)/);
        if (match) salesCount = parseInt(match[1]);
      }
    }
    else if (marketplace === 'ebay') {
      const soldEl = element.querySelector('[class*="SOLD"]') ||
                    element.querySelector('[class*="sold"]');
      if (soldEl) {
        const match = soldEl.textContent.match(/(\d+)/);
        if (match) salesCount = parseInt(match[1]);
      }
    }
    
    return salesCount;
  } catch (error) {
    console.log('Error extracting sales:', error);
    return 0;
  }
}

function collectListingData() {
  const marketplace = getCurrentMarketplace();
  if (!marketplace) return null;

  const listingItems = document.querySelectorAll(marketplace.config.selector);
  const listings = [];

  listingItems.forEach((item, index) => {
    if (index < 100) {
      const title = item.textContent?.substring(0, 100) || 'Unknown';
      const salesCount = extractSalesCount(item, marketplace.name);
      
      listings.push({
        id: Math.random().toString(36).substr(2, 9),
        title: title.trim(),
        marketplace: marketplace.name,
        timestamp: Date.now(),
        url: window.location.href,
        sales: salesCount,
        element: item
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
        listings: listings.map(l => ({...l, element: undefined})),
        timestamp: Date.now(),
        url: window.location.href
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Message sent (background might be inactive)');
      } else {
        console.log('Activity tracked:', response);
        activityCounter++;
      }
    });
  }
}

function createTooltip(element, count, maxSales) {
  const tooltip = document.createElement('div');
  tooltip.className = 'marketplace-analyzer-tooltip';
  tooltip.innerHTML = `
    <div style="font-weight: bold; color: #667eea; margin-bottom: 5px;">📊 Analytics</div>
    <div style="font-size: 13px; color: #333; margin-bottom: 3px;">Товаров: <strong>${count}</strong></div>
    <div style="font-size: 13px; color: #e74c3c; margin-bottom: 3px;">📈 Продано: <strong>${maxSales > 0 ? maxSales : 'N/A'}</strong></div>
    <div style="font-size: 11px; color: #999; margin-top: 5px;">На этой странице</div>
  `;
  
  tooltip.style.cssText = `
    position: fixed;
    background: white;
    border: 2px solid #667eea;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    pointer-events: none;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(tooltip);
  return tooltip;
}

function addStylesheet() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-10px);
      }
    }
    
    .marketplace-analyzer-tooltip.hide {
      animation: slideOut 0.2s ease forwards;
    }
  `;
  document.head.appendChild(style);
}

function attachHoverListeners() {
  const marketplace = getCurrentMarketplace();
  if (!marketplace) return;

  const listings = collectListingData();
  if (!listings) return;

  const maxSales = Math.max(...listings.map(l => l.sales || 0));

  listings.forEach((listing) => {
    if (listing.element) {
      let tooltip = null;
      
      listing.element.addEventListener('mouseenter', (e) => {
        const rect = listing.element.getBoundingClientRect();
        
        if (!tooltip) {
          tooltip = createTooltip(listing.element, listings.length, listing.sales);
        }
        
        tooltip.style.left = (rect.left + rect.width / 2 - 80) + 'px';
        tooltip.style.top = (rect.top - 80) + 'px';
        tooltip.style.opacity = '1';
        tooltip.classList.remove('hide');
      });
      
      listing.element.addEventListener('mouseleave', () => {
        if (tooltip) {
          tooltip.classList.add('hide');
          setTimeout(() => {
            if (tooltip && tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
            tooltip = null;
          }, 200);
        }
      });
    }
  });
}

window.addEventListener('load', () => {
  console.log('Page loaded, starting tracking...');
  addStylesheet();
  trackActivity();
  setTimeout(attachHoverListeners, 500);
});

window.addEventListener('scroll', () => {
  trackActivity();
}, { passive: true });

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-productid], [data-marker], [data-itemid]')) {
    trackActivity();
    setTimeout(attachHoverListeners, 100);
  }
}, true);
