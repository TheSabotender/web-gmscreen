// assets/settings.js

export function renderSettings(context) {
  const state = context.getState();
  const {
    appRoot,
    desktop,
    backgroundUrlInput,
    backgroundModeRadios,
    backgroundOpacitySlider,
    backgroundOpacityValue,
    backgroundColorInput
  } = context.elements;

  if (appRoot) {
    appRoot.classList.remove('tabbar-bottom', 'tabbar-top', 'tabbar-left', 'tabbar-right');
    appRoot.classList.add(`tabbar-${state.settings.tabBarPosition}`);
  }

  if (desktop) {
    const bgColor = state.settings.backgroundColor || '#1e1f22';
    desktop.style.setProperty('--desktop-base-bg', bgColor);

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
    }

    desktop.style.setProperty('--desktop-bg-size', size);
    desktop.style.setProperty('--desktop-bg-repeat', repeat);

    const opacity = state.settings.backgroundOpacity ?? 1;
    desktop.style.setProperty('--desktop-bg-opacity', String(opacity));

    if (backgroundOpacitySlider && backgroundOpacityValue) {
      const percent = Math.round(opacity * 100);
      backgroundOpacitySlider.value = String(percent);
      backgroundOpacityValue.textContent = percent + '%';
    }
  }

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

  if (backgroundColorInput) {
    backgroundColorInput.value = state.settings.backgroundColor || '#1e1f22';
  }
}

export function openSettings(context) {
  const { settingsOverlay } = context.elements;
  if (settingsOverlay) {
    settingsOverlay.classList.remove('hidden');
  }
}

export function closeSettings(context) {
  const { settingsOverlay } = context.elements;
  if (settingsOverlay) {
    settingsOverlay.classList.add('hidden');
  }
}

function applySettingsFromUI(context) {
  const state = context.getState();
  const {
    backgroundModeRadios,
    backgroundOpacitySlider,
    backgroundColorInput
  } = context.elements;

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
    const clamped = Number.isNaN(percent) ? 100 : Math.min(100, Math.max(0, percent));
    state.settings.backgroundOpacity = clamped / 100;
  }

  if (backgroundColorInput) {
    state.settings.backgroundColor = backgroundColorInput.value || '#1e1f22';
  }

  context.saveState();
  context.renderSettings();
}

function exportStateJSON(context) {
  const dataStr = JSON.stringify(context.getState(), null, 2);
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

function importStateJSONFromFile(context, file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.tabs || !parsed.tabs.length || !parsed.settings) {
        throw new Error('Invalid format');
      }
      context.setState(parsed);
      context.saveState();
      context.renderAll();
    } catch (e) {
      alert('Failed to import JSON: ' + e.message);
    }
  };
  reader.readAsText(file);
}

export function setupSettings(context) {
  const {
    settingsClose,
    settingsOverlay,
    backgroundModeRadios,
    backgroundOpacitySlider,
    backgroundOpacityValue,
    backgroundColorInput,
    backgroundUrlInput,
    exportJsonBtn,
    importJsonFile
  } = context.elements;

  if (settingsClose) {
    settingsClose.addEventListener('click', () => {
      closeSettings(context);
    });
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', e => {
      if (e.target === settingsOverlay) {
        closeSettings(context);
      }
    });
  }

  const tabPosRadios = document.querySelectorAll('input[name="tabbar-position"]');
  tabPosRadios.forEach(r => {
    r.addEventListener('change', () => {
      applySettingsFromUI(context);
    });
  });

  if (backgroundModeRadios) {
    backgroundModeRadios.forEach(r => {
      r.addEventListener('change', () => {
        applySettingsFromUI(context);
      });
    });
  }

  if (backgroundOpacitySlider && backgroundOpacityValue) {
    backgroundOpacitySlider.addEventListener('input', () => {
      const percent = parseInt(backgroundOpacitySlider.value, 10);
      const clamped = Number.isNaN(percent) ? 100 : Math.min(100, Math.max(0, percent));
      backgroundOpacityValue.textContent = clamped + '%';
    });
    backgroundOpacitySlider.addEventListener('change', () => {
      applySettingsFromUI(context);
    });
  }

  if (backgroundColorInput) {
    backgroundColorInput.addEventListener('focus', () => {
      if (context.elements.settingsOverlay) {
        context.elements.settingsOverlay.classList.add('no-dim');
      }
    });
    backgroundColorInput.addEventListener('blur', () => {
      if (context.elements.settingsOverlay) {
        context.elements.settingsOverlay.classList.remove('no-dim');
      }
    });
    backgroundColorInput.addEventListener('input', () => {
      applySettingsFromUI(context);
    });
  }

  if (backgroundUrlInput) {
    backgroundUrlInput.addEventListener('input', () => {
      const state = context.getState();
      state.settings.backgroundUrl = backgroundUrlInput.value.trim();
      context.saveState();
      context.renderSettings();
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      exportStateJSON(context);
    });
  }

  if (importJsonFile) {
    importJsonFile.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      importStateJSONFromFile(context, file);
      e.target.value = '';
    });
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSettings(context);
    }
  });
}
