// Background Service Worker for Marketplace Activity Analyzer

const STORAGE_KEYS = {
  LISTINGS: 'listings_data',
  ACTIVITY_LOG: 'activity_log',
  SETTINGS: 'extension_settings',
  SYNC_TIME: 'last_sync_time'
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Initialize default settings
    const defaultSettings = {
      autoSync: true,
      syncInterval: 3600000, // 1 hour
      enableNotifications: true,
      marketplaces: ['avito', 'yandex_market', 'ozon', 'aliexpress', 'ebay']
    };
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: defaultSettings,
      [STORAGE_KEYS.LISTINGS]: [],
      [STORAGE_KEYS.ACTIVITY_LOG]: []
    });
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveActivity') {
    handleSaveActivity(request.data, sender.url);
    sendResponse({ status: 'success' });
  } else if (request.action === 'getStats') {
    handleGetStats().then(stats => sendResponse(stats));
  } else if (request.action === 'clearData') {
    handleClearData().then(() => sendResponse({ status: 'success' }));
  }
  return true;
});

async function handleSaveActivity(data, sourceUrl) {
  try {
    const response = await chrome.storage.local.get(STORAGE_KEYS.ACTIVITY_LOG);
    const currentLog = response[STORAGE_KEYS.ACTIVITY_LOG] || [];
    
    const newEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: data.type,
      marketplace: data.marketplace,
      listingId: data.listingId,
      listingTitle: data.listingTitle,
      url: sourceUrl,
      details: data.details
    };
    
    currentLog.unshift(newEntry);
    if (currentLog.length > 1000) {
      currentLog.pop();
    }
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACTIVITY_LOG]: currentLog,
      [STORAGE_KEYS.SYNC_TIME]: Date.now()
    });
  } catch (error) {
    console.error('Error saving activity:', error);
  }
}

async function handleGetStats() {
  try {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.ACTIVITY_LOG,
      STORAGE_KEYS.LISTINGS
    ]);
    
    const activityLog = data[STORAGE_KEYS.ACTIVITY_LOG] || [];
    const listings = data[STORAGE_KEYS.LISTINGS] || [];
    
    return {
      totalActivities: activityLog.length,
      totalListings: listings.length,
      recentActivities: activityLog.slice(0, 10)
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { error: error.message };
  }
}

async function handleClearData() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACTIVITY_LOG]: [],
    [STORAGE_KEYS.LISTINGS]: []
  });
}

function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now();
}
