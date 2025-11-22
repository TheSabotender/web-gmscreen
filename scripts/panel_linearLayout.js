// assets/panel_linearLayout.js

export function renderLinearLayout(panel, layoutEl, options) {
  const { mode, showLayoutChildMenu, enterCustomChildEdit, enterExternalChildEdit } = options;
  const children = panel.subPanels || [];
  const childCount = children.length;
  const slots = [];

  if (childCount > 0) {
    children.forEach(child => {
      slots.push({ type: 'child', child });
    });
  }

  if (childCount === 0) {
    slots.push({ type: 'placeholder' });
    slots.push({ type: 'placeholder' });
  } else if (childCount === 1) {
    slots.push({ type: 'placeholder' });
  }

  slots.forEach((slot, index) => {
    const childEl = document.createElement('div');
    childEl.className = 'layout-child-panel';
    childEl.dataset.parentPanelId = panel.id;

    const child = slot.child;
    const hasContent = child && child.content && child.content.trim();

    if (child && (hasContent || child.type === 'custom' || child.type === 'external')) {
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
            enterExternalChildEdit(child.id, panel.id, childEl);
          } else {
            enterCustomChildEdit(child.id, panel.id, childEl);
          }
        });
        header.appendChild(editBtn);
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'layout-child-body';

      if (child.type === 'custom') {
        bodyEl.innerHTML = child.customContent || '';
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
        bodyEl.innerHTML = child.content || '';
      }

      childEl.appendChild(header);
      childEl.appendChild(bodyEl);
    } else {
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

    layoutEl.appendChild(childEl);
  });

  if (mode === 'horizontal') {
    layoutEl.classList.add('layout-horizontal');
  } else {
    layoutEl.classList.add('layout-vertical');
  }
}
