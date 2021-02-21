/**
 * @file Background Service Runner
 * @version 1.0.0
 * @license MIT
 */

/**
 * Fetch gas data every minute
 * @property {delayInMinutes} Integer
 * @property {periodInMinutes} Integer
 * @property {URL_GASNOW} gasonow.org - ?utm_source=:SushiSwapMonitor for tracking
 */
const delayInMinutes = 1;
const periodInMinutes = 1;
const URL_GASNOW = 'https://www.gasnow.org/api/v3/gas/price?utm_source=:SushiSwapMonitor';

chrome.alarms.create('fetch_gasData', {
  delayInMinutes,
  periodInMinutes,
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'fetch_gasData') {
    fetchGasData();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetch_gasData') {
    fetchGasData();
  }
});

function fetchGasData() {
  fetch(URL_GASNOW)
    .then((r) => r.json())
    .then((resData) => {
      const gasData = resData?.data;
      const timestamp = gasData?.timestamp;
      const gasPrices = {};
      Object.keys(gasData).map((k) => {
        if (k !== 'timestamp') {
          gasPrices[k] = Math.round(parseInt(gasData[k]) * 1e-9);
        }
      });
      chrome.storage.sync.set({ gasData: { gasPrices, timestamp } });
    });
}

// FIXME CSS COLORING
//  @note Update Badge when gas data or selected level is updated
SPEED_COLORS = {
  rapid: '#00c718',
  fast: '#ff7828',
  standard: '#0060ff',
  slow: '#9160f2',
};
function updateBadge(value, level) {
  chrome.action.setBadgeText({ text: String(value) });
  chrome.action.setBadgeBackgroundColor({ color: SPEED_COLORS[level] });
}

// @note Check if gas price target from an alert is met and send notification, then clear alert
function checkAndNotify() {
  chrome.storage.local.get('alert', (r) => {
    const level = r?.alert?.level;
    const targetGasPrice = r?.alert?.value;
    if (Number.isInteger(targetGasPrice) && targetGasPrice > 0) {
      chrome.storage.sync.get('gasData', (r) => {
        const currentGasPrice = r?.gasData?.gasPrices?.[level];
        if (currentGasPrice <= targetGasPrice) {
          chrome.storage.local.set({ alert: { level: null, value: 0 } });
          registration.showNotification('Ethereum Gas Watcher', {
            body: `The ${level} gas price is now ${currentGasPrice} gwei!\nYou set a notification for ${targetGasPrice} gwei.`,
            badge: './icons/icon64.png',
            icon: './icons/icon64.png',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            actions: [{ action: 'Close', title: 'Close' }],
          });
        }
      });
    }
  });
}

// @note  Listener to update the badge with level and gas price
chrome.storage.onChanged.addListener((changes, area) => {
  checkAndNotify();
  if (area === 'sync') {
    if ('gasData' in changes) {
      chrome.storage.sync.get({ level: 'standard' }, (r) => {
        const gasPrice = changes?.gasData?.newValue?.gasPrices?.[r?.level];
        if (gasPrice > 0) {
          updateBadge(gasPrice, r?.level);
        }
      });
    } else if ('level' in changes) {
      chrome.storage.sync.get('gasData', (r) => {
        const gasPrice = r?.gasData?.gasPrices?.[changes?.level?.newValue];
        if (gasPrice > 0) {
          updateBadge(gasPrice, changes?.level?.newValue);
        }
      });
    }
  }
});

// @note Do initial fetch
fetchGasData();
