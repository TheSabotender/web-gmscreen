// assets/app.js

(() => {
  const STORAGE_KEY = 'webDesktopStateV1';

  const DEFAULT_STATE = {
    settings: {
      tabBarPosition: 'bottom',
      backgroundUrl: '',
      backgroundMode: 'envelop',      // 'fit' | 'envelop' | 'tiled'
      backgroundOpacity: 1,           // 0..1
      backgroundColor: '#1e1f22'
    },
    tabs: [
      {
        id: 'tab-1',
        title: 'Tab 1',
        panels: []
      }
    ],
    activeTabId: 'tab-1'
  };

  let state = null;
  let draggingPanel = null;
  let dragOffset = { x: 0, y: 0 };
  let resizingPanel = null;
  let resizeStart = { x: 0, y: 0, width: 0, height: 0 };
  let draggingTabId = null;
  let desktopContextTargetPoint = { x: 0, y: 0 };
  let tabContextTargetTabId = null;
  let layoutContextTarget = null; // { parentPanelId, childId }
  let panelContextTargetId = null;
  let panelContextTarget = null; 
  let zCounter = 1;
// { kind: 'panel', panelId }
// or { kind: 'layoutChild', parentPanelId, childId }

  const appRoot = document.getElementById('app-root');
  const desktop = document.getElementById('desktop');
  const tabList = document.getElementById('tab-list');
  const addTabBtn = document.getElementById('add-tab-btn');

  const desktopContextMenu = document.getElementById('desktop-context-menu');
  const tabContextMenu = document.getElementById('tab-context-menu');

  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonFile = document.getElementById('import-json-file');
  const backgroundUrlInput = document.getElementById('background-url-input');
  const backgroundModeRadios = document.querySelectorAll('input[name="background-mode"]');
  const backgroundOpacitySlider = document.getElementById('background-opacity-slider');
  const backgroundOpacityValue = document.getElementById('background-opacity-value');
  const backgroundColorInput = document.getElementById('background-color-input');
  const layoutChildContextMenu = document.getElementById('layout-child-context-menu');
  const layoutPremadeSubmenu = document.getElementById('layout-premade-submenu');

  const premadePanelSubmenu = document.getElementById('premade-panel-submenu');
  
  const panelContextMenu = document.getElementById('panel-context-menu');
  const panelSwapPremadeSubmenu = document.getElementById('panel-swap-premade-submenu');
  const panelCustomUploadInput = document.getElementById('panel-custom-upload');

  // Utility: generate IDs
  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 9);
  }
  
  // Persistence
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

  // Render -----------------------------------------------------------

  function render() {
    renderSettings();
    renderTabs();
    renderDesktop();
  }

  function renderSettings() {
    // Tab bar position
    appRoot.classList.remove('tabbar-bottom', 'tabbar-top', 'tabbar-left', 'tabbar-right');
    appRoot.classList.add(`tabbar-${state.settings.tabBarPosition}`);

    // Background base color
    const bgColor = state.settings.backgroundColor || '#1e1f22';
    desktop.style.setProperty('--desktop-base-bg', bgColor);

    // Background image & mode
    const url = state.settings.backgroundUrl || '';
    if (url) {
      desktop.style.setProperty('--desktop-bg-image', `url("${url}")`);
    } else {
      desktop.style.setProperty('--desktop-bg-image', 'none');
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
    } else {
      // envelop
      size = 'cover';
      repeat = 'no-repeat';
    }

    desktop.style.setProperty('--desktop-bg-size', size);
    desktop.style.setProperty('--desktop-bg-repeat', repeat);

    const opacity = state.settings.backgroundOpacity ?? 1;
    desktop.style.setProperty('--desktop-bg-opacity', String(opacity));

    // Settings UI controls
    const posRadios = document.querySelectorAll('input[name="tabbar-position"]');
    posRadios.forEach(r => {
      r.checked = (r.value === state.settings.tabBarPosition);
    });

    if (backgroundUrlInput) {
      backgroundUrlInput.value = state.settings.backgroundUrl || '';
    }

    if (backgroundModeRadios) {
      backgroundModeRadios.forEach(r => {
        r.checked = (r.value === state.settings.backgroundMode);
      });
    }

    if (backgroundOpacitySlider && backgroundOpacityValue) {
      const percent = Math.round(opacity * 100);
      backgroundOpacitySlider.value = String(percent);
      backgroundOpacityValue.textContent = percent + '%';
    }

    if (backgroundColorInput) {
      backgroundColorInput.value = bgColor;
    }
  }

  function renderTabs() {
    tabList.innerHTML = '';
    const tabs = state.tabs;

    tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = 'tab' + (tab.id === state.activeTabId ? ' active' : '');
      el.setAttribute('data-tab-id', tab.id);
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

  function renderDesktop() {
    desktop.innerHTML = '';
    const currentTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!currentTab) return;

    currentTab.panels.forEach(panel => {
      const el = document.createElement('div');
      el.className = 'panel';
      el.dataset.panelId = panel.id;

      // Position always from saved x/y
      el.style.left = (panel.x ?? 60) + 'px';
      el.style.top = (panel.y ?? 60) + 'px';
      el.style.zIndex = (typeof panel.zIndex === 'number' ? panel.zIndex : 1);
      
      // Height always from saved height (minimized CSS will override visually)
      el.style.height = (panel.height ?? 200) + 'px';

      // Width depends on minimized state
      if (panel.minimized) {
        // Let the panel shrink to just the header + buttons
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
        editBtn.title = panel.type === 'external'
           ? 'Edit exteral URL'
           : 'Edit custom content';
           
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
      
      // "Read more" button for premade panels with a source URL
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
      
      // Add Row/Column to Grid Layouts
      if (panel.type === 'layout') {
        const mode = panel.layoutMode || 'grid';

      // Layout-specific header controls
      if (mode === 'horizontal' || mode === 'vertical') {
        if ((panel.subPanels || []).length >= 2) {
          const addBtn = document.createElement('button');
          addBtn.className = 'panel-btn';
          addBtn.textContent = 'Add';
          addBtn.title = 'Add new area';
          addBtn.addEventListener('click', e => {
            e.stopPropagation();
            // Ask user what to add into a new slot at the end
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
          saveState();
          renderDesktop();
        });

        const addColBtn = document.createElement('button');
        addColBtn.className = 'panel-btn';
        addColBtn.textContent = '+Col';
        addColBtn.title = 'Add column';
        addColBtn.addEventListener('click', e => {
          e.stopPropagation();
          ensureGridDimensions(panel);
          panel.gridCols += 1;
          saveState();
          renderDesktop();
        });

        headerButtons.insertBefore(addColBtn, headerButtons.firstChild);
        headerButtons.insertBefore(addRowBtn, headerButtons.firstChild);
      }
      }

      const minimizeBtn = document.createElement('button');
      minimizeBtn.className = 'panel-btn';

      // Choose the symbol depending on minimized state
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

      const closeBtn = document.createElement('button');
      closeBtn.className = 'panel-btn';
      closeBtn.textContent = '×';
      closeBtn.title = 'Close panel';
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closePanel(panel.id);
      });
      headerButtons.appendChild(closeBtn);

      header.appendChild(title);
      header.appendChild(headerButtons);

      const body = document.createElement('div');
      body.className = 'panel-body';

      // Panel content by type
      if (panel.type === 'premade') {
        body.innerHTML = panel.cachedContent || `<em>Loading…</em>`;
        if (!panel.cachedContent && panel.premadeId) {
          loadPremadeContent(panel.premadeId).then(html => {
            panel.cachedContent = html;
            body.innerHTML = html;
            saveState();
          }).catch(() => {
            body.innerHTML = `<em>Failed to load panel.</em>`;
          });
        }
      } else if (panel.type === 'custom') {
        body.innerHTML = panel.customContent || '<em>Empty custom panel. Click ✎ to edit.</em>';
      } else if (panel.type === 'external') {
        if (panel.externalUrl && panel.externalUrl.trim()) {
          const iframe = document.createElement('iframe');
          iframe.className = 'external-frame';
          iframe.src = panel.externalUrl;
          body.appendChild(iframe);
        } else {
          body.innerHTML = '<em>No URL set. Click ✎ to set an external URL.</em>';
        }
      } else if (panel.type === 'layout') {
        const mode = panel.layoutMode || 'grid';
        panel.subPanels = panel.subPanels || [];

        const layout = document.createElement('div');
        layout.className = 'layout-container';

        if (mode === 'horizontal') {
          layout.classList.add('layout-horizontal');
        } else if (mode === 'vertical') {
          layout.classList.add('layout-vertical');
        } else {
          layout.classList.add('layout-grid');
        }
        
        if (mode === 'horizontal' || mode === 'vertical') {
          // H/V rules:
          //  - 0 children => 2 "+" boxes
          //  - 1 child    => 1 child + 1 "+"
          //  - >=2        => show all children; Add button in header

          const children = panel.subPanels;
          const childCount = (children || []).length;

          const slots = [];

          // Always show existing children
          if (childCount > 0) {
            children.forEach(child => {
              slots.push({ type: 'child', child });
            });
          }

          // Add placeholder slots as needed (0 or 1 or none)
          if (childCount === 0) {
            slots.push({ type: 'placeholder' });
            slots.push({ type: 'placeholder' });
          } else if (childCount === 1) {
            slots.push({ type: 'placeholder' });
          }
           
          slots.forEach((slot, index) => {
            const childEl = document.createElement('div');
            childEl.className = 'layout-child-panel';
            
            const child = slot.child;
            childEl.dataset.parentPanelId = panel.id;

            const childHasContent = child && child.content && child.content.trim();

            if (child && (childHasContent || child.type === 'custom' || child.type === 'external')) {
              childEl.dataset.childId = child.id;

              const header = document.createElement('div');
              header.className = 'layout-child-header';
              header.textContent = child.title || `Area ${index + 1}`;

              if (child.type === 'custom' || child.type === 'external') {
                const editBtn = document.createElement('button');
                editBtn.className = 'panel-btn';
                editBtn.textContent = '✎';
                editBtn.title = child.type === 'external'
                    ? 'Edit external URL'
                    : 'Edit custom content';

                editBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    if (child.type === 'external') {
                        enterExternalLayoutEditMode(panel.id, child.id, el);
                    } else {
                        enterCustomLayoutEditMode(panel.id, child.id, el);
                    }
                });
                header.appendChild(editBtn);
              }

              const bodyEl = document.createElement('div');
              bodyEl.className = 'layout-child-body';

              if (child.type === 'custom') {
                bodyEl.innerHTML = child.customContent;
              } else if (child.type === 'external') {
                if (child.externalUrl && child.externalUrl.trim()) {
                    const iframe = document.createElement('iframe');
                    iframe.className = 'external-frame';
                    iframe.src = child.externalUrl;
                    bodyEl.appendChild(iframe);
                } else {
                    bodyEl.innerHTML = '<em>No URL set. Click ✎ to set an external URL.</em>';
                }
              } else {
                bodyEl.innerHTML = child.content;
              }
 
              childEl.appendChild(header);
              childEl.appendChild(bodyEl);
            } else {
              // Empty child -> show "+"
              childEl.innerHTML = '<div class="layout-child-placeholder">+</div>';
                
              const openMenu = e => {
                e.preventDefault();
                e.stopPropagation();
                showLayoutChildMenu(e.clientX, e.clientY, {
                  parentPanelId: panel.id,
                  slotIndex: index
                });
              };
               
              childEl.addEventListener('click', openMenu);
              childEl.addEventListener('contextmenu', openMenu);                
            }
            
            layout.appendChild(childEl);
          });
          
          body.appendChild(layout);
        } else {   
          // GRID mode:
          // Always rows x cols cells; if index < subPanels.length => child, else "+"
          ensureGridDimensions(panel);
          const rows = panel.gridRows;
          const cols = panel.gridCols;
          const children = panel.subPanels;
          const totalSlots = rows * cols;

          layout.classList.add('layout-grid');
          layout.style.display = 'grid';
          layout.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
          
          for (let i = 0; i < totalSlots; i++) {
            const cellEl = document.createElement('div');
            cellEl.className = 'layout-child-panel';

            const child = children[i];
            if (child) {
                cellEl.dataset.childId = child.id;
                cellEl.dataset.parentPanelId = panel.id;

                if (child.content && child.content.trim()) {
                    const header = document.createElement('div');
                    header.className = 'layout-child-header';
                    header.textContent = child.title || `Area ${i + 1}`;

                    const bodyEl = document.createElement('div');
                    bodyEl.className = 'layout-child-body';
                    bodyEl.innerHTML = child.content;

                    cellEl.appendChild(header);
                    cellEl.appendChild(bodyEl);
                } else {
                  cellEl.innerHTML = '<div class="layout-child-placeholder">+</div>';
                  cellEl.addEventListener('click', e => {
                      e.stopPropagation();
                      showLayoutChildMenu(e.clientX, e.clientY, {
                          parentPanelId: panel.id,
                          childId: child.id
                      });
                  });
              }
          } else {
            // Empty slot => "+" that creates a new child at this index
            cellEl.innerHTML = '<div class="layout-child-placeholder">+</div>';
            const openMenuNew = e => {
              e.preventDefault();
              e.stopPropagation();                            
              showLayoutChildMenu(e.clientX, e.clientY, {
                parentPanelId: panel.id,
                slotIndex: i
              });
            };

            cellEl.addEventListener('click', openMenuNew);
            cellEl.addEventListener('contextmenu', openMenuNew);
          }

          layout.appendChild(cellEl);
        }
          
        body.appendChild(layout);
      } 
    }


      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'panel-resize-handle';

      el.appendChild(header);
      el.appendChild(body);
      el.appendChild(resizeHandle);
      desktop.appendChild(el);

      // Dragging
      header.addEventListener('mousedown', startPanelDrag);

      // Double-click header to minimize/restore
      header.addEventListener('dblclick', () => {
        togglePanelMinimized(panel.id);
      });

      // Resize
      resizeHandle.addEventListener('mousedown', startPanelResize);
    });
  }

  // Panels -----------------------------------------------------------

  function getActiveTab() {
    return state.tabs.find(t => t.id === state.activeTabId);
  }

  function addPanel(type, options = {}) {
    const tab = getActiveTab();
    if (!tab) return;
    const id = uid('panel');

    let defaultWidth = 320;
    let defaultHeight = 200;

    // If premade, try to use width/height from panels.json
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
      zIndex: ++zCounter,
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
    saveState();
    renderDesktop();
  }

  function findPanelById(panelId) {
    for (const tab of state.tabs) {
      const p = tab.panels.find(p => p.id === panelId);
      if (p) return { tab, panel: p };
    }
    return null;
  }

  function findSubPanelById(layoutId, panelId) {
    for (const tab of state.tabs) {
      const layout = findPanelById(layoutId);
      
      if (layout) {
        const subPanels = layout.panel.subPanels || [];
        if (!subPanels) continue;

        const subPanel = subPanels.find(p => p.id === panelId);
        if (subPanel) return { tab, layout, panel: subPanel };
      }
    }
    console.warn('Panel not found for external edit mode:', panelId);
    return null;
  }

  function togglePanelMinimized(panelId) {
    const found = findPanelById(panelId);
    if (!found) return;
    found.panel.minimized = !found.panel.minimized;
    saveState();
    
   renderDesktop();
  }

  function closePanel(panelId) {
    const found = findPanelById(panelId);
    if (!found) return;
    const { tab, panel } = found;

    if (panel.type === 'custom') {
      const ok = confirm('Close this custom panel? Its custom content will be lost.');
      if (!ok) return;
    }

    tab.panels = tab.panels.filter(p => p.id !== panelId);
    saveState();
    renderDesktop();
  }
  
  function computeGridSizeForCount(n) {
    // Always at least 2x2
    if (n <= 4) {
      return { rows: 2, cols: 2 };
    }
    let rows = 2;
    let cols = 2;
    const target = Math.max(n, 4);
    while (rows * cols < target) {
      if (cols <= rows) cols++;
      else rows++;
    }
    return { rows, cols };
  }

  function ensureGridDimensions(panel) {
    const n = (panel.subPanels || []).length;
    if (!panel.gridRows || !panel.gridCols) {
      const size = computeGridSizeForCount(Math.max(n, 0));
      panel.gridRows = size.rows;
      panel.gridCols = size.cols;
    } else {
      // Ensure at least enough cells for current subPanels
      const size = computeGridSizeForCount(Math.max(n, 0));
      if (panel.gridRows * panel.gridCols < size.rows * size.cols) {
        panel.gridRows = size.rows;
        panel.gridCols = size.cols;
      }
    }
  }

  function enterCustomPanelEditMode(panelId, panelElement) {
    const found = findPanelById(panelId);
    if (!found) return;

    const { panel } = found;
    enterCustomEditMode(panel, panelElement);
  }

  function enterCustomLayoutEditMode(layoutId, panelId, panelElement) {
    const found = findSubPanelById(layoutId, panelId);
    if (!found) return;

    const { panel } = found;
    enterCustomEditMode(panel, panelElement);
  }

  function enterCustomEditMode(panel, panelElement) {
    panel.isEditingCustom = true;

    const body = panelElement.querySelector('.panel-body');
    body.innerHTML = '';

    const textarea = document.createElement('textarea');
    textarea.className = 'custom-edit-area';
    textarea.value = panel.customContent || '';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.marginTop = '4px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.marginTop = '4px';
    cancelBtn.style.marginLeft = '6px';

    const buttonsRow = document.createElement('div');
    buttonsRow.style.marginTop = '4px';
    buttonsRow.appendChild(saveBtn);
    buttonsRow.appendChild(cancelBtn);

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.height = '100%';

    const textWrapper = document.createElement('div');
    textWrapper.style.flex = '1';
    textWrapper.appendChild(textarea);

    wrapper.appendChild(textWrapper);
    wrapper.appendChild(buttonsRow);
    body.appendChild(wrapper);

    saveBtn.addEventListener('click', () => {
      panel.customContent = textarea.value;
      panel.isEditingCustom = false;
      saveState();
      renderDesktop();
    });

    cancelBtn.addEventListener('click', () => {
      panel.isEditingCustom = false;
      renderDesktop();
    });

    textarea.focus();
  }
  
  function enterExternalLayoutEditMode(layoutId, panelId, panelElement) {
    const found = findSubPanelById(layoutId, panelId);
    if (!found)
        return;

    const { panel } = found;
    enterExternalEditMode(panel, panelElement);
  }

  function enterExternalPanelEditMode(panelId, panelElement) {
    const found = findPanelById(panelId);
    if (!found)
        return;

    const { panel } = found;
    enterExternalEditMode(panel, panelElement);
  }

  function enterExternalEditMode(panel, panelElement) {    
    const body = panelElement.querySelector('.panel-body');
    body.innerHTML = '';

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    container.style.gap = '6px';

    const label = document.createElement('label');
    label.style.fontSize = '13px';
    label.textContent = 'External URL:';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = panel.externalUrl || '';
    input.placeholder = 'https://example.com/';
    input.style.width = '100%';
    input.style.padding = '4px 6px';
    input.style.borderRadius = '4px';
    input.style.border = '1px solid #383a40';
    input.style.background = '#111217';
    input.style.color = 'var(--text-color)';

    const hint = document.createElement('div');
    hint.style.fontSize = '11px';
    hint.style.color = 'var(--muted)';
    hint.textContent = 'Enter a full URL (including http:// or https://).';

    const buttonsRow = document.createElement('div');
    buttonsRow.style.display = 'flex';
    buttonsRow.style.justifyContent = 'flex-end';
    buttonsRow.style.gap = '6px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.fontSize = '13px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.fontSize = '13px';

    // Button styling similar to settings buttons
    [cancelBtn, saveBtn].forEach(btn => {
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '4px';
      btn.style.border = 'none';
      btn.style.background = '#2f3240';
      btn.style.color = 'var(--text-color)';
      btn.style.cursor = 'pointer';
    });
    saveBtn.style.background = 'var(--accent-soft)';

    cancelBtn.addEventListener('click', () => {
        renderDesktop(); // discard changes
    });

    saveBtn.addEventListener('click', () => {
      let url = input.value.trim();
      if (url && !/^https?:\/\//i.test(url)) {
        // If user forgot protocol, assume https
        url = 'https://' + url;
      }
      panel.externalUrl = url;
      saveState();
      renderDesktop();
    });

    buttonsRow.appendChild(cancelBtn);
    buttonsRow.appendChild(saveBtn);

    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(hint);
    container.appendChild(buttonsRow);

    body.appendChild(container);

    // Focus input for convenience
    input.focus();
    input.select();
  }


  // Panel drag & resize ----------------------------------------------

  function startPanelDrag(e) {
    e.preventDefault(); // prevent text selection / drag ghost

    const panelEl = e.currentTarget.closest('.panel');
    if (!panelEl) return;

    const rect = panelEl.getBoundingClientRect();
    draggingPanel = {
      id: panelEl.dataset.panelId
    };
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
      const desktopRect = desktop.getBoundingClientRect();
      const found = findPanelById(id);
      if (found) {
        found.panel.x = rect.left - desktopRect.left;
        found.panel.y = rect.top - desktopRect.top;
      }
    }
    draggingPanel = null;
    window.removeEventListener('mousemove', onPanelDrag);
    window.removeEventListener('mouseup', endPanelDrag);
    saveState();
  }

  function startPanelResize(e) {
    e.preventDefault();   // avoid selecting content while resizing
    e.stopPropagation();

    const panelEl = e.currentTarget.closest('.panel');
    if (!panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    resizingPanel = {
      id: panelEl.dataset.panelId
    };
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
    saveState();
  }

  // Premade panels loader --------------------------------------------

  async function loadPremadeContent(premadeId) {
    const panelDef = (window.PREMADE_PANELS || []).find(p => p.id === premadeId);
    if (!panelDef) throw new Error('Unknown panel: ' + premadeId);
    const res = await fetch(panelDef.file);
    if (!res.ok) throw new Error('Failed to fetch panel file');
    return await res.text();
  }

  // Tabs --------------------------------------------------------------

  function addTab() {
    const id = uid('tab');
    const tab = {
      id,
      title: 'New Tab',
      panels: []
    };
    state.tabs.push(tab);
    state.activeTabId = id;
    saveState();
    render();
  }

  function closeTabById(tabId) {
    if (state.tabs.length === 1) {
      alert('You must have at least one tab.');
      return;
    }

    const tab = state.tabs.find(t => t.id === tabId);
    const title = tab ? tab.title : 'this tab';
    const ok = confirm(`Close "${title}" and all of its panels?`);
    if (!ok) return;

    const idx = state.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    state.tabs.splice(idx, 1);
    if (state.activeTabId === tabId) {
      const newActive = state.tabs[Math.max(0, idx - 1)] || state.tabs[0];
      state.activeTabId = newActive.id;
    }
    saveState();
    render();
  }
  
  function duplicateTab(tabId) {
     const original = state.tabs.find(t => t.id === tabId);
     if (!original) return;

     const newId = uid('tab');
     const newTitle = original.title + ' (copy)';

     // Deep copy panels and give each a new id, slightly offset positions
     const newPanels = (original.panels || []).map(p => {
       const clone = JSON.parse(JSON.stringify(p)); // simple deep copy
       clone.id = uid('panel');
       clone.x = (p.x ?? 80) + 20;
       clone.y = (p.y ?? 80) + 20;
       return clone;
     });

     const newTab = {
       id: newId,
       title: newTitle,
       panels: newPanels
     };

     state.tabs.push(newTab);
     state.activeTabId = newId;
     saveState();
     render();
  }

  function renameTab(tabId) {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    const newName = prompt('Tab name:', tab.title);
    if (newName && newName.trim()) {
      tab.title = newName.trim();
      saveState();
      renderTabs();
    }
  }

  function reorderTabs(fromId, toId) {
    if (fromId === toId) return;
    const tabs = state.tabs;
    const fromIndex = tabs.findIndex(t => t.id === fromId);
    const toIndex = tabs.findIndex(t => t.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, moved);
    saveState();
    renderTabs();
  }

  function hideMenus() {    
    desktopContextMenu.style.display = 'none';
    tabContextMenu.style.display = 'none';
    layoutChildContextMenu.style.display = 'none';
    panelContextMenu.style.display = 'none';
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
    hideMenus();
    positionMenuWithinViewport(desktopContextMenu, x, y);
  }

  function showTabMenu(x, y, tabId) {
    hideMenus();
    tabContextTargetTabId = tabId;
    positionMenuWithinViewport(tabContextMenu, x, y);
  }
  
  function showLayoutChildMenu(x, y, target) {
    hideMenus();
    layoutContextTarget = target;
    
    const removeItem = layoutChildContextMenu.querySelector('[data-action="layout-remove"]');
    if (removeItem) {
      let showRemove = false;
      const found = findPanelById(target.parentPanelId);
      if (found && Array.isArray(found.panel.subPanels) && target.childId) {
        const child = found.panel.subPanels.find(c => c.id === target.childId);
        if (child) {
          showRemove = true;
        }
      }
      removeItem.style.display = showRemove ? '' : 'none';
    }

    positionMenuWithinViewport(layoutChildContextMenu, x, y);
  }
  
  function showPanelMenu(x, y, target) {
    // target:
    // { kind: 'panel', panel }
    // { kind: 'layoutChild', panel, child }

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

    // Premade visible:
    //  - top-level premade
    //  - layout child that is premade or empty (empty → choose premade)
    const isPremadeTarget =
      (isTopLevel && type === 'premade') ||
      (!isTopLevel && (type === 'premade' || type === 'empty'));
    setVisible(premadeItems, isPremadeTarget);

    // Premade "Read more" only if there is a source
    let hasSource = false;
    if (type === 'premade') {
      const premadeId = isTopLevel ? panel.premadeId : child?.premadeId;
      if (premadeId) {
        const def = getPremadeDef(premadeId);
        hasSource = !!(def && def.source);
      }
    }
    setVisible(premadeSourceItems, isPremadeTarget && hasSource);

    // Custom visible:
    //  - top-level custom
    //  - layout child that is custom or empty
    const isCustomTarget =
      (isTopLevel && type === 'custom') ||
      (!isTopLevel && (type === 'custom' || type === 'empty'));
    setVisible(customItems, isCustomTarget);

    // External visible only for top-level external
    setVisible(externalItems, isTopLevel && type === 'external');

    // Layout controls only for top-level layout
    setVisible(layoutItems, isTopLevel && type === 'layout');

    // Layering controls only for top-level panels
    setVisible(layerItems, isTopLevel);
    
    // Layout child "Remove" only for layout children
    let showChildRemove = false;
    if (!isTopLevel && target.kind === 'layoutChild' && child) {
      const isEmpty = (child.type === 'empty' && !(child.content && child.content.trim()));
      showChildRemove = !isEmpty;
    }
    setVisible(layoutChildRemoveItems, showChildRemove);

    positionMenuWithinViewport(panelContextMenu, x, y);
  }


  // Settings ----------------------------------------------------------

  function openSettings() {
    settingsOverlay.classList.remove('hidden');
  }

  function closeSettings() {
    settingsOverlay.classList.add('hidden');
  }

  function applySettingsFromUI() {
    const posRadio = document.querySelector('input[name="tabbar-position"]:checked');
    if (posRadio) {
      state.settings.tabBarPosition = posRadio.value;
    }

    if (backgroundModeRadios) {
      backgroundModeRadios.forEach(r => {
        if (r.checked) {
          state.settings.backgroundMode = r.value;
        }
      });
    }

    if (backgroundOpacitySlider) {
      const percent = parseInt(backgroundOpacitySlider.value, 10);
      const clamped = isNaN(percent) ? 100 : Math.min(100, Math.max(0, percent));
      state.settings.backgroundOpacity = clamped / 100;
    }

    if (backgroundColorInput) {
      state.settings.backgroundColor = backgroundColorInput.value || '#1e1f22';
    }

    saveState();
    renderSettings();
  }

  function exportStateJSON() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web-desktop-layout.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importStateJSONFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.tabs || !parsed.tabs.length || !parsed.settings) {
          throw new Error('Invalid format');
        }
        state = parsed;
        saveState();
        render();
      } catch (e) {
        alert('Failed to import JSON: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  // Event wiring ------------------------------------------------------

  function buildPremadeTree(panels) {
    const root = { label: null, children: [] };

    panels.forEach(p => {
      // Special case: separators
      if (p.id === '-') {
        const name = (p.name || '').trim();

        // Root-level separator
        if (!name) {
          root.children.push({ separator: true });
          return;
        }

        // Scoped separator: name is a path like "Tools" or "Tools/Advanced"
        const segments = name.split('/').map(s => s.trim()).filter(Boolean);
        if (!segments.length) {
          root.children.push({ separator: true });
          return;
        }

        let current = root;
        segments.forEach(seg => {
          let child = current.children.find(
            c => c.label === seg && !c.panelId && !c.separator
          );
  
          if (!child) {
            child = { label: seg, children: [] };
            current.children.push(child);
          }
          current = child;
        });

        current.children.push({ separator: true });
        return;
      }

      // Normal premade panel entry
      const fullName = p.name || p.id;
      const segments = fullName.split('/').map(s => s.trim()).filter(Boolean);
      if (!segments.length) return;

      let current = root;

      // All but last segment => groups
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        let child = current.children.find(
          c => c.label === seg && !c.panelId && !c.separator
        );
        if (!child) {
          child = { label: seg, children: [] };
          current.children.push(child);
        }
        current = child;
      }

      // Last segment => leaf (actual premade panel)
      const leafLabel = segments[segments.length - 1];
      current.children.push({
        label: leafLabel,
        panelId: p.id
      });
    });

    return root;
  }

	
function renderPremadeTree(nodes, container) {
  nodes.forEach(node => {
    // Separator node
    if (node.separator) {
      const sep = document.createElement('li');
      sep.className = 'context-separator';
      container.appendChild(sep);
      return;
    }

    const li = document.createElement('li');
    li.className = 'context-item';

    const hasChildren = node.children && node.children.length > 0;
    const labelText = node.label + (hasChildren ? ' ▸' : '');
    li.textContent = labelText;

    // Leaf = actual premade panel
    if (node.panelId) {
      li.dataset.premadeId = node.panelId;
    }

    // Group with children => submenu
    if (hasChildren) {
      const submenu = document.createElement('ul');
      submenu.className = 'context-submenu';
      renderPremadeTree(node.children, submenu);
      li.appendChild(submenu);
    }

    container.appendChild(li);
  });
}

  
  function initPremadeSubmenu() {
    const panels = window.PREMADE_PANELS || [];
    const tree = buildPremadeTree(panels);
    
    // Desktop premade submenu
    premadePanelSubmenu.innerHTML = '';
    layoutPremadeSubmenu.innerHTML = '';
    panelSwapPremadeSubmenu.innerHTML = '';    
    
    renderPremadeTree(tree.children, premadePanelSubmenu);   
    renderPremadeTree(tree.children, layoutPremadeSubmenu);    
    renderPremadeTree(tree.children, panelSwapPremadeSubmenu);
  }

  function setupEvents() {
     // Desktop left-click hides menus
      document.addEventListener('click', () => {
        hideMenus();
      });

      // Desktop context menu  
      // Context menu on desktop OR panels
    // Context menu on desktop, panels, and layout sub-panels
    desktop.addEventListener('contextmenu', e => {
      const panelEl = e.target.closest('.panel');
      const layoutChildEl = e.target.closest('.layout-child-panel');

      // Layout sub-panel: show panel context for that child
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

      // Panel: show panel context menu *unless* custom edit mode
      if (panelEl) {
        const panelId = panelEl.dataset.panelId;
        const found = findPanelById(panelId);
        if (!found) return;

        // If this is a custom panel in edit mode, let the browser context menu handle copy/paste
        if (found.panel.type === 'custom' && found.panel.isEditingCustom) {
          hideMenus();
          return; // no preventDefault → system menu
        }

        e.preventDefault();
        showPanelMenu(e.clientX, e.clientY, {
          kind: 'panel',
          panel: found.panel
        });
        return;
      }

      // Desktop background
      e.preventDefault();
      desktopContextTargetPoint = { x: e.clientX, y: e.clientY };
      showDesktopMenu(e.clientX, e.clientY);
    });


    // Desktop context menu clicks (including premade submenu items)
    desktopContextMenu.addEventListener('click', e => {
      const item = e.target.closest('.context-item');
      if (!item) return;

      const action = item.dataset.action;
      const layout = item.dataset.layout;
      const premadeId = item.dataset.premadeId;

      // If we clicked the parent "Add Premade Panel" label itself, ignore
      if (action === 'add-premade' && !premadeId) {
        return;
      } else if (action === 'add-layout' && !layout) {
        return;
      }

      hideMenus();

      const pos = desktop.getBoundingClientRect();
      const x = desktopContextTargetPoint.x - pos.left;
      const y = desktopContextTargetPoint.y - pos.top;

      if (premadeId) {
        addPanel('premade', {
          premadeId,
          x,
          y,
          title: getPremadeName(premadeId)
        });
      } else if (layout) {
        // Any item with data-layout (Horizontal / Vertical / Grid) is a concrete layout choice
        const layoutMode = layout;
        const niceName = layoutMode[0].toUpperCase() + layoutMode.slice(1);
        addPanel('layout', {
          x,
          y,
          layoutMode,
          title: `${niceName} Layout`
        });
      } else if (action === 'add-custom') {
        addPanel('custom', { x, y, title: 'Custom Panel' });
      } else if (action === 'add-external') {
        addPanel('external', { x, y, title: 'External Panel' });
      } else if (action === 'open-settings') {
        openSettings();
      }
    });

    // NOTE: no separate premadePanelSubmenu click handler (to avoid double-add bug)

    // Tab bar events
    addTabBtn.addEventListener('click', () => {
      addTab();
    });

    tabList.addEventListener('click', e => {
      const tabEl = e.target.closest('.tab');
      if (!tabEl) return;
      const tabId = tabEl.dataset.tabId;

      if (e.target.classList.contains('tab-close')) {
        closeTabById(tabId);
      } else {
        state.activeTabId = tabId;
        saveState();
        render();
      }
    });

    // Tab context menu
    tabList.addEventListener('contextmenu', e => {
      const tabEl = e.target.closest('.tab');
      if (!tabEl) return;
      e.preventDefault();
      const tabId = tabEl.dataset.tabId;
      showTabMenu(e.clientX, e.clientY, tabId);
    });

    tabContextMenu.addEventListener('click', e => {
      const item = e.target.closest('.context-item');
      if (!item) return;
      const action = item.dataset.action;
      const tabId = tabContextTargetTabId;
      hideMenus();
      
      if (action === 'rename-tab') {
        renameTab(tabId);
      } else if (action === 'duplicate-tab') {
        duplicateTab(tabId);
      } else if (action === 'close-tab') {
        closeTabById(tabId);
      }
    });

    // Tab drag & drop for reordering
    tabList.addEventListener('dragstart', e => {
      const tabEl = e.target.closest('.tab');
      if (!tabEl) return;
      draggingTabId = tabEl.dataset.tabId;
      e.dataTransfer.effectAllowed = 'move';
    });

    tabList.addEventListener('dragover', e => {
      e.preventDefault();
      const overTab = e.target.closest('.tab');
      if (!overTab || !draggingTabId) return;
      e.dataTransfer.dropEffect = 'move';
    });

    tabList.addEventListener('drop', e => {
      e.preventDefault();
      const targetTab = e.target.closest('.tab');
      if (!targetTab || !draggingTabId) return;
      const targetId = targetTab.dataset.tabId;
      reorderTabs(draggingTabId, targetId);
      draggingTabId = null;
    });

    tabList.addEventListener('dragend', () => {
      draggingTabId = null;
    });
    
    // Layout child context menu click handling
    layoutChildContextMenu.addEventListener('click', e => {
      const item = e.target.closest('.context-item');
      if (!item) return;

      const action = item.dataset.action;
      const premadeId = item.dataset.premadeId;
      const target = layoutContextTarget;

      hideMenus();

      if (!target) return;
      const found = findPanelById(target.parentPanelId);
      if (!found || !Array.isArray(found.panel.subPanels)) return;

      const panel = found.panel;
      const children = panel.subPanels;

      // Resolve: existing child or slot index
      let child = null;
      let index = -1;

      if (target.childId) {
        child = children.find(c => c.id === target.childId);
        if (index >= 0) child = children[index];
      }

      // Helper to ensure we have a child object at a given slot
      function ensureChildAtSlot(slotIndex) {
        // If child exists, return it
        if (child) return child;

        index = slotIndex;
        if (index < 0) index = children.length;
        if (index > children.length) index = children.length;

        const newChild = {
            id: uid('layout-child'),
            title: `Area ${index + 1}`,
            type: 'custom',
            content: '',
            customContent: '',
            externalUrl: ''
        }

        if (index === children.length) {
          children.push(newChild);
        } else {
          children.splice(index, 0, newChild);
        }

        child = newChild;
        return child;
      }

      // Picking a specific premade from the subtree
      if (premadeId) {
        // Use existing child if present, else create new at end
        const slotIndex = typeof target.slotIndex === 'number' ? target.slotIndex : children.length;
        const c = ensureChildAtSlot(slotIndex);
        c.type = 'premade';
        c.premadeId = premadeId;
        c.title = getPremadeName(premadeId);
        c.content = ''; // will fill async

        // Show "Loading…" immediately
        saveState();
        renderDesktop();

        loadPremadeContent(premadeId).then(html => {
          c.content = html;
          saveState();          
          renderDesktop();
        }).catch(() => {
          child.content = '<em>Failed to load panel.</em>';
          saveState();
          renderDesktop();
        });

        return;
      } 

      if (action === 'layout-add-custom') {
        const slotIndex = typeof target.slotIndex === 'number' ? target.slotIndex : children.length;
        const c = ensureChildAtSlot(slotIndex);

        c.type = 'custom';
        c.customContent = '<em>Click the ✎ in the top right corner to edit this panel.</em>';
        c.title = 'Custom Panel';
        saveState();
        renderDesktop();
        return;
      }

      if (action === 'layout-add-external') {
        const slotIndex = typeof target.slotIndex === 'number' ? target.slotIndex : children.length;
        const c = ensureChildAtSlot(slotIndex);

        c.type = 'external';
        c.externalUrl = '';
        c.title = 'External Panel';
        saveState();
        renderDesktop();
        return;
      }
      
      if (action === 'layout-remove') {
        if (child && index >= 0) {
            children.splice(index, 1);
            saveState();
            renderDesktop();
        }
    }
    });

    // Panel context menu actions
    panelContextMenu.addEventListener('click', e => {
        const item = e.target.closest('.context-item');
        if (!item) return;

        const action = item.dataset.action;
        const premadeId = item.dataset.premadeId;
        hideMenus();

        if (!panelContextTarget) return;
        const { kind, panel } = panelContextTarget;

        // Resolve parent panel & child (for layout children)
        const parentFound = findPanelById(panel.id);
        if (!parentFound) return;
        const parentPanel = parentFound.panel;
        const parentTab = parentFound.tab;

        let child = null;
        if (kind === 'layoutChild') {
        child = panelContextTarget.child;
    }

  // Helper: for premade operations, determine target object
  const getPremadeTarget = () => (kind === 'panel' ? parentPanel : child);
  const getCustomTarget = () => (kind === 'panel' ? parentPanel : child);

  // Handle leaf premade from submenu (swap/choose)
  if (premadeId) {
    const target = getPremadeTarget();
    if (!target) return;

    target.type = 'premade';
    target.premadeId = premadeId;
    target.title = getPremadeName(premadeId);
    // top-level premade uses cachedContent; children use content directly
    if (kind === 'panel') {
      target.cachedContent = null;
      saveState();
      
         renderDesktop();
      loadPremadeContent(premadeId)
        .then(html => {
          target.cachedContent = html;
          saveState();
          
             renderDesktop();
        })
        .catch(() => {
          target.cachedContent = '<em>Failed to load panel.</em>';
          saveState();
          
            renderDesktop();
        });
    } else {
      target.content = '';
      saveState();
      
         renderDesktop();
      loadPremadeContent(premadeId)
        .then(html => {
          target.content = html;
          saveState();
          
            renderDesktop();
        })
        .catch(() => {
          target.content = '<em>Failed to load panel.</em>';
          saveState();
          
          renderDesktop();
        });
    }
    return;
  }

  switch (action) {
    // Premade: Read more
    case 'panel-read-more': {
      const target = getPremadeTarget();
      if (!target || target.type !== 'premade' || !target.premadeId) return;
      const def = getPremadeDef(target.premadeId);
      if (def && def.source) {
        window.open(def.source, '_blank', 'noopener');
      }
      break;
    }

    // Custom: download / load (.md)
    case 'panel-download-custom': {
      const target = getCustomTarget();
      if (!target || target.type !== 'custom') return;
      const text = target.customContent || target.content || '';
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (target.title || 'custom-panel') + '.md';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      break;
    }

    case 'panel-load-custom': {
      const target = getCustomTarget();
      if (!target || (kind === 'panel' && target.type !== 'custom') && kind === 'panel') return;

      if (!panelCustomUploadInput) return;
      panelCustomUploadInput.onchange = ev => {
        const file = ev.target.files[0];
        panelCustomUploadInput.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result || '';
          if (kind === 'panel') {
            target.customContent = text;
          } else {
            target.type = 'custom';
            target.content = text;
            target.title = target.title || 'Custom';
          }
          saveState();
          
        renderDesktop();
        };
        reader.readAsText(file);
      };
      panelCustomUploadInput.click();
      break;
    }

    // External: open URL in new tab (top-level only)
    case 'panel-open-external': {
      if (kind !== 'panel') return;
      if (parentPanel.type !== 'external' || !parentPanel.externalUrl) return;
      window.open(parentPanel.externalUrl, '_blank', 'noopener');
      break;
    }

    // Layout: change mode (top-level only)
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
      } else {
        // For H/V we don't change subPanels; rendering rules handle
        // the "+ +", "+", or "Add" header behavior
      }

      saveState();
      renderDesktop();
      break;
    }
    
    case 'panel-layout-child-remove': {
      if (kind !== 'layoutChild') return;
      if (!Array.isArray(parentPanel.subPanels)) return;
      const childId = panelContextTarget.child && panelContextTarget.child.id;
      const idx = parentPanel.subPanels.findIndex(c => c.id === childId);
      if (idx >= 0) {
        parentPanel.subPanels.splice(idx, 1);
        saveState();
        renderDesktop();
      }
      break;
    }

    // Layering (top-level only)
    case 'panel-send-front': {
      if (kind !== 'panel') return;
      parentPanel.zIndex = ++zCounter;
      saveState();
      renderDesktop();
      break;
    }

    case 'panel-send-back': {
      if (kind !== 'panel') return;
      // Find current minimum z in this tab
      let minZ = parentPanel.zIndex;
      for (const p of parentTab.panels) {
        if (typeof p.zIndex === 'number') {
          minZ = Math.min(minZ, p.zIndex);
        }
      }
      parentPanel.zIndex = minZ - 1;
      saveState();
      renderDesktop();
      break;
    }
  }
});


    // Settings events
    if (settingsClose) {
      settingsClose.addEventListener('click', () => {
        closeSettings();
      });
    }

    if (settingsOverlay) {
      settingsOverlay.addEventListener('click', e => {
        if (e.target === settingsOverlay) {
          closeSettings();
        }
      });
    }

    const tabPosRadios = document.querySelectorAll('input[name="tabbar-position"]');
    tabPosRadios.forEach(r => {
      r.addEventListener('change', () => {
        applySettingsFromUI();
      });
    });

    if (backgroundModeRadios) {
      backgroundModeRadios.forEach(r => {
        r.addEventListener('change', () => {
          applySettingsFromUI();
        });
      });
    }

    if (backgroundOpacitySlider && backgroundOpacityValue) {
      backgroundOpacitySlider.addEventListener('input', () => {
        const percent = parseInt(backgroundOpacitySlider.value, 10);
        const clamped = isNaN(percent) ? 100 : Math.min(100, Math.max(0, percent));
        backgroundOpacityValue.textContent = clamped + '%';
      });
      backgroundOpacitySlider.addEventListener('change', () => {
        applySettingsFromUI();
      });
    }

    if (backgroundColorInput) {
      // When the color input is focused (including when using the eyedropper),
      // remove the dim to get accurate sampling.
      backgroundColorInput.addEventListener('focus', () => {
         if (settingsOverlay) {
            settingsOverlay.classList.add('no-dim');
         }
      });
	
      // When done (color picked or focus leaves), restore dimming.
      backgroundColorInput.addEventListener('blur', () => {
         if (settingsOverlay) {
            settingsOverlay.classList.remove('no-dim');
         }
      });
      
      backgroundColorInput.addEventListener('input', () => {
         applySettingsFromUI();
      });
    }
    
    

    // LIVE background URL updates
    if (backgroundUrlInput) {
      backgroundUrlInput.addEventListener('input', () => {
        state.settings.backgroundUrl = backgroundUrlInput.value.trim();
        saveState();
        renderSettings();
      });
    }

    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        exportStateJSON();
      });
    }

    if (importJsonFile) {
      importJsonFile.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        importStateJSONFromFile(file);
        e.target.value = '';
      });
    }

    // Keyboard escape closes context menus & settings
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        hideMenus();
        closeSettings();
      }
    });
  }

  function getPremadeDef(id) {
    return (window.PREMADE_PANELS || []).find(p => p.id === id) || null;
  }

  function getPremadeName(id) {
    const p = getPremadeDef(id);
    return p ? p.name : 'Premade Panel';
  }

  // Init --------------------------------------------------------------
 
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

  function init() {
    state = loadState();
    normalizeZIndexes();
    initPremadeSubmenu();
    setupEvents();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();