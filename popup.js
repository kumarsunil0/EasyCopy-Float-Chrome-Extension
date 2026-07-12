/* ===== EasyCopy – Popup Script ===== */
const STORAGE_KEY       = 'easycopy_items';
const OPACITY_KEY       = 'easycopy_opacity';
const WIDTH_KEY         = 'easycopy_width';
const SITE_MODE_KEY     = 'easycopy_site_mode';
const ALLOWED_SITES_KEY = 'easycopy_allowed_sites';

const popupTitleInput = document.getElementById('popup-title-input');
const popupInput      = document.getElementById('popup-input');
const popupAddBtn     = document.getElementById('popup-add-btn');
const countEl         = document.getElementById('popup-item-count');
const itemsListEl     = document.getElementById('popup-items-list');
const opacitySlider   = document.getElementById('popup-opacity-slider');
const opacityVal      = document.getElementById('opacity-val');
const widthSlider     = document.getElementById('popup-width-slider');
const widthVal        = document.getElementById('width-val');
const clearBtn        = document.getElementById('popup-clear-btn');
const insertHelperBtn = document.getElementById('insert-placeholder-btn');

// Whitelist DOM elements
const siteModeSelect  = document.getElementById('popup-site-mode');
const allowedSitesTxt = document.getElementById('popup-allowed-sites');

// Backup DOM elements
const exportBtn       = document.getElementById('popup-export-btn');
const importBtn       = document.getElementById('popup-import-btn');
const importFileInput = document.getElementById('popup-import-file');

// Tabs references
const tabBtnList      = document.getElementById('tab-btn-list');
const tabBtnSettings  = document.getElementById('tab-btn-settings');
const tabContentList  = document.getElementById('tab-content-list');
const tabContentSet   = document.getElementById('tab-content-settings');

// ── Tab Switching Logic ─────────────────────────────────────────────────────
tabBtnList.addEventListener('click', () => {
  tabBtnList.classList.add('active');
  tabBtnSettings.classList.remove('active');
  tabContentList.classList.add('active-content');
  tabContentSet.classList.remove('active-content');
});

tabBtnSettings.addEventListener('click', () => {
  tabBtnSettings.classList.add('active');
  tabBtnList.classList.remove('active');
  tabContentSet.classList.add('active-content');
  tabContentList.classList.remove('active-content');
});

// ── Auto-Resize Textarea Helper ──────────────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

popupInput.addEventListener('input', () => autoResize(popupInput));

// ── Load and display item count & settings ──────────────────────────────────
function initPopup() {
  chrome.storage.local.get([
    STORAGE_KEY, 
    OPACITY_KEY, 
    WIDTH_KEY, 
    SITE_MODE_KEY, 
    ALLOWED_SITES_KEY
  ], (res) => {
    const items = res[STORAGE_KEY] || [];
    renderPopupList(items);
    updateCountDisplay(items.length);

    // Refresh Opacity Slider
    const op = res[OPACITY_KEY] !== undefined ? res[OPACITY_KEY] : 0.95;
    const opPct = Math.round(op * 100);
    opacitySlider.value = opPct;
    opacityVal.textContent = opPct + '%';

    // Refresh Width Slider
    const wd = res[WIDTH_KEY] !== undefined ? res[WIDTH_KEY] : 220;
    widthSlider.value = wd;
    widthVal.textContent = wd + 'px';

    // Refresh Whitelist Settings
    const mode = res[SITE_MODE_KEY] || 'all';
    siteModeSelect.value = mode;
    allowedSitesTxt.style.display = mode === 'listed' ? 'block' : 'none';
    allowedSitesTxt.value = res[ALLOWED_SITES_KEY] || '';
  });
}

function updateCountDisplay(count) {
  countEl.innerHTML = `<strong>${count}</strong> item${count !== 1 ? 's' : ''} saved`;
}

// ── Render Items in Popup list ──────────────────────────────────────────────
function renderPopupList(items) {
  itemsListEl.innerHTML = '';
  
  if (items.length === 0) {
    itemsListEl.innerHTML = '<div class="empty-popup-list">No items saved yet.</div>';
    return;
  }

  items.forEach((item) => {
    const itemNode = document.createElement('div');
    itemNode.className = 'popup-item';
    
    itemNode.innerHTML = `
      <div class="popup-item-edit-fields">
        <input class="popup-item-title-input" type="text" value="${escapeHtml(item.title || '')}" placeholder="Add Label/Title..." />
        <textarea class="popup-item-text-input" rows="1" placeholder="Add Text...">${escapeHtml(item.text)}</textarea>
      </div>
      <button class="popup-item-delete" title="Delete Item">✕</button>
    `;

    const titleEdit = itemNode.querySelector('.popup-item-title-input');
    const textEdit  = itemNode.querySelector('.popup-item-text-input');

    // Run auto-resize on initial render
    setTimeout(() => autoResize(textEdit), 10);

    // Auto-resize on input
    textEdit.addEventListener('input', () => {
      autoResize(textEdit);
      item.text = textEdit.value;
      saveEditedItems(items);
    });

    // Listener to save edited Title
    titleEdit.addEventListener('input', () => {
      item.title = titleEdit.value.trim();
      saveEditedItems(items);
    });

    // Click handler to delete individual item
    itemNode.querySelector('.popup-item-delete').addEventListener('click', () => {
      deleteItem(item.id);
    });

    itemsListEl.appendChild(itemNode);
  });
}

function saveEditedItems(itemsList) {
  chrome.storage.local.set({ [STORAGE_KEY]: itemsList }, () => {
    notifyActiveTab({ type: 'EC_RELOAD_ITEMS' });
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Quick add from popup ───────────────────────────────────────────────────
function addFromPopup() {
  const text = popupInput.value.trim();
  const title = popupTitleInput.value.trim();
  if (!text) return;

  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const items = res[STORAGE_KEY] || [];
    items.push({ id: Date.now() + Math.random(), text, title });
    chrome.storage.local.set({ [STORAGE_KEY]: items }, () => {
      popupInput.value = '';
      popupInput.style.height = 'auto'; // reset height after clear
      popupTitleInput.value = '';
      renderPopupList(items);
      updateCountDisplay(items.length);

      // Notify content script to reload items
      notifyActiveTab({ type: 'EC_RELOAD_ITEMS' });
    });
  });
}

popupAddBtn.addEventListener('click', addFromPopup);

// Handle enter key on title input
popupTitleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addFromPopup();
});

// For text input, enter key inserts newline, but shift+enter triggers submit or vice versa
popupInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addFromPopup();
  }
});

// ── Insert Placeholder Helper ───────────────────────────────────────────────
insertHelperBtn.addEventListener('click', () => {
  const textVal = popupInput.value;
  
  // Find all placeholder matches to figure out the next sequence number
  const matches = textVal.match(/\[fill\d+\]/g) || [];
  const nextNum = matches.length + 1;
  const tag = `[fill${nextNum}]`;

  // Get cursor insertion point
  const startPos = popupInput.selectionStart;
  const endPos = popupInput.selectionEnd;

  // Insert tag at cursor position
  popupInput.value = textVal.substring(0, startPos) + tag + textVal.substring(endPos, textVal.length);

  // Auto-resize the input text area after adding tag
  autoResize(popupInput);

  // Return focus to input box and move selection cursor right after the added tag
  popupInput.focus();
  popupInput.selectionStart = startPos + tag.length;
  popupInput.selectionEnd = startPos + tag.length;
});

// ── Delete item from popup list ────────────────────────────────────────────
function deleteItem(id) {
  if (!confirm('Delete this item?')) return; // Ask for confirmation before deleting
  
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    let items = res[STORAGE_KEY] || [];
    items = items.filter(item => item.id !== id);
    chrome.storage.local.set({ [STORAGE_KEY]: items }, () => {
      renderPopupList(items);
      updateCountDisplay(items.length);
      notifyActiveTab({ type: 'EC_RELOAD_ITEMS' });
    });
  });
}

// ── Whitelist Settings Toggles ──────────────────────────────────────────────
siteModeSelect.addEventListener('change', () => {
  const mode = siteModeSelect.value;
  allowedSitesTxt.style.display = mode === 'listed' ? 'block' : 'none';
  
  chrome.storage.local.set({ [SITE_MODE_KEY]: mode }, () => {
    notifyActiveTab({ type: 'EC_SITE_SETTINGS_CHANGED' });
  });
});

allowedSitesTxt.addEventListener('input', () => {
  const listText = allowedSitesTxt.value;
  chrome.storage.local.set({ [ALLOWED_SITES_KEY]: listText }, () => {
    notifyActiveTab({ type: 'EC_SITE_SETTINGS_CHANGED' });
  });
});

// ── Export Data (JSON Download) ────────────────────────────────────────────
exportBtn.addEventListener('click', () => {
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const items = res[STORAGE_KEY] || [];
    if (items.length === 0) {
      alert('No items saved to export.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "easycopy_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });
});

// ── Import Data (JSON File Upload) ─────────────────────────────────────────
importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      
      // Basic validation
      if (!Array.isArray(importedData)) {
        throw new Error("Invalid structure. Backup file must contain a JSON list array.");
      }

      // Overwrite confirmation
      if (!confirm(`Importing ${importedData.length} items will replace your current saved list. Do you want to proceed?`)) {
        return;
      }

      chrome.storage.local.set({ [STORAGE_KEY]: importedData }, () => {
        renderPopupList(importedData);
        updateCountDisplay(importedData.length);
        notifyActiveTab({ type: 'EC_RELOAD_ITEMS' });
        alert('Data imported successfully!');
      });
    } catch (err) {
      alert('Failed to import data: ' + err.message);
    }
  };
  reader.readAsText(file);
  importFileInput.value = ''; // Clear file input buffer
});

// ── Opacity adjustment ──────────────────────────────────────────────────────
opacitySlider.addEventListener('input', () => {
  const val = opacitySlider.value / 100;
  opacityVal.textContent = opacitySlider.value + '%';
  chrome.storage.local.set({ [OPACITY_KEY]: val }, () => {
    notifyActiveTab({ type: 'EC_UPDATE_OPACITY', opacity: val });
  });
});

// ── Width adjustment ────────────────────────────────────────────────────────
widthSlider.addEventListener('input', () => {
  const val = parseInt(widthSlider.value);
  widthVal.textContent = val + 'px';
  chrome.storage.local.set({ [WIDTH_KEY]: val }, () => {
    notifyActiveTab({ type: 'EC_UPDATE_WIDTH', width: val });
  });
});

// ── Clear all ─────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const items = res[STORAGE_KEY] || [];
    if (items.length === 0) return;
    if (!confirm('Clear all data items?')) return;
    
    chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
      renderPopupList([]);
      updateCountDisplay(0);
      notifyActiveTab({ type: 'EC_RELOAD_ITEMS' });
    });
  });
});

// ── Helper: Notify Active Tab ──────────────────────────────────────────────
function notifyActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, message, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────
initPopup();
