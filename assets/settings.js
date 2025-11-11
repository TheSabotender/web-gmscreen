// assets/settings.js

const WEBM_PATTERN = /\.webm(?:$|\?)/i;

export function renderSettings(context) {
  const state = context.getState();
  const {
    appRoot,
    wallpaper,
    desktop,    
    backgroundUrlInput,
    backgroundModeRadios,
    backgroundOpacitySlider,
    backgroundOpacityValue,
    backgroundColorInput,
    backgroundVideoOptions,
    backgroundVideoMutedCheckbox
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

  const url = state.settings.backgroundUrl || '';
  const isVideo = WEBM_PATTERN.test(url);

  if (backgroundVideoOptions) {
    if (isVideo) {
      backgroundVideoOptions.classList.add('visible');
    } else {
      backgroundVideoOptions.classList.remove('visible');
    }
  }

  if (backgroundVideoMutedCheckbox) {
    backgroundVideoMutedCheckbox.checked = state.settings.backgroundVideoMuted !== false;
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
  context.renderDesktop();
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
    backgroundVideoMutedCheckbox,
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
      context.renderWallpaper();
      context.renderDesktop();
    });
  }

  if (backgroundVideoMutedCheckbox) {
    backgroundVideoMutedCheckbox.addEventListener('change', () => {
      const state = context.getState();
      state.settings.backgroundVideoMuted = backgroundVideoMutedCheckbox.checked;
      context.saveState();
      context.renderSettings();
      context.renderDesktop();
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
