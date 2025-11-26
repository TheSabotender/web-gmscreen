import { renderWallpaper, renderDesktop, setupDesktop } from './desktop.js';
import { initPremadeSubmenu } from './panel_premade.js';

const STORAGE_KEY = 'webDesktopStateV1';
const WEBM_PATTERN = /\.webm(?:$|\?)/i;

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
            panels: null
        }
    ],
    activeTabId: 'tab-1'
};

let state = null;
let zCounter = 1;

function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 9);
}

function loadState(raw) {
    try {
        if (!raw) return structuredClone(DEFAULT_STATE);
        const parsed = JSON.parse(raw);

        if (!parsed.settings) parsed.settings = {};

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

function loadStateAndEnforcePlayerTab() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = loadState(raw);

    let tab = parsed.tabs.find(t => t.title === 'Player');
    parsed.tabs = structuredClone(DEFAULT_STATE.tabs);
    if (tab) {
        parsed.tabs[0] = tab;
    }
    parsed.activeTabId = parsed.tabs[0].id;

    return parsed;
}

function saveState() { }

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

function renderBackground(context) {
    const {
        appRoot,
        wallpaper,
        desktop,
    } = context.elements;

    if (appRoot) {
        appRoot.classList.remove('tabbar-bottom', 'tabbar-top', 'tabbar-left', 'tabbar-right');
        appRoot.classList.add(`tabbar-${state.settings.tabBarPosition}`);
    }

    if (wallpaper) {
        const bgColor = state.settings.backgroundColor || '#1e1f22';
        wallpaper.style.setProperty('--wallpaper-base-bg', bgColor);

        const url = state.settings.backgroundUrl || '';
        const isVideo = WEBM_PATTERN.test(url);
        wallpaper.classList.toggle('has-video-background', isVideo);
        if (isVideo) {
            wallpaper.style.setProperty('--wallpaper-bg-image', 'none');
        } else if (url) {
            wallpaper.style.setProperty('--wallpaper-bg-image', `url("${url}")`);
        } else {
            wallpaper.style.setProperty('--wallpaper-bg-image', 'none');
        }

        const mode = state.settings.backgroundMode || 'envelop';
        let size = 'cover';
        let repeat = 'no-repeat';

        if (mode === 'fit') {
            size = 'contain';
            repeat = 'no-repeat';
        } else if (mode === 'tiled') {
            size = 'auto';
            repeat = 'repeat';
        }

        wallpaper.style.setProperty('--wallpaper-bg-size', size);
        wallpaper.style.setProperty('--wallpaper-bg-repeat', repeat);

        let videoFit = 'cover';
        if (mode === 'fit') {
            videoFit = 'contain';
        } else if (mode === 'tiled') {
            videoFit = 'none';
        }
        wallpaper.style.setProperty('--wallpaper-video-object-fit', videoFit);

        const opacity = state.settings.backgroundOpacity ?? 1;
        wallpaper.style.setProperty('--wallpaper-bg-opacity', String(opacity));
    }

    renderWallpaper(context);
}

function renderAll(context) {
    renderBackground(context);
    renderDesktop(context, true);
}


const context = {
    elements: {
        appRoot: document.getElementById('app-root'),
        wallpaper: document.getElementById('wallpaper'),
        desktop: document.getElementById('desktop'),
    },
    getState: () => state,
    setState: value => {
        state = value;
        normalizeZIndexes();
    },
    getDefaultState: () => structuredClone(DEFAULT_STATE),
    uid,
    getZCounter: () => zCounter,
    bumpZCounter: () => ++zCounter,
    setZCounter: value => {
        zCounter = value;
    },
    loadState: () => loadStateAndEnforcePlayerTab(),
    saveState: () => saveState(),
    renderAll: () => renderAll(context),
    renderWallpaper: () => renderBackground(context),
    renderDesktop: () => renderDesktop(context, true),
};

document.addEventListener('DOMContentLoaded', () => {
    state = loadStateAndEnforcePlayerTab();
    normalizeZIndexes();

    initPremadeSubmenu(context);
    setupDesktop(context);
    renderAll(context);
});



window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
        const oldState = loadState(event.oldValue);
        const newState = loadState(event.newValue);

        if (event.oldValue === event.newValue)
            return;

        // Check if background settings changed
        if (oldState.settings.backgroundUrl !== newState.settings.backgroundUrl ||
            oldState.settings.backgroundMode !== newState.settings.backgroundMode ||
            oldState.settings.backgroundOpacity !== newState.settings.backgroundOpacity ||
            oldState.settings.backgroundColor !== newState.settings.backgroundColor ||
            oldState.settings.backgroundVideoMuted !== newState.settings.backgroundVideoMuted) {
            renderBackground(context);
        }

        //const playerTab = newState.tabs.find(t => t.title === 'Player');
        //if (newState.activeTabId !== playerTab.id)
        //    return;

        console.log(newState);

        state = loadStateAndEnforcePlayerTab();
        normalizeZIndexes();
        renderDesktop(context, true);
    }
});