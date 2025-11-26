// assets/main.js

import './foundry-utils.js';
import { Messages } from './messages.js';
import { renderWallpaper, renderDesktop, setupDesktop } from './desktop.js';
import { renderTabs, setupTabbar } from './tabbar.js';
import { renderSettings, setupSettings } from './settings.js';
import { initPremadeSubmenu } from './panel_premade.js';
import { createDicePanelState, ensureDicePanels } from './panel_dice.js';

const IS_DEBUG_MODE = new URLSearchParams(window.location.search).has('debug');

const STORAGE_KEY = 'webDesktopStateV1';

const DEFAULT_STATE = {
  settings: {
    tabBarPosition: 'bottom',
    backgroundUrl: '',
    backgroundMode: 'envelop',
    backgroundOpacity: 1,
    backgroundColor: '#1e1f22',
    backgroundVideoMuted: true
  },
  tabs: [
    {
      id: 'tab-1',
      title: 'Tab 1',
      panels: [createDicePanelState('panel-dice')]
    }
  ],
  activeTabId: 'tab-1'
};

let state = null;
let zCounter = 1;

function uid(prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2, 9);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);

    if (!parsed.settings) parsed.settings = {};

    if (!parsed.settings.tabBarPosition) parsed.settings.tabBarPosition = 'bottom';
    if (typeof parsed.settings.backgroundUrl !== 'string') parsed.settings.backgroundUrl = '';
    if (!parsed.settings.backgroundMode) parsed.settings.backgroundMode = 'envelop';
    if (typeof parsed.settings.backgroundOpacity !== 'number') parsed.settings.backgroundOpacity = 1;
    if (typeof parsed.settings.backgroundColor !== 'string') parsed.settings.backgroundColor = '#1e1f22';
    if (typeof parsed.settings.backgroundVideoMuted !== 'boolean') parsed.settings.backgroundVideoMuted = true;

    if (!parsed.tabs || !parsed.tabs.length) {
      parsed.tabs = structuredClone(DEFAULT_STATE.tabs);
      parsed.activeTabId = parsed.tabs[0].id;
    }

    return parsed;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

function normalizeZIndexes() {
  zCounter = 1;
  for (const tab of state.tabs || []) {
    for (const panel of tab.panels || []) {
      if (typeof panel.zIndex !== 'number') {
        panel.zIndex = zCounter++;
      } else {
        zCounter = Math.max(zCounter, panel.zIndex + 1);
      }
    }
  }
}

function renderAll(context) {
  renderWallpaper(context);
  renderSettings(context);
  renderTabs(context);
  renderDesktop(context, false);
}

document.addEventListener('DOMContentLoaded', () => {
  const context = {
    elements: {
      appRoot: document.getElementById('app-root'),
      wallpaper: document.getElementById('wallpaper'),
      desktop: document.getElementById('desktop'),
      tabList: document.getElementById('tab-list'),
      addTabBtn: document.getElementById('add-tab-btn'),
      desktopContextMenu: document.getElementById('desktop-context-menu'),
      tabContextMenu: document.getElementById('tab-context-menu'),
      layoutChildContextMenu: document.getElementById('layout-child-context-menu'),
      layoutPremadeSubmenu: document.getElementById('layout-premade-submenu'),
      premadePanelSubmenu: document.getElementById('premade-panel-submenu'),
      panelContextMenu: document.getElementById('panel-context-menu'),
      panelSwapPremadeSubmenu: document.getElementById('panel-swap-premade-submenu'),
      panelCustomUploadInput: document.getElementById('panel-custom-upload'),
      settingsOverlay: document.getElementById('settings-overlay'),
      settingsClose: document.getElementById('settings-close'),
      exportJsonBtn: document.getElementById('export-json-btn'),
      importJsonFile: document.getElementById('import-json-file'),
      backgroundUrlInput: document.getElementById('background-url-input'),
      backgroundUrlPresetsBtn: document.getElementById('background-url-presets-btn'),
      backgroundUrlPresets: document.getElementById('background-url-presets'),
      backgroundModeRadios: document.querySelectorAll('input[name="background-mode"]'),
      backgroundOpacitySlider: document.getElementById('background-opacity-slider'),
      backgroundOpacityValue: document.getElementById('background-opacity-value'),
      backgroundColorInput: document.getElementById('background-color-input'),
      backgroundVideoOptions: document.getElementById('background-video-options'),
      backgroundVideoMutedCheckbox: document.getElementById('background-video-muted')
    },
    getState: () => state,
    setState: value => {
      state = value;
      ensureDicePanels(state, { createId: () => uid('panel') });
      normalizeZIndexes();
    },
    getDefaultState: () => structuredClone(DEFAULT_STATE),
    uid,
    isDebug: IS_DEBUG_MODE,
    getZCounter: () => zCounter,
    bumpZCounter: () => ++zCounter,
    setZCounter: value => {
      zCounter = value;
    },
    saveState: () => saveState(),
    loadState: () => loadState(),
    renderAll: () => renderAll(context),
    renderWallpaper: () => renderWallpaper(context),
    renderDesktop: () => renderDesktop(context, false),
    renderTabs: () => renderTabs(context),
    renderSettings: () => renderSettings(context),
    messages: Messages
  };

  state = loadState();
  ensureDicePanels(state, { createId: () => uid('panel') });
  normalizeZIndexes();

  initPremadeSubmenu(context);
  setupDesktop(context);
  setupTabbar(context);
  setupSettings(context);

  renderAll(context);
});