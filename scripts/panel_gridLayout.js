// assets/panel_gridLayout.js

export function computeGridSizeForCount(n) {
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

export function ensureGridDimensions(panel) {
  const n = (panel.subPanels || []).length;
  if (!panel.gridRows || !panel.gridCols) {
    const size = computeGridSizeForCount(Math.max(n, 0));
    panel.gridRows = size.rows;
    panel.gridCols = size.cols;
  } else {
    const size = computeGridSizeForCount(Math.max(n, 0));
    if (panel.gridRows * panel.gridCols < size.rows * size.cols) {
      panel.gridRows = size.rows;
      panel.gridCols = size.cols;
    }
  }
}

export function renderGridLayout(panel, layoutEl, helpers) {
  ensureGridDimensions(panel);
  const rows = panel.gridRows;
  const cols = panel.gridCols;
  const children = panel.subPanels || [];
  const totalSlots = rows * cols;

  layoutEl.classList.add('layout-grid');
  layoutEl.style.display = 'grid';
  layoutEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

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
        bodyEl.innerHTML = child.content || '';

        cellEl.appendChild(header);
        cellEl.appendChild(bodyEl);
      } else {
        cellEl.innerHTML = '<div class="layout-child-placeholder">+</div>';
        cellEl.addEventListener('click', e => {
          e.stopPropagation();
          helpers.showLayoutChildMenu(e.clientX, e.clientY, {
            parentPanelId: panel.id,
            childId: child.id
          });
        });
      }
    } else {
      cellEl.innerHTML = '<div class="layout-child-placeholder">+</div>';
      const openMenuNew = e => {
        e.preventDefault();
        e.stopPropagation();
        helpers.showLayoutChildMenu(e.clientX, e.clientY, {
          parentPanelId: panel.id,
          slotIndex: i
        });
      };
      cellEl.addEventListener('click', openMenuNew);
      cellEl.addEventListener('contextmenu', openMenuNew);
    }

    layoutEl.appendChild(cellEl);
  }
}
