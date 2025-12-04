console.log('Background Service Worker Initialized');

const STORAGE_KEYS = {
  LISTINGS: 'listings_data',
  ACTIVITY_LOG: 'activity_log',
  SETTINGS: 'extension_settings',
  SYNC_TIME: 'last_sync_time'
};

let activityData = {
  totalActivities: 0,
  listings: [],
  lastUpdate: Date.now()
};

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated');
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACTIVITY_LOG]: [],
      [STORAGE_KEYS.LISTINGS]: [],
      [STORAGE_KEYS.SETTINGS]: {
        autoSync: true,
        syncInterval: 3600000,
        enableNotifications: true,
        marketplaces: ['avito', 'ozon', 'yandex', 'aliexpress', 'ebay']
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.action);
  
  if (request.action === 'TRACK_ACTIVITY') {
    handleTrackActivity(request.data, sender, sendResponse);
    return true;
  } else if (request.action === 'getStats') {
    handleGetStats(sendResponse);
    return true;
  } else if (request.action === 'clearData') {
    handleClearData(sendResponse);
    return true;
  }
});

async function handleTrackActivity(data, sender, sendResponse) {
  try {
    const storage = await chrome.storage.local.get([STORAGE_KEYS.ACTIVITY_LOG, STORAGE_KEYS.LISTINGS]);
    let activityLog = storage[STORAGE_KEYS.ACTIVITY_LOG] || [];
    let listings = storage[STORAGE_KEYS.LISTINGS] || [];

    const activity = {
      id: generateId(),
      type: data.type,
      count: data.count,
      timestamp: data.timestamp,
      url: data.url,
      marketplace: detectMarketplace(data.url)
    };

    activityLog.push(activity);
    if (activityLog.length > 1000) {
      activityLog = activityLog.slice(-1000);
    }

    if (data.listings) {
      listings = [...listings, ...data.listings];
      if (listings.length > 5000) {
        listings = listings.slice(-5000);
      }
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.ACTIVITY_LOG]: activityLog,
      [STORAGE_KEYS.LISTINGS]: listings
    });

    console.log('Activity saved, total:', activityLog.length);
    sendResponse({ success: true, total: activityLog.length });
  } catch (error) {
    console.error('Error handling activity:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetStats(sendResponse) {
  try {
    const storage = await chrome.storage.local.get([STORAGE_KEYS.ACTIVITY_LOG, STORAGE_KEYS.LISTINGS]);
    const activityLog = storage[STORAGE_KEYS.ACTIVITY_LOG] || [];
    const listings = storage[STORAGE_KEYS.LISTINGS] || [];

    sendResponse({
      totalActivities: activityLog.length,
      totalListings: listings.length,
      lastUpdate: Date.now()
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    sendResponse({ totalActivities: 0, totalListings: 0 });
  }
}

async function handleClearData(sendResponse) {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACTIVITY_LOG]: [],
      [STORAGE_KEYS.LISTINGS]: []
    });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error clearing data:', error);
    sendResponse({ success: false });
  }
}

function detectMarketplace(url) {
  if (url.includes('avito.ru')) return 'avito';
  if (url.includes('ozon.ru')) return 'ozon';
  if (url.includes('market.yandex.ru')) return 'yandex';
  if (url.includes('aliexpress.com')) return 'aliexpress';
  if (url.includes('ebay.com')) return 'ebay';
  return 'unknown';
}

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
