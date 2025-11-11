// assets/panel_layout.js

import { renderLinearLayout } from './panel_linearLayout.js';
import { renderGridLayout } from './panel_gridLayout.js';
import { getPremadeName, loadPremadeContent } from './panel_premade.js';

let ctx = null;
let hideAllMenus = () => {};
let positionMenu = () => {};
let layoutContextTarget = null;
let layoutMenuHandler = null;
let findPanelByIdFn = null;

export function setupLayoutModule(context, options = {}) {
  ctx = context;
  hideAllMenus = options.hideMenus || (() => {});
  positionMenu = options.positionMenuWithinViewport || ((menu, x, y) => {
    if (!menu) return;
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
  });
  findPanelByIdFn = options.findPanelById || null;

  const { layoutChildContextMenu } = context.elements;
  if (!layoutChildContextMenu) return;

  if (layoutMenuHandler) {
    layoutChildContextMenu.removeEventListener('click', layoutMenuHandler);
  }

  layoutMenuHandler = e => {
    const item = e.target.closest('.context-item');
    if (!item) return;
    const action = item.dataset.action;
    const premadeId = item.dataset.premadeId;
    const target = layoutContextTarget;
    hideAllMenus();
    handleLayoutChildMenu(target, action, premadeId);
  };

  layoutChildContextMenu.addEventListener('click', layoutMenuHandler);
}

export function clearLayoutContextTarget() {
  layoutContextTarget = null;
}

export function renderLayoutPanel(context, panel, bodyEl, helpers = {}) {
  if (!bodyEl) return;

  ctx = context;
  panel.subPanels = panel.subPanels || [];

  const layout = document.createElement('div');
  layout.className = 'layout-container';

  const mode = panel.layoutMode || 'grid';
  const layoutHelpers = {
    showLayoutChildMenu: (x, y, target) => showLayoutChildMenu(x, y, target),
    enterCustomChildEdit: helpers.enterCustomChildEdit,
    enterExternalChildEdit: helpers.enterExternalChildEdit
  };

  if (mode === 'horizontal' || mode === 'vertical') {
    renderLinearLayout(panel, layout, {
      mode,
      ...layoutHelpers
    });
  } else {
    renderGridLayout(panel, layout, {
      showLayoutChildMenu: layoutHelpers.showLayoutChildMenu
    });
  }

  bodyEl.appendChild(layout);
}

export function showLayoutChildMenu(x, y, target) {
  if (!ctx) return;
  const { layoutChildContextMenu } = ctx.elements;
  if (!layoutChildContextMenu) return;

  hideAllMenus();
  layoutContextTarget = target;

  const removeItem = layoutChildContextMenu.querySelector('[data-action="layout-remove"]');
  let showRemove = false;

  if (target.childId) {
    const found = findLayoutChild(target.parentPanelId, target.childId);
    if (found) {
      const isEmpty = found.type === 'empty' && !(found.content && found.content.trim());
      showRemove = !isEmpty;
    }
  }

  if (removeItem) {
    removeItem.style.display = showRemove ? '' : 'none';
  }

  positionMenu(layoutChildContextMenu, x, y);
}

function handleLayoutChildMenu(target, action, premadeId) {
  if (!target || !ctx) return;

  const found = findLayoutPanel(target.parentPanelId);
  if (!found || !Array.isArray(found.panel.subPanels)) return;

  const panel = found.panel;
  const children = panel.subPanels;

  let child = null;
  let index = -1;

  if (target.childId) {
    child = children.find(c => c.id === target.childId);
    if (child) {
      index = children.findIndex(c => c.id === target.childId);
    }
  }

  function ensureChildAtSlot(slotIndex) {
    if (child) return child;
    index = slotIndex;
    if (index < 0) index = children.length;
    if (index > children.length) index = children.length;

    const newChild = {
      id: ctx.uid('layout-child'),
      title: `Area ${index + 1}`,
      type: 'custom',
      content: '',
      customContent: '',
      externalUrl: ''
    };

    if (index === children.length) {
      children.push(newChild);
    } else {
      children.splice(index, 0, newChild);
    }

    child = newChild;
    return child;
  }

  if (premadeId) {
    const slotIndex = typeof target.slotIndex === 'number' ? target.slotIndex : children.length;
    const c = ensureChildAtSlot(slotIndex);
    c.type = 'premade';
    c.premadeId = premadeId;
    c.title = getPremadeName(premadeId);
    c.content = '';

    ctx.saveState();
    ctx.renderDesktop();

    loadPremadeContent(premadeId)
      .then(html => {
        c.content = html;
        ctx.saveState();
        ctx.renderDesktop();
      })
      .catch(() => {
        c.content = '<em>Failed to load panel.</em>';
        ctx.saveState();
        ctx.renderDesktop();
      });
    return;
  }

  if (action === 'layout-add-custom') {
    const slotIndex = typeof target.slotIndex === 'number' ? target.slotIndex : children.length;
    const c = ensureChildAtSlot(slotIndex);
    c.type = 'custom';
    c.customContent = '<em>Click the ✎ in the top right corner to edit this panel.</em>';
    c.title = 'Custom Panel';
    ctx.saveState();
    ctx.renderDesktop();
    return;
  }

  if (action === 'layout-add-external') {
    const slotIndex = typeof target.slotIndex === 'number' ? target.slotIndex : children.length;
    const c = ensureChildAtSlot(slotIndex);
    c.type = 'external';
    c.externalUrl = '';
    c.title = 'External Panel';
    ctx.saveState();
    ctx.renderDesktop();
    return;
  }

  if (action === 'layout-remove') {
    if (child && index >= 0) {
      children.splice(index, 1);
      ctx.saveState();
      ctx.renderDesktop();
    }
  }
}

function findLayoutPanel(panelId) {
  if (!ctx) return null;
  if (typeof findPanelByIdFn === 'function') {
    return findPanelByIdFn(panelId, ctx);
  }

  const state = ctx.getState();
  for (const tab of state.tabs || []) {
    const panel = (tab.panels || []).find(p => p.id === panelId);
    if (panel) {
      return { tab, panel };
    }
  }
  return null;
}

function findLayoutChild(panelId, childId) {
  const found = findLayoutPanel(panelId);
  if (!found) return null;
  const children = found.panel.subPanels || [];
  return children.find(c => c.id === childId) || null;
}
