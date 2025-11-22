// assets/panel_external.js

export function enterExternalEditMode(context, panel, panelElement) {
  if (!panelElement) return;
  const body = panelElement.querySelector('.panel-body');
  if (!body) return;
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
    context.renderDesktop();
  });

  saveBtn.addEventListener('click', () => {
    let url = input.value.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    panel.externalUrl = url;
    context.saveState();
    context.renderDesktop();
  });

  buttonsRow.appendChild(cancelBtn);
  buttonsRow.appendChild(saveBtn);

  container.appendChild(label);
  container.appendChild(input);
  container.appendChild(hint);
  container.appendChild(buttonsRow);

  body.appendChild(container);

  input.focus();
  input.select();
}

export function renderExternalPanel(panel, bodyEl) {
  if (!bodyEl) return;

  if (panel.externalUrl && panel.externalUrl.trim()) {
    const iframe = document.createElement('iframe');
    iframe.className = 'external-frame';
    iframe.src = panel.externalUrl;
    bodyEl.appendChild(iframe);
  } else {
    bodyEl.innerHTML = '<em>No URL set. Click ✎ to set an external URL.</em>';
  }
}
