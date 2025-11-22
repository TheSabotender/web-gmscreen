// assets/panel_custom.js

export function enterCustomEditMode(context, panel, panelElement) {
  if (!panelElement) return;
  panel.isEditingCustom = true;

  const body = panelElement.querySelector('.panel-body');
  if (!body) return;
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
    context.saveState();
    context.renderDesktop();
  });

  cancelBtn.addEventListener('click', () => {
    panel.isEditingCustom = false;
    context.renderDesktop();
  });

  textarea.focus();
}

export function renderCustomPanel(panel, bodyEl) {
  if (!bodyEl) return;
  bodyEl.innerHTML = panel.customContent || '<em>Empty custom panel. Click ✎ to edit.</em>';
}

export function downloadCustomPanel(target) {
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
}

export function promptLoadCustomPanel(context, target, kind) {
  const input = context.elements.panelCustomUploadInput;
  if (!input) return;

  input.onchange = ev => {
    const file = ev.target.files[0];
    input.value = '';
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
      context.saveState();
      context.renderDesktop();
    };
    reader.readAsText(file);
  };

  input.click();
}
