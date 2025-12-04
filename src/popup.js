const STORAGE_KEYS = { ACTIVITY_LOG: 'activity_log', LISTINGS: 'listings_data' };

document.addEventListener('DOMContentLoaded', async () => {
  loadStats();
  setupEventListeners();
  loadRecentActivities();
});

async function loadStats() {
  try {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
      if (response && response.totalActivities !== undefined) {
        const activitiesEl = document.getElementById('total-activities');
        const listingsEl = document.getElementById('total-listings');
        if (activitiesEl) activitiesEl.textContent = response.totalActivities;
        if (listingsEl) listingsEl.textContent = response.totalListings || 0;
      }
    });
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadRecentActivities() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.ACTIVITY_LOG);
    const activities = data[STORAGE_KEYS.ACTIVITY_LOG] || [];
    const listEl = document.getElementById('activity-list');
    
    if (!listEl) return;
    
    if (activities.length === 0) {
      listEl.innerHTML = '<li class="empty-state">No activity yet</li>';
      return;
    }
    
    const items = activities.slice(0, 10).map(activity => {
      const title = activity.listingTitle || 'Unknown';
      const time = formatTime(activity.timestamp);
      return '<li class="activity-item"><span class="title">' + title + '</span><span class="time">' + time + '</span></li>';
    });
    
    listEl.innerHTML = items.join('');
  } catch (error) {
    console.error('Error loading activities:', error);
  }
}

function setupEventListeners() {
  const clearBtn = document.getElementById('clear-btn');
  const exportBtn = document.getElementById('export-btn');
  
  if (clearBtn) clearBtn.addEventListener('click', clearData);
  if (exportBtn) exportBtn.addEventListener('click', exportData);
}

async function clearData() {
  if (confirm('Delete all data?')) {
    chrome.runtime.sendMessage({ action: 'clearData' }, () => {
      loadStats();
      loadRecentActivities();
      alert('Data cleared');
    });
  }
}

async function exportData() {
  try {
    const data = await chrome.storage.local.get([STORAGE_KEYS.ACTIVITY_LOG, STORAGE_KEYS.LISTINGS]);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marketplace-data-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting data:', error);
  }
}

function formatTime(timestamp) {
  if (!timestamp) return 'unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + 'm ago';
  if (hours < 24) return hours + 'h ago';
  return days + 'd ago';
}
