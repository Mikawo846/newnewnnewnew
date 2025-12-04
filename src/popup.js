const STORAGE_KEYS = { ACTIVITY_LOG: 'activity_log', LISTINGS: 'listings_data' };

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded, initializing...');
  await loadStats();
  setupEventListeners();
  await loadRecentActivities();
});

async function loadStats() {
  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting stats:', chrome.runtime.lastError);
          resolve();
          return;
        }
        
        if (response && response.totalActivities !== undefined) {
          const activitiesEl = document.getElementById('total-activities');
          const listingsEl = document.getElementById('total-listings');
          if (activitiesEl) activitiesEl.textContent = response.totalActivities;
          if (listingsEl) listingsEl.textContent = response.totalListings || 0;
          console.log('Stats loaded:', response);
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('Error in loadStats:', error);
  }
}

async function loadRecentActivities() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.ACTIVITY_LOG);
    const activities = data[STORAGE_KEYS.ACTIVITY_LOG] || [];
    const listEl = document.getElementById('activity-list');
    
    if (!listEl) {
      console.error('activity-list element not found');
      return;
    }
    
    if (activities.length === 0) {
      listEl.innerHTML = '<li class="empty-state">No activity yet</li>';
      return;
    }
    
    const items = activities.slice(-10).reverse().map(activity => {
      const title = activity.title || 'Unknown';
      const time = formatTime(activity.timestamp);
      return '<li class="activity-item"><span class="title">' + title + '</span><span class="time">' + time + '</span></li>';
    });
    
    listEl.innerHTML = items.join('');
    console.log('Recent activities loaded');
  } catch (error) {
    console.error('Error loading activities:', error);
  }
}

function setupEventListeners() {
  const clearBtn = document.getElementById('clear-btn');
  const exportBtn = document.getElementById('export-btn');
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearData);
    console.log('Clear button listener attached');
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
    console.log('Export button listener attached');
  }
}

async function clearData() {
  if (confirm('Delete all data?')) {
    chrome.runtime.sendMessage({ action: 'clearData' }, async () => {
      if (!chrome.runtime.lastError) {
        await loadStats();
        await loadRecentActivities();
        alert('Data cleared');
      }
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
    a.download = 'marketplace-activity-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Data exported');
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data');
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
  if (days < 30) return days + 'd ago';
  
  return date.toLocaleDateString();
}
