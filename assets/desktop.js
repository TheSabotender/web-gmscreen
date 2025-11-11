// assets/desktop.js

import { renderPremadePanel, getPremadeName, getPremadeDef } from './panel_premade.js';
import { enterCustomEditMode, downloadCustomPanel, promptLoadCustomPanel, renderCustomPanel } from './panel_custom.js';
import { enterExternalEditMode, renderExternalPanel } from './panel_external.js';
import {
  renderLayoutPanel,
  setupLayoutModule,
  showLayoutChildMenu,
  clearLayoutContextTarget
} from './panel_layout.js';
import { ensureGridDimensions, computeGridSizeForCount } from './panel_gridLayout.js';
import { openSettings, closeSettings } from './settings.js';
import { renderDicePanel } from './panel_dice.js';

const WEBM_PATTERN = /\.webm(?:$|\?)/i;

function createBackgroundVideoWrapper(state) {
  const url = state.settings.backgroundUrl || '';
  if (!WEBM_PATTERN.test(url)) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'desktop-video-wrapper';
  const mode = state.settings.backgroundMode || 'envelop';
  wrapper.dataset.mode = mode;

  const video = document.createElement('video');
  video.className = 'desktop-bg-video';
  video.src = url;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('loop', '');
  video.preload = 'auto';

  const muted = state.settings.backgroundVideoMuted !== false;
  video.muted = muted;
  if (muted) {
    video.setAttribute('muted', '');
  } else {
    video.removeAttribute('muted');
  }

  wrapper.appendChild(video);

  // Attempt to start playback immediately; ignore failures due to autoplay policies.
  setTimeout(() => {
    video.play().catch(() => {});
  }, 0);

  return wrapper;
}

let ctx = null;
let draggingPanel = null;
const dragOffset = { x: 0, y: 0 };
let resizingPanel = null;
let resizeStart = { x: 0, y: 0, width: 0, height: 0 };
let desktopContextTargetPoint = { x: 0, y: 0 };
let panelContextTarget = null;

function getActiveTab(context = ctx) {
  const state = context.getState();
  return (state.tabs || []).find(t => t.id === state.activeTabId);
}

function addPanel(context, type, options = {}) {
  const tab = getActiveTab(context);
  if (!tab) return;
  const id = context.uid('panel');

  let defaultWidth = 320;
  let defaultHeight = 200;

  if (type === 'premade' && options.premadeId) {
    const def = (window.PREMADE_PANELS || []).find(p => p.id === options.premadeId);
    if (def) {
      if (typeof def.width === 'number') defaultWidth = def.width;
      if (typeof def.height === 'number') defaultHeight = def.height;
    }
  }

  const base = {
    id,
    type,
    title: options.title || (type === 'premade' ? 'Premade Panel' : type === 'custom' ? 'Custom Panel' : 'Layout Panel'),
    x: options.x ?? 80,
    y: options.y ?? 80,
    zIndex: context.bumpZCounter(),
    width: options.width ?? defaultWidth,
    height: options.height ?? defaultHeight,
    minimized: false
  };

  if (type === 'premade') {
    base.premadeId = options.premadeId || null;
    base.cachedContent = null;
  } else if (type === 'custom') {
    base.customContent = '<p>Click the ✎ in the top right corner to edit this panel.</p>';
  } else if (type === 'external') {
    base.externalUrl = options.externalUrl || '';
  } else if (type === 'layout') {
    base.layoutMode = options.layoutMode || 'grid';
    base.subPanels = options.subPanels || [];
    if (base.layoutMode === 'horizontal') {
      base.gridRows = 1;
      base.gridCols = 2;
    } else if (base.layoutMode === 'vertical') {
      base.gridRows = 2;
      base.gridCols = 1;
      base.width = defaultHeight;
      base.height = defaultWidth;
    } else if (base.layoutMode === 'grid') {
      base.gridRows = 2;
      base.gridCols = 2;
      base.width = defaultWidth;
      base.height = defaultWidth;
    }
  }

  tab.panels.push(base);
  context.saveState();
  context.renderDesktop();
}

function findPanelById(panelId, context = ctx) {
  const state = context.getState();
  for (const tab of state.tabs) {
    const panel = tab.panels.find(p => p.id === panelId);
    if (panel) return { tab, panel };
  }
  return null;
}

function findSubPanelById(layoutId, panelId, context = ctx) {
  for (const tab of context.getState().tabs) {
    const layout = findPanelById(layoutId, context);
    if (layout) {
      const subPanels = layout.panel.subPanels || [];
      const subPanel = subPanels.find(p => p.id === panelId);
      if (subPanel) return { tab, layout, panel: subPanel };
    }
  }
  console.warn('Panel not found for layout edit mode:', panelId);
  return null;
}

function togglePanelMinimized(panelId, context = ctx) {
  const found = findPanelById(panelId, context);
  if (!found) return;
  found.panel.minimized = !found.panel.minimized;
  context.saveState();
  context.renderDesktop();
}

function closePanel(panelId, context = ctx) {
  const found = findPanelById(panelId, context);
  if (!found) return;
  const { tab, panel } = found;

  if (panel && panel.closable === false) {
    return;
  }

  if (panel.type === 'custom') {
    const ok = confirm('Close this custom panel? Its custom content will be lost.');
    if (!ok) return;
  }

  tab.panels = tab.panels.filter(p => p.id !== panelId);
  context.saveState();
  context.renderDesktop();
}

function enterCustomPanelEditMode(panelId, panelElement) {
  const found = findPanelById(panelId);
  if (!found) return;
  enterCustomEditMode(ctx, found.panel, panelElement);
}

function enterCustomLayoutEditMode(layoutId, panelId, panelElement) {
  const found = findSubPanelById(layoutId, panelId);
  if (!found) return;
  enterCustomEditMode(ctx, found.panel, panelElement);
}

function enterExternalPanelEditMode(panelId, panelElement) {
  const found = findPanelById(panelId);
  if (!found) return;
  enterExternalEditMode(ctx, found.panel, panelElement);
}

function enterExternalLayoutEditMode(layoutId, panelId, panelElement) {
  const found = findSubPanelById(layoutId, panelId);
  if (!found) return;
  enterExternalEditMode(ctx, found.panel, panelElement);
}

export function renderDesktop(context) {
  ctx = context;
  const state = context.getState();
  const { desktop } = context.elements;
  if (!desktop) return;

  desktop.innerHTML = '';
  const videoWrapper = createBackgroundVideoWrapper(state);
  if (videoWrapper) {
    desktop.appendChild(videoWrapper);
  }
  const currentTab = getActiveTab(context);
  if (!currentTab) return;

  currentTab.panels.forEach(panel => {
    const el = document.createElement('div');
    el.className = 'panel';
    el.dataset.panelId = panel.id;

    el.style.left = (panel.x ?? 60) + 'px';
    el.style.top = (panel.y ?? 60) + 'px';
    el.style.zIndex = typeof panel.zIndex === 'number' ? panel.zIndex : 1;
    el.style.height = (panel.height ?? 200) + 'px';

    if (panel.minimized) {
      el.classList.add('minimized');
      el.style.width = 'auto';
    } else {
      el.style.width = (panel.width ?? 320) + 'px';
    }

    const header = document.createElement('div');
    header.className = 'panel-header';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = panel.title || '(Untitled)';

    const headerButtons = document.createElement('div');
    headerButtons.className = 'panel-header-buttons';

    if (panel.type === 'custom' || panel.type === 'external') {
      const editBtn = document.createElement('button');
      editBtn.className = 'panel-btn';
      editBtn.textContent = '✎';
      editBtn.title = panel.type === 'external' ? 'Edit exteral URL' : 'Edit custom content';
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (panel.type === 'external') {
          enterExternalPanelEditMode(panel.id, el);
        } else {
          enterCustomPanelEditMode(panel.id, el);
        }
      });
      headerButtons.appendChild(editBtn);
    }

    if (panel.type === 'premade' && panel.premadeId) {
      const def = getPremadeDef(panel.premadeId);
      if (def && def.source) {
        const readMoreBtn = document.createElement('button');
        readMoreBtn.className = 'panel-btn panel-readmore';
        readMoreBtn.textContent = 'Read more';
        readMoreBtn.title = 'Open source in new tab';
        readMoreBtn.addEventListener('click', e => {
          e.stopPropagation();
          window.open(def.source, '_blank', 'noopener');
        });
        headerButtons.appendChild(readMoreBtn);
      }
    }

    if (panel.type === 'layout') {
      const mode = panel.layoutMode || 'grid';
      if (mode === 'horizontal' || mode === 'vertical') {
        if ((panel.subPanels || []).length >= 2) {
          const addBtn = document.createElement('button');
          addBtn.className = 'panel-btn';
          addBtn.textContent = 'Add';
          addBtn.title = 'Add new area';
          addBtn.addEventListener('click', e => {
            e.stopPropagation();
            showLayoutChildMenu(e.clientX, e.clientY, {
              parentPanelId: panel.id,
              slotIndex: (panel.subPanels || []).length
            });
          });
          headerButtons.insertBefore(addBtn, headerButtons.firstChild);
        }
      } else if (mode === 'grid') {
        const addRowBtn = document.createElement('button');
        addRowBtn.className = 'panel-btn';
        addRowBtn.textContent = '+Row';
        addRowBtn.title = 'Add row';
        addRowBtn.addEventListener('click', e => {
          e.stopPropagation();
          ensureGridDimensions(panel);
          panel.gridRows += 1;
          context.saveState();
          context.renderDesktop();
        });

        const addColBtn = document.createElement('button');
        addColBtn.className = 'panel-btn';
        addColBtn.textContent = '+Col';
        addColBtn.title = 'Add column';
        addColBtn.addEventListener('click', e => {
          e.stopPropagation();
          ensureGridDimensions(panel);
          panel.gridCols += 1;
          context.saveState();
          context.renderDesktop();
        });

        headerButtons.insertBefore(addColBtn, headerButtons.firstChild);
        headerButtons.insertBefore(addRowBtn, headerButtons.firstChild);
      }
    }

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'panel-btn';
    if (panel.minimized) {
      minimizeBtn.textContent = '□';
      minimizeBtn.title = 'Restore panel';
    } else {
      minimizeBtn.textContent = '–';
      minimizeBtn.title = 'Minimize panel';
    }
    minimizeBtn.addEventListener('click', e => {
      e.stopPropagation();
      togglePanelMinimized(panel.id);
    });
    headerButtons.appendChild(minimizeBtn);

    if (panel.closable !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'panel-btn';
      closeBtn.textContent = '×';
      closeBtn.title = 'Close panel';
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closePanel(panel.id);
      });
      headerButtons.appendChild(closeBtn);
    }

    header.appendChild(title);
    header.appendChild(headerButtons);

    const body = document.createElement('div');
    body.className = 'panel-body';

    if (panel.type === 'premade') {
      renderPremadePanel(context, panel, body);
    } else if (panel.type === 'custom') {
      renderCustomPanel(panel, body);
    } else if (panel.type === 'external') {
      renderExternalPanel(panel, body);
    } else if (panel.type === 'dice') {
      renderDicePanel(context, panel, body);
    } else if (panel.type === 'layout') {
      renderLayoutPanel(context, panel, body, {
        enterCustomChildEdit: (childId, parentId, element) =>
          enterCustomLayoutEditMode(parentId, childId, el),
        enterExternalChildEdit: (childId, parentId, element) =>
          enterExternalLayoutEditMode(parentId, childId, el)
      });
    }

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'panel-resize-handle';

    el.appendChild(header);
    el.appendChild(body);
    el.appendChild(resizeHandle);
    desktop.appendChild(el);

    header.addEventListener('mousedown', startPanelDrag);
    header.addEventListener('dblclick', () => {
      togglePanelMinimized(panel.id);
    });
    resizeHandle.addEventListener('mousedown', startPanelResize);
  });
}

function startPanelDrag(e) {
  e.preventDefault();
  const panelEl = e.currentTarget.closest('.panel');
  if (!panelEl) return;
  const rect = panelEl.getBoundingClientRect();
  draggingPanel = { id: panelEl.dataset.panelId };
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  window.addEventListener('mousemove', onPanelDrag);
  window.addEventListener('mouseup', endPanelDrag);
}

function onPanelDrag(e) {
  if (!draggingPanel) return;
  const panelEl = document.querySelector(`.panel[data-panel-id="${draggingPanel.id}"]`);
  if (!panelEl) return;
  const newLeft = e.clientX - dragOffset.x;
  const newTop = e.clientY - dragOffset.y;
  panelEl.style.left = newLeft + 'px';
  panelEl.style.top = newTop + 'px';
}

function endPanelDrag() {
  if (!draggingPanel) return;
  const { id } = draggingPanel;
  const panelEl = document.querySelector(`.panel[data-panel-id="${id}"]`);
  if (panelEl) {
    const rect = panelEl.getBoundingClientRect();
    const desktopRect = ctx.elements.desktop.getBoundingClientRect();
    const found = findPanelById(id);
    if (found) {
      found.panel.x = rect.left - desktopRect.left;
      found.panel.y = rect.top - desktopRect.top;
    }
  }
  draggingPanel = null;
  window.removeEventListener('mousemove', onPanelDrag);
  window.removeEventListener('mouseup', endPanelDrag);
  ctx.saveState();
}

function startPanelResize(e) {
  e.preventDefault();
  e.stopPropagation();
  const panelEl = e.currentTarget.closest('.panel');
  if (!panelEl) return;
  const rect = panelEl.getBoundingClientRect();
  resizingPanel = { id: panelEl.dataset.panelId };
  resizeStart = {
    x: e.clientX,
    y: e.clientY,
    width: rect.width,
    height: rect.height
  };
  window.addEventListener('mousemove', onPanelResize);
  window.addEventListener('mouseup', endPanelResize);
}

function onPanelResize(e) {
  if (!resizingPanel) return;
  const panelEl = document.querySelector(`.panel[data-panel-id="${resizingPanel.id}"]`);
  if (!panelEl) return;
  const dx = e.clientX - resizeStart.x;
  const dy = e.clientY - resizeStart.y;
  const newWidth = Math.max(180, resizeStart.width + dx);
  const newHeight = Math.max(120, resizeStart.height + dy);
  panelEl.style.width = newWidth + 'px';
  panelEl.style.height = newHeight + 'px';
}

function endPanelResize() {
  if (!resizingPanel) return;
  const { id } = resizingPanel;
  const panelEl = document.querySelector(`.panel[data-panel-id="${id}"]`);
  if (panelEl) {
    const rect = panelEl.getBoundingClientRect();
    const found = findPanelById(id);
    if (found) {
      found.panel.width = rect.width;
      found.panel.height = rect.height;
    }
  }
  resizingPanel = null;
  window.removeEventListener('mousemove', onPanelResize);
  window.removeEventListener('mouseup', endPanelResize);
  ctx.saveState();
}

function hideMenus() {
  const {
    desktopContextMenu,
    tabContextMenu,
    layoutChildContextMenu,
    panelContextMenu
  } = ctx.elements;
  if (desktopContextMenu) desktopContextMenu.style.display = 'none';
  if (tabContextMenu) tabContextMenu.style.display = 'none';
  if (layoutChildContextMenu) layoutChildContextMenu.style.display = 'none';
  if (panelContextMenu) panelContextMenu.style.display = 'none';
  clearLayoutContextTarget();
  panelContextTarget = null;
}

function positionMenuWithinViewport(menuEl, x, y) {
  menuEl.style.display = 'block';
  menuEl.style.left = x + 'px';
  menuEl.style.top = y + 'px';

  const rect = menuEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.left;
  let top = rect.top;

  if (left + rect.width > vw) {
    left = vw - rect.width - 4;
  }
  if (top + rect.height > vh) {
    top = vh - rect.height - 4;
  }
  if (left < 0) left = 0;
  if (top < 0) top = 0;

  menuEl.style.left = left + 'px';
  menuEl.style.top = top + 'px';
}

function showDesktopMenu(x, y) {
  const { desktopContextMenu } = ctx.elements;
  if (!desktopContextMenu) return;
  hideMenus();
  positionMenuWithinViewport(desktopContextMenu, x, y);
}

function showPanelMenu(x, y, target) {
  const { panelContextMenu } = ctx.elements;
  if (!panelContextMenu) return;
  hideMenus();
  panelContextTarget = target;

  const isTopLevel = target.kind === 'panel';
  const panel = target.panel;
  const child = target.child || null;
  const type = isTopLevel ? panel.type : (child?.type || 'empty');

  const premadeItems = panelContextMenu.querySelectorAll('.panel-menu-premade');
  const premadeSourceItems = panelContextMenu.querySelectorAll('.panel-menu-premade-source');
  const customItems = panelContextMenu.querySelectorAll('.panel-menu-custom');
  const externalItems = panelContextMenu.querySelectorAll('.panel-menu-external');
  const layoutItems = panelContextMenu.querySelectorAll('.panel-menu-layout');
  const layerItems = panelContextMenu.querySelectorAll('.panel-menu-layer');
  const layoutChildRemoveItems = panelContextMenu.querySelectorAll('.panel-menu-layout-child');

  const setVisible = (nodes, visible) => {
    nodes.forEach(el => {
      el.style.display = visible ? '' : 'none';
    });
  };

  const isPremadeTarget =
    (isTopLevel && type === 'premade') ||
    (!isTopLevel && (type === 'premade' || type === 'empty'));
  setVisible(premadeItems, isPremadeTarget);

  let hasSource = false;
  if (type === 'premade') {
    const premadeId = isTopLevel ? panel.premadeId : child?.premadeId;
    if (premadeId) {
      const def = getPremadeDef(premadeId);
      hasSource = !!(def && def.source);
    }
  }
  setVisible(premadeSourceItems, isPremadeTarget && hasSource);

  const isCustomTarget =
    (isTopLevel && type === 'custom') ||
    (!isTopLevel && (type === 'custom' || type === 'empty'));
  setVisible(customItems, isCustomTarget);

  setVisible(externalItems, isTopLevel && type === 'external');
  setVisible(layoutItems, isTopLevel && type === 'layout');
  setVisible(layerItems, isTopLevel);

  let showChildRemove = false;
  if (!isTopLevel && target.kind === 'layoutChild' && child) {
    const isEmpty = child.type === 'empty' && !(child.content && child.content.trim());
    showChildRemove = !isEmpty;
  }
  setVisible(layoutChildRemoveItems, showChildRemove);

  positionMenuWithinViewport(panelContextMenu, x, y);
}

function getPremadeTarget(targetInfo) {
  if (!targetInfo) return null;
  if (targetInfo.kind === 'panel') {
    return targetInfo.panel;
  }
  return targetInfo.child;
}

function getCustomTarget(targetInfo) {
  if (!targetInfo) return null;
  if (targetInfo.kind === 'panel') {
    return targetInfo.panel;
  }
  return targetInfo.child;
}

function handlePanelMenuAction(targetInfo, action) {
  if (!targetInfo) return;

  const kind = targetInfo.kind;
  const parentPanel = targetInfo.panel;
  const parentTab = findPanelById(parentPanel.id)?.tab;

  switch (action) {
    case 'panel-read-more': {
      const target = getPremadeTarget(targetInfo);
      if (!target || target.type !== 'premade' || !target.premadeId) return;
      const def = getPremadeDef(target.premadeId);
      if (def && def.source) {
        window.open(def.source, '_blank', 'noopener');
      }
      break;
    }
    case 'panel-download-custom': {
      const target = getCustomTarget(targetInfo);
      if (!target || target.type !== 'custom') return;
      downloadCustomPanel(target);
      break;
    }
    case 'panel-load-custom': {
      const target = getCustomTarget(targetInfo);
      if (!target) return;
      if (kind === 'panel' && target.type !== 'custom') return;
      promptLoadCustomPanel(ctx, target, kind);
      break;
    }
    case 'panel-open-external': {
      if (kind !== 'panel') return;
      if (parentPanel.type !== 'external' || !parentPanel.externalUrl) return;
      window.open(parentPanel.externalUrl, '_blank', 'noopener');
      break;
    }
    case 'panel-layout-horizontal':
    case 'panel-layout-vertical':
    case 'panel-layout-grid': {
      if (kind !== 'panel' || parentPanel.type !== 'layout') return;
      const mode =
        action === 'panel-layout-horizontal'
          ? 'horizontal'
          : action === 'panel-layout-vertical'
          ? 'vertical'
          : 'grid';
      parentPanel.layoutMode = mode;
      if (mode === 'grid') {
        const count = (parentPanel.subPanels || []).length;
        const size = computeGridSizeForCount(count);
        parentPanel.gridRows = size.rows;
        parentPanel.gridCols = size.cols;
      }
      ctx.saveState();
      ctx.renderDesktop();
      break;
    }
    case 'panel-layout-child-remove': {
      if (kind !== 'layoutChild') return;
      if (!Array.isArray(parentPanel.subPanels)) return;
      const childId = targetInfo.child && targetInfo.child.id;
      const idx = parentPanel.subPanels.findIndex(c => c.id === childId);
      if (idx >= 0) {
        parentPanel.subPanels.splice(idx, 1);
        ctx.saveState();
        ctx.renderDesktop();
      }
      break;
    }
    case 'panel-send-front': {
      if (kind !== 'panel') return;
      parentPanel.zIndex = ctx.bumpZCounter();
      ctx.saveState();
      ctx.renderDesktop();
      break;
    }
    case 'panel-send-back': {
      if (kind !== 'panel') return;
      if (!parentTab) return;
      let minZ = parentPanel.zIndex;
      for (const p of parentTab.panels) {
        if (typeof p.zIndex === 'number') {
          minZ = Math.min(minZ, p.zIndex);
        }
      }
      parentPanel.zIndex = minZ - 1;
      ctx.saveState();
      ctx.renderDesktop();
      break;
    }
  }
}

export function setupDesktop(context) {
  ctx = context;
  ctx.hideMenus = hideMenus;

  const { desktop, desktopContextMenu, panelContextMenu } = context.elements;

  setupLayoutModule(context, {
    hideMenus,
    positionMenuWithinViewport,
    findPanelById
  });

  document.addEventListener('click', () => {
    hideMenus();
  });

  if (desktop) {
    desktop.addEventListener('contextmenu', e => {
      const panelEl = e.target.closest('.panel');
      const layoutChildEl = e.target.closest('.layout-child-panel');

      if (layoutChildEl) {
        e.preventDefault();
        const parentPanelId = layoutChildEl.dataset.parentPanelId;
        const childId = layoutChildEl.dataset.childId;
        const found = findPanelById(parentPanelId);
        if (!found || !Array.isArray(found.panel.subPanels)) return;
        const child = found.panel.subPanels.find(c => c.id === childId);
        if (!child) return;
        showPanelMenu(e.clientX, e.clientY, {
          kind: 'layoutChild',
          panel: found.panel,
          child
        });
        return;
      }

      if (panelEl) {
        const panelId = panelEl.dataset.panelId;
        const found = findPanelById(panelId);
        if (!found) return;
        if (found.panel.type === 'custom' && found.panel.isEditingCustom) {
          hideMenus();
          return;
        }
        e.preventDefault();
        showPanelMenu(e.clientX, e.clientY, {
          kind: 'panel',
          panel: found.panel
        });
        return;
      }

      e.preventDefault();
      desktopContextTargetPoint = { x: e.clientX, y: e.clientY };
      showDesktopMenu(e.clientX, e.clientY);
    });
  }

  if (desktopContextMenu) {
    desktopContextMenu.addEventListener('click', e => {
      const item = e.target.closest('.context-item');
      if (!item) return;
      const action = item.dataset.action;
      const layout = item.dataset.layout;
      const premadeId = item.dataset.premadeId;

      if ((action === 'add-premade' && !premadeId) || (action === 'add-layout' && !layout)) {
        return;
      }

      hideMenus();

      const pos = ctx.elements.desktop.getBoundingClientRect();
      const x = desktopContextTargetPoint.x - pos.left;
      const y = desktopContextTargetPoint.y - pos.top;

      if (premadeId) {
        addPanel(ctx, 'premade', {
          premadeId,
          x,
          y,
          title: getPremadeName(premadeId)
        });
      } else if (layout) {
        const layoutMode = layout;
        const niceName = layoutMode[0].toUpperCase() + layoutMode.slice(1);
        addPanel(ctx, 'layout', {
          x,
          y,
          layoutMode,
          title: `${niceName} Layout`
        });
      } else if (action === 'add-custom') {
        addPanel(ctx, 'custom', { x, y, title: 'Custom Panel' });
      } else if (action === 'add-external') {
        addPanel(ctx, 'external', { x, y, title: 'External Panel' });
      } else if (action === 'open-settings') {
        openSettings(ctx);
      }
    });
  }

  if (panelContextMenu) {
    panelContextMenu.addEventListener('click', e => {
      const item = e.target.closest('.context-item');
      if (!item) return;
      const action = item.dataset.action;
      const targetInfo = panelContextTarget;
      hideMenus();
      handlePanelMenuAction(targetInfo, action);
    });
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      hideMenus();
      closeSettings(ctx);
    }
  });
}
