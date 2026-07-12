/* ===== EasyCopy – Content Script (Local Variables & Website Whitelist Panel) ===== */
(function () {
  'use strict';

  const STORAGE_KEY       = 'easycopy_items';
  const PANEL_POS_KEY     = 'easycopy_pos';
  const OPACITY_KEY       = 'easycopy_opacity';
  const WIDTH_KEY         = 'easycopy_width';
  const SITE_MODE_KEY     = 'easycopy_site_mode';
  const ALLOWED_SITES_KEY = 'easycopy_allowed_sites';

  // ── State ─────────────────────────────────────────────────────────────────
  let items = [];          // [{id, text, title}]
  let panelOpacity = 0.95; // default opacity
  let panelWidth = 220;    // default width
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // Global variables state (syncs identical placeholders across different cards)
  let varValues = {};      // { "[fill1]": "Aloe Vera" }

  // ── Refs ──────────────────────────────────────────────────────────────────
  let root = null;
  let panel = null;
  let body = null;
  let emptyState = null;
  let toast = null;

  // ── Check Access and Inject/Remove DOM ─────────────────────────────────────
  function checkAccessAndRender() {
    chrome.storage.local.get([
      STORAGE_KEY, 
      PANEL_POS_KEY, 
      OPACITY_KEY, 
      WIDTH_KEY, 
      SITE_MODE_KEY, 
      ALLOWED_SITES_KEY
    ], (res) => {
      
      const siteMode = res[SITE_MODE_KEY] || 'all';
      const allowedText = res[ALLOWED_SITES_KEY] || '';
      
      const allowed = isCurrentSiteAllowed(siteMode, allowedText);
      
      if (!allowed) {
        // If not allowed on this site, clean up DOM and exit
        removeDOM();
        return;
      }

      // If allowed, ensure DOM elements are created
      injectDOM();

      items = res[STORAGE_KEY] || [];
      renderList();

      if (res[PANEL_POS_KEY]) {
        const { top, right } = res[PANEL_POS_KEY];
        root.style.top  = top  + 'px';
        root.style.right = right + 'px';
      }

      if (res[OPACITY_KEY] !== undefined) {
        panelOpacity = res[OPACITY_KEY];
        applyOpacity(panelOpacity);
      }

      if (res[WIDTH_KEY] !== undefined) {
        panelWidth = res[WIDTH_KEY];
        applyWidth(panelWidth);
      }
    });
  }

  // ── Helper: Extract Domain from URL patterns ────────────────────────────────
  function extractHostname(input) {
    let host = input.trim().toLowerCase();
    // Remove protocol (e.g. http://, https://, *://)
    host = host.replace(/^(https?|abc|\*):\/\//, '');
    // Remove paths and wildcards e.g. /index.html or /*
    host = host.split('/')[0];
    host = host.split('?')[0];
    host = host.split('#')[0];
    // Remove starting wildcards e.g. *.domain.com -> domain.com
    host = host.replace(/^\*\./, '');
    if (host === '*') return '';
    return host;
  }

  // ── Helper: URL Matching check ─────────────────────────────────────────────
  function isCurrentSiteAllowed(mode, allowedText) {
    if (mode !== 'listed') return true;
    if (!allowedText) return false;

    const currentHost = window.location.hostname.toLowerCase();
    const list = allowedText.split('\n')
      .map(s => extractHostname(s))
      .filter(s => s.length > 0);

    // Checks if current domain matches exactly or ends with `.domain` (for subdomains)
    return list.some(domain => currentHost === domain || currentHost.endsWith('.' + domain));
  }

  // ── Inject DOM Nodes ───────────────────────────────────────────────────────
  function injectDOM() {
    if (document.getElementById('easycopy-float-root')) {
      root = document.getElementById('easycopy-float-root');
      panel = document.getElementById('ec-panel');
      body = document.getElementById('ec-body');
      emptyState = document.getElementById('ec-empty');
      toast = document.getElementById('ec-toast');
      return;
    }

    root = document.createElement('div');
    root.id = 'easycopy-float-root';
    root.innerHTML = `
      <!-- Main floating panel -->
      <div id="ec-panel">
        <!-- Items list -->
        <div id="ec-body">
          <div id="ec-empty"></div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    toast = document.createElement('div');
    toast.id = 'ec-toast';
    document.body.appendChild(toast);

    panel      = document.getElementById('ec-panel');
    body       = document.getElementById('ec-body');
    emptyState = document.getElementById('ec-empty');
  }

  // ── Remove DOM Nodes ───────────────────────────────────────────────────────
  function removeDOM() {
    const existingRoot = document.getElementById('easycopy-float-root');
    if (existingRoot) existingRoot.remove();
    const existingToast = document.getElementById('ec-toast');
    if (existingToast) existingToast.remove();
    root = null;
    panel = null;
    body = null;
    emptyState = null;
    toast = null;
  }

  // ── Opacity & Width ───────────────────────────────────────────────────────
  function applyOpacity(val) {
    if (panel) panel.style.opacity = val;
  }

  function applyWidth(val) {
    if (panel) panel.style.setProperty('width', `${val}px`, 'important');
  }

  // ── Render list ───────────────────────────────────────────────────────────
  function renderList() {
    if (!body) return;
    const existingItems = body.querySelectorAll('.ec-item');
    existingItems.forEach(n => n.remove());

    emptyState.style.display = items.length === 0 ? 'block' : 'none';

    items.forEach((item) => {
      body.appendChild(createItemNode(item));
    });

    applyOpacity(panelOpacity);
    applyWidth(panelWidth);
  }

  // ── Create Item Nodes ──────────────────────────────────────────────────────
  function createItemNode(item) {
    const node = document.createElement('div');
    node.className = 'ec-item';
    node.dataset.id = item.id;

    const titleHtml = item.title ? `<span class="ec-item-title">${escapeHtml(item.title)}:</span>` : '';

    // Split text by bracket placeholders e.g. [fill1], [fill2]
    const segments = item.text.split(/(\[[^\]]+\])/g);
    let templatedHTML = '';
    const localUniquePlaceholders = new Set();

    segments.forEach(segment => {
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const resolvedText = varValues[segment] || segment;
        templatedHTML += `<span class="ec-var-span" data-placeholder="${escapeHtml(segment)}">${escapeHtml(resolvedText)}</span>`;
        localUniquePlaceholders.add(segment);
      } else {
        templatedHTML += `<span class="ec-item-segment">${escapeHtml(segment)}</span>`;
      }
    });

    // Generate variables inputs block locally for this note card if placeholders exist (Grouped at TOP)
    let variablesBlockHtml = '';
    if (localUniquePlaceholders.size > 0) {
      let inputsHtml = '';
      localUniquePlaceholders.forEach(placeholder => {
        const labelText = placeholder.slice(1, -1);
        const currentValue = varValues[placeholder] || '';
        inputsHtml += `
          <div class="ec-var-field">
            <span class="ec-var-label">${escapeHtml(labelText)}:</span>
            <input class="ec-inline-replace-input" type="text" data-placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(currentValue)}" placeholder="value..." />
          </div>
        `;
      });
      variablesBlockHtml = `<div class="ec-item-variables">${inputsHtml}</div>`;
    }

    // Determine if the text is long (greater than 80 chars) to show expand/minimize toggle
    const isLongText = item.text.length > 80;
    const collapseClass = isLongText ? 'ec-collapsed' : '';
    const toggleHtml = isLongText ? `<span class="ec-expand-toggle" title="Toggle expand/collapse">more</span>` : '';

    node.innerHTML = `<div class="ec-item-content">${variablesBlockHtml}<div class="ec-text-wrapper ${collapseClass}">${titleHtml}${templatedHTML}</div>${toggleHtml}</div><button class="ec-copy-btn" title="Copy">⧉</button>`;

    // Make the entire card act as a drag handle (unless clicking copy button, replace input, or toggle link)
    node.addEventListener('mousedown', (e) => {
      if (
        e.target.classList.contains('ec-copy-btn') || 
        e.target.classList.contains('ec-inline-replace-input') || 
        e.target.classList.contains('ec-expand-toggle')
      ) {
        return;
      }
      isDragging = true;
      const rect = root.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      document.body.style.userSelect = 'none';
    });

    // Expand/Minimize Toggle Event Listener
    const toggleBtn = node.querySelector('.ec-expand-toggle');
    if (toggleBtn) {
      const textWrapper = node.querySelector('.ec-text-wrapper');
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent drag trigger
        const isCollapsed = textWrapper.classList.toggle('ec-collapsed');
        toggleBtn.textContent = isCollapsed ? 'more' : 'less';
      });
    }

    // Copy button click handler
    node.querySelector('.ec-copy-btn').addEventListener('click', () => {
      const textWrapper = node.querySelector('.ec-text-wrapper');
      let textToCopy = '';

      textWrapper.childNodes.forEach(child => {
        // Ignore the title block prefix
        if (child.classList && child.classList.contains('ec-item-title')) {
          return;
        }

        // Just copy textContent directly (which already holds resolved variable text values)
        if (child.textContent) {
          textToCopy += child.textContent;
        }
      });

      copyText(textToCopy.trim(), node.querySelector('.ec-copy-btn'));
    });

    return node;
  }

  // ── Sync identical placeholder inputs globally in real-time ───────────────
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('ec-inline-replace-input')) {
      const placeholder = e.target.getAttribute('data-placeholder');
      const val = e.target.value;

      // Save into global state
      varValues[placeholder] = val;

      if (!body) return;

      // Sync all spans globally
      const spans = body.querySelectorAll(`.ec-var-span[data-placeholder="${escapeHtml(placeholder)}"]`);
      spans.forEach(span => {
        span.textContent = val || placeholder;
      });

      // Sync all inputs globally (so they update even if located in other cards)
      const inputs = body.querySelectorAll(`.ec-inline-replace-input[data-placeholder="${escapeHtml(placeholder)}"]`);
      inputs.forEach(input => {
        if (input !== e.target) {
          input.value = val;
        }
      });
    }
  });

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      if (btn) {
        btn.textContent = '✓';
        btn.classList.add('ec-copied');
        setTimeout(() => {
          btn.textContent = '⧉';
          btn.classList.remove('ec-copied');
        }, 1200);
      }
      showToast('Copied');
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast('Copied');
    });
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('ec-toast-show');
    setTimeout(() => {
      if (toast) toast.classList.remove('ec-toast-show');
    }, 1500);
  }

  // ── Move panel ────────────────────────────────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !root) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rootRect = root.getBoundingClientRect();
    const w = rootRect.width;
    const h = rootRect.height;

    let newLeft = e.clientX - dragOffsetX;
    let newTop  = e.clientY - dragOffsetY;

    newLeft = Math.max(0, Math.min(newLeft, vw - w));
    newTop  = Math.max(0, Math.min(newTop, vh - h));

    root.style.left  = newLeft + 'px';
    root.style.top   = newTop  + 'px';
    root.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';
      savePosition();
    }
  });

  // ── Message listener (from popup) ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'EC_RELOAD_ITEMS') {
      checkAccessAndRender();
    }
    if (msg.type === 'EC_UPDATE_OPACITY') {
      panelOpacity = msg.opacity;
      applyOpacity(panelOpacity);
    }
    if (msg.type === 'EC_UPDATE_WIDTH') {
      panelWidth = msg.width;
      applyWidth(panelWidth);
    }
    if (msg.type === 'EC_SITE_SETTINGS_CHANGED') {
      checkAccessAndRender();
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  checkAccessAndRender();
})();
