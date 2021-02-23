/**
 * @file Popup Modal
 * @summaary Chrome Extenstion dialog popup
 * @license MIT
 */

/**
 * @global  Add a listener that reacts to storage changes in gas and alert data
 */
chrome.storage.onChanged.addListener(updateListener);

// Gracefully remove the listener when the popup is closed
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    chrome.storage.onChanged.removeListener(updateListener);
  }
});

/**
 * Listener Function
 * @param {updateListener} [area] - Listener function that will update the popup when the storage data is changed
 */
function updateListener(changes, area) {
  if (area === 'sync' && 'gasData' in changes) {
    updateDisplay(changes?.gasData?.newValue);
  } else if (area === 'local' && 'alert' in changes) {
    updateAlert(changes?.alert?.newValue);
  }
}

/**
 * Adjust gas prices and timestamp
 * @param {updateDisplay} gasData - Adjust gas prices and timestamp
 * @return {timestamp} Price
 */
function updateDisplay(gasData) {
  if (gasData != null) {
    for (const [key, value] of Object.entries(gasData.gasPrices)) {
      document.getElementById(`price-${key}`).innerHTML = String(value);
    }
    updateTime(gasData.timestamp);
  }
}

/**
 * alert
 * @summary Triggered when the popup is opened or when storage is changed
 * @param {updateAlert} alert - Show or hide information about an active alert
 */
function updateAlert(alert) {
  if (Number.isInteger(alert?.value) && alert?.value > 0) {
    document.getElementById('show-alert').classList.remove('div-hidden');
    document.getElementById(
      'alert-text'
    ).innerHTML = `Notification set for <strong>${alert.level}</strong> at ${alert.value} gwei.`;
  } else {
    document.getElementById('show-alert').classList.add('div-hidden');
  }
}

//  @note Updating the "last updated" notification every 2 seconds
setInterval(() => {
  chrome.storage.sync.get('gasData', (r) => {
    updateTime(r?.gasData?.timestamp);
  });
}, 2000);

function updateTime(timestamp) {
  const secondsPassed = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  let timeString = `${secondsPassed} second${secondsPassed === 1 ? '' : 's'}`;
  if (secondsPassed >= 60) {
    const minutesPassed = Math.floor(secondsPassed / 60);
    timeString = `${minutesPassed} minute${minutesPassed === 1 ? '' : 's'}`;
  }
  document.getElementById('last-update').innerHTML = timeString;

  // @dev As long as popup is open, attempt to refresh every 20 seconds
  if (secondsPassed > 20) {
    chrome.runtime.sendMessage({ action: 'fetch_gasData' });
  }
}

// @note Allow selecting a default gas price via click listener
LEVELS = ['rapid', 'fast', 'standard', 'slow'];
function setDefaultLevel(level) {
  const list = document.querySelector('#display-gas-prices>ul')?.children;
  for (let i = 0; i < list.length; i++) {
    list[i].className = level === i ? 'selected' : '';
  }
  chrome.storage.sync.set({ level: LEVELS[level] });
  document.getElementById('alert-type').innerText = LEVELS[level];
}

document.addEventListener('DOMContentLoaded', () => {
  for (const li of document.querySelectorAll('#display-gas-prices>ul>li')) {
    const defaultLevel = Array.from(li.parentNode.children).indexOf(li);
    li.addEventListener('click', () => setDefaultLevel(defaultLevel));
  }
  chrome.storage.sync.get({ level: 'standard' }, (r) => {
    document.getElementById(`${r?.level}`).className = 'selected';
  });
});

// @note Context menu (right click) for setting alert
document.addEventListener(
  'contextmenu',
  (event) => {
    const price_box = event.target.closest('li');
    if (price_box) {
      event.preventDefault();
      chrome.storage.sync.get({ level: 'standard' }, (r) => {
        const current_box = document.getElementById(`${r?.level}`);
        setDefaultLevel(Array.from(price_box.parentNode.children).indexOf(price_box));
        if (current_box === price_box) {
          document.getElementById('set-alert').classList.toggle('div-hidden');
        } else {
          document.getElementById('set-alert').classList.remove('div-hidden');
        }
      });
    }
  },
  { capture: true }
);

// @note Listen to submission of a new alert (gas price target)
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('alert-form').addEventListener('submit', (event) => {
    event.preventDefault();
    chrome.storage.sync.get({ level: 'standard' }, (r) => {
      let input_field = document.getElementById('alert-value');
      let value;
      value = parseInt(input_field.value);
      if (!Number.isInteger(value) || value <= 0) {
        input_field.value = 1;
        return;
      }
      const alert = {
        level: r?.level,
        value,
      };
      chrome.storage.local.set({ alert });
      document.getElementById('set-alert').classList.add('div-hidden');
    });
  });
});

/**
 * Cancel Alert
 * @readonly addEventListener
 */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('alert-cancel').addEventListener('click', (event) => {
    chrome.storage.local.set({ alert: { level: 'standard', value: 0 } });
  });
});

/**  ============================ On page load ============================ */

// Show gas Data, then update if older than 10 seconds
chrome.storage.sync.get('gasData', (r) => {
  updateDisplay(r?.gasData);
  if (Date.now() - r?.gasData?.timestamp >= 10000) {
    chrome.runtime.sendMessage({ action: 'fetch_gasData' });
  }
});

// Show alert (gas price target), if set
chrome.storage.local.get('alert', (r) => {
  updateAlert(r?.alert);
});
