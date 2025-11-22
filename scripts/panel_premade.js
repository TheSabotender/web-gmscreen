// assets/panel_premade.js

export function getPremadeDef(id) {
  return (window.PREMADE_PANELS || []).find(p => p.id === id) || null;
}

export function getPremadeName(id) {
  const def = getPremadeDef(id);
  return def ? def.name : 'Premade Panel';
}

export async function loadPremadeContent(premadeId) {
  const panelDef = (window.PREMADE_PANELS || []).find(p => p.id === premadeId);
  if (!panelDef) throw new Error('Unknown panel: ' + premadeId);
  const res = await fetch(panelDef.file);
  if (!res.ok) throw new Error('Failed to fetch panel file');
  return await res.text();
}

export function renderPremadePanel(context, panel, bodyEl) {
  if (!bodyEl) return;

  bodyEl.innerHTML = panel.cachedContent || '<em>Loading…</em>';

  if (panel.cachedContent || !panel.premadeId) {
    return;
  }

  loadPremadeContent(panel.premadeId)
    .then(html => {
      panel.cachedContent = html;
      bodyEl.innerHTML = html;
      context.saveState();
    })
    .catch(() => {
      bodyEl.innerHTML = '<em>Failed to load panel.</em>';
    });
}

function buildPremadeTree(panels) {
  const root = { label: null, children: [] };

  panels.forEach(p => {
    if (p.id === '-') {
      const name = (p.name || '').trim();
      if (!name) {
        root.children.push({ separator: true });
        return;
      }

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

    const fullName = p.name || p.id;
    const segments = fullName.split('/').map(s => s.trim()).filter(Boolean);
    if (!segments.length) return;

    let current = root;
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

    if (node.panelId) {
      li.dataset.premadeId = node.panelId;
    }

    if (hasChildren) {
      li.classList.add('has-children');
      const sub = document.createElement('ul');
      sub.className = 'context-submenu';
      renderPremadeTree(node.children, sub);
      li.appendChild(sub);
    }

    container.appendChild(li);
  });
}

export function initPremadeSubmenu(context) {
  const { elements } = context;
  const panels = window.PREMADE_PANELS || [];
  const tree = buildPremadeTree(panels);

  const populate = (rootEl) => {
    if (!rootEl) return;
    rootEl.innerHTML = '';
    renderPremadeTree(tree.children, rootEl);
  };

  populate(elements.premadePanelSubmenu);
  populate(elements.panelSwapPremadeSubmenu);
  populate(elements.layoutPremadeSubmenu);
}
