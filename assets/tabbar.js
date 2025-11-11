// assets/tabbar.js

let tabContextTargetTabId = null;
let draggingTabId = null;
let draggingTabEl = null;
let dragHoverTabId = null;
let draggingIsVertical = false;
let dragGhostEl = null;

function clearDragHover(tabList) {
  if (!tabList || !dragHoverTabId) return;
  const previous = tabList.querySelector(`.tab[data-tab-id="${dragHoverTabId}"]`);
  if (previous) {
    previous.classList.remove('drag-hover');
  }
  dragHoverTabId = null;
}

function setDragHover(tabList, tabId) {
  if (!tabList) return;
  if (tabId === draggingTabId) {
    clearDragHover(tabList);
    return;
  }
  if (tabId === dragHoverTabId) return;
  clearDragHover(tabList);
  if (!tabId) return;
  const nextHover = tabList.querySelector(`.tab[data-tab-id="${tabId}"]`);
  if (nextHover) {
    nextHover.classList.add('drag-hover');
    dragHoverTabId = tabId;
  }
}

function syncTabOrderFromDom(context) {
  const { tabList } = context.elements;
  if (!tabList) return;
  const state = context.getState();
  const tabs = getTabs(state);
  if (!tabs.length) return;

  const domTabs = Array.from(tabList.querySelectorAll('.tab'));
  if (domTabs.length !== tabs.length) return;

  const idToTab = new Map(tabs.map(tab => [tab.id, tab]));
  const newOrder = domTabs
    .map(el => idToTab.get(el.dataset.tabId))
    .filter(Boolean);

  if (newOrder.length !== tabs.length) return;

  let changed = false;
  for (let i = 0; i < tabs.length; i++) {
    if (tabs[i] !== newOrder[i]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;

  tabs.length = 0;
  newOrder.forEach(tab => tabs.push(tab));
}

function finalizeTabDrag(context) {
  if (!draggingTabEl) return;
  const { tabList } = context.elements;
  draggingTabEl.classList.remove('dragging');
  if (tabList) {
    clearDragHover(tabList);
  }
  if (dragGhostEl) {
    dragGhostEl.remove();
    dragGhostEl = null;
  }
  draggingTabId = null;
  draggingTabEl = null;
  draggingIsVertical = false;
  context.saveState();
}

function getTabs(state) {
  return state.tabs || [];
}

function addTab(context) {
  const state = context.getState();
  const id = context.uid('tab');
  const tab = {
    id,
    title: 'New Tab',
    panels: []
  };
  getTabs(state).push(tab);
  state.activeTabId = id;
  context.saveState();
  context.renderAll();
}

function closeTabById(context, tabId) {
  const state = context.getState();
  if (getTabs(state).length === 1) {
    alert('You must have at least one tab.');
    return;
  }

  const tab = getTabs(state).find(t => t.id === tabId);
  const title = tab ? tab.title : 'this tab';
  const ok = confirm(`Close "${title}" and all of its panels?`);
  if (!ok) return;

  const idx = getTabs(state).findIndex(t => t.id === tabId);
  if (idx === -1) return;

  getTabs(state).splice(idx, 1);
  if (state.activeTabId === tabId) {
    const newActive = getTabs(state)[Math.max(0, idx - 1)] || getTabs(state)[0];
    state.activeTabId = newActive.id;
  }
  context.saveState();
  context.renderAll();
}

function duplicateTab(context, tabId) {
  const state = context.getState();
  const original = getTabs(state).find(t => t.id === tabId);
  if (!original) return;

  const newId = context.uid('tab');
  const newTitle = original.title + ' (copy)';

  const newPanels = (original.panels || []).map(p => {
    const clone = JSON.parse(JSON.stringify(p));
    clone.id = context.uid('panel');
    clone.x = (p.x ?? 80) + 20;
    clone.y = (p.y ?? 80) + 20;
    return clone;
  });

  const newTab = {
    id: newId,
    title: newTitle,
    panels: newPanels
  };

  getTabs(state).push(newTab);
  state.activeTabId = newId;
  context.saveState();
  context.renderAll();
}

function renameTab(context, tabId) {
  const state = context.getState();
  const tab = getTabs(state).find(t => t.id === tabId);
  if (!tab) return;
  const newName = prompt('Tab name:', tab.title);
  if (newName && newName.trim()) {
    tab.title = newName.trim();
    context.saveState();
    context.renderTabs();
  }
}

function reorderTabs(context, fromId, toId) {
  if (fromId === toId) return;
  const state = context.getState();
  const tabs = getTabs(state);
  const fromIndex = tabs.findIndex(t => t.id === fromId);
  const toIndex = tabs.findIndex(t => t.id === toId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, moved);
  context.saveState();
  context.renderTabs();
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

function showTabMenu(context, x, y, tabId) {
  const { tabContextMenu } = context.elements;
  if (!tabContextMenu) return;
  tabContextTargetTabId = tabId;
  positionMenuWithinViewport(tabContextMenu, x, y);
}

export function renderTabs(context) {
  const state = context.getState();
  const { tabList } = context.elements;
  if (!tabList) return;

  tabList.innerHTML = '';
  getTabs(state).forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === state.activeTabId ? ' active' : '');
    el.dataset.tabId = tab.id;
    el.draggable = true;

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = tab.title;

    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '×';
    close.title = 'Close tab';

    el.appendChild(label);
    el.appendChild(close);
    tabList.appendChild(el);
  });
}

export function setupTabbar(context) {
  const { addTabBtn, tabList, tabContextMenu } = context.elements;

  if (addTabBtn) {
    addTabBtn.addEventListener('click', () => {
      addTab(context);
    });
  }

  if (tabList) {
    tabList.addEventListener('click', e => {
      const tabEl = e.target.closest('.tab');
      if (!tabEl) return;
      const tabId = tabEl.dataset.tabId;

      if (e.target.classList.contains('tab-close')) {
        closeTabById(context, tabId);
      } else {
        const state = context.getState();
        state.activeTabId = tabId;
        context.saveState();
        context.renderAll();
      }
    });

    tabList.addEventListener('contextmenu', e => {
      const tabEl = e.target.closest('.tab');
      if (!tabEl) return;
      e.preventDefault();
      const tabId = tabEl.dataset.tabId;
      showTabMenu(context, e.clientX, e.clientY, tabId);
    });

    tabList.addEventListener('dragstart', e => {
      const tabEl = e.target.closest('.tab');
      if (!tabEl) return;
      draggingTabId = tabEl.dataset.tabId;
      draggingTabEl = tabEl;
      draggingTabEl.classList.add('dragging');
      clearDragHover(tabList);
      draggingIsVertical = window.getComputedStyle(tabList).flexDirection.startsWith('column');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', draggingTabId);
        } catch (_err) {
          // Ignore if setting data is not allowed.
        }
        if (dragGhostEl) {
          dragGhostEl.remove();
        }
        dragGhostEl = tabEl.cloneNode(true);
        dragGhostEl.classList.add('drag-ghost');
        Object.assign(dragGhostEl.style, {
          position: 'absolute',
          pointerEvents: 'none',
          top: '-9999px',
          left: '-9999px'
        });
        document.body.appendChild(dragGhostEl);
        const rect = dragGhostEl.getBoundingClientRect();
        const offsetX = rect.width / 2;
        const offsetY = rect.height / 2;
        try {
          e.dataTransfer.setDragImage(dragGhostEl, offsetX, offsetY);
        } catch (_err) {
          // Ignore if custom drag image is not supported.
        }
      }
    });

    tabList.addEventListener('dragover', e => {
      if (!draggingTabId || !draggingTabEl) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }

      const tabs = Array.from(tabList.querySelectorAll('.tab'));
      let targetTab = null;
      const pointer = draggingIsVertical ? e.clientY : e.clientX;
      for (const tab of tabs) {
        if (tab === draggingTabEl) continue;
        const rect = tab.getBoundingClientRect();
        const midpoint = draggingIsVertical
          ? rect.top + rect.height / 2
          : rect.left + rect.width / 2;
        if (pointer < midpoint) {
          targetTab = tab;
          break;
        }
      }

      if (!targetTab) {
        setDragHover(tabList, null);
        if (draggingTabEl.nextElementSibling) {
          tabList.appendChild(draggingTabEl);
          syncTabOrderFromDom(context);
        }
        return;
      }

      setDragHover(tabList, targetTab.dataset.tabId);

      const siblings = Array.from(tabList.children);
      const draggingIndex = siblings.indexOf(draggingTabEl);
      const targetIndex = siblings.indexOf(targetTab);
      if (draggingIndex === -1 || targetIndex === -1) return;

      if (draggingIndex < targetIndex && targetIndex - draggingIndex === 1) {
        return;
      }

      tabList.insertBefore(draggingTabEl, targetTab);
      syncTabOrderFromDom(context);
    });

    tabList.addEventListener('drop', e => {
      e.preventDefault();
    });

    tabList.addEventListener('dragend', () => {
      finalizeTabDrag(context);
    });
  }

  if (tabContextMenu) {
    tabContextMenu.addEventListener('click', e => {
      const item = e.target.closest('.context-item');
      if (!item) return;
      const action = item.dataset.action;
      const tabId = tabContextTargetTabId;
      if (context.hideMenus) {
        context.hideMenus();
      } else {
        tabContextMenu.style.display = 'none';
      }

      if (action === 'rename-tab') {
        renameTab(context, tabId);
      } else if (action === 'duplicate-tab') {
        duplicateTab(context, tabId);
      } else if (action === 'close-tab') {
        closeTabById(context, tabId);
      }
    });
  }
}
