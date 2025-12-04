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
        url: window.location.href,
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

function createTooltip(element, count) {
  const tooltip = document.createElement('div');
  tooltip.className = 'marketplace-analyzer-tooltip';
  tooltip.innerHTML = `
    <div style="font-weight: bold; color: #667eea; margin-bottom: 5px;">📊 Activity</div>
    <div style="font-size: 14px; color: #333;">Товаров: <strong>${count}</strong></div>
    <div style="font-size: 12px; color: #999; margin-top: 3px;">На этой странице отслежено</div>
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

  listings.forEach((listing) => {
    if (listing.element) {
      let tooltip = null;
      
      listing.element.addEventListener('mouseenter', (e) => {
        const rect = listing.element.getBoundingClientRect();
        
        if (!tooltip) {
          tooltip = createTooltip(listing.element, listings.length);
        }
        
        tooltip.style.left = (rect.left + rect.width / 2 - 60) + 'px';
        tooltip.style.top = (rect.top - 70) + 'px';
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
