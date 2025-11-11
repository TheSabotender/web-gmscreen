// assets/panel_dice.js

const DIE_TYPES = [
  { key: 'd4', label: 'd4', sides: 4 },
  { key: 'd6', label: 'd6', sides: 6 },
  { key: 'd8', label: 'd8', sides: 8 },
  { key: 'd10', label: 'd10', sides: 10 },
  { key: 'd12', label: 'd12', sides: 12 },
  { key: 'd20', label: 'd20', sides: 20 },
  { key: 'd100', label: 'd100', sides: 100 }
];

let diceClientCtor = null;
let diceClientInstance = null;
let diceClientInitPromise = null;

function ensureCountsObject(panel) {
  if (!panel.diceCounts || typeof panel.diceCounts !== 'object') {
    panel.diceCounts = {};
  }
  DIE_TYPES.forEach(die => {
    const value = Number(panel.diceCounts[die.key]);
    if (!Number.isFinite(value) || value < 0) {
      panel.diceCounts[die.key] = 0;
    } else {
      panel.diceCounts[die.key] = Math.floor(value);
    }
  });
  return panel.diceCounts;
}

function ensureOverlay() {
  let overlay = document.getElementById('dice-box-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dice-box-overlay';
    overlay.className = 'dice-box-overlay';

    const container = document.createElement('div');
    container.id = 'dice-box-canvas';
    container.className = 'dice-box-canvas';

    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }
  return overlay.querySelector('#dice-box-canvas');
}

async function loadDiceClientCtor() {
  if (diceClientCtor) return diceClientCtor;
  try {
    const mod = await import('../dice-so-nice/app/index.js');
    diceClientCtor = mod?.DiceSoNiceClient || mod?.default || mod;
  } catch (err) {
    console.error('Failed to load Dice So Nice client.', err);
    throw err;
  }
  return diceClientCtor;
}

async function getDiceClient() {
  ensureOverlay();
  const DiceClient = await loadDiceClientCtor();
  if (!diceClientInstance) {
    diceClientInstance = new DiceClient({
      selector: '#dice-box-canvas',
      assetPath: '/dice/assets/',
      theme: 'default',
      themeColor: '#ffae2e',
      scale: 8,
      delay: 200,
    });
    diceClientInitPromise = diceClientInstance.init();
  }
  if (diceClientInitPromise) {
    try {
      await diceClientInitPromise;
    } catch (err) {
      console.error('Failed to initialise Dice So Nice.', err);
      throw err;
    }
  }
  return diceClientInstance;
}

function clearDiceClient(instance) {
  if (!instance) return;
  if (typeof instance.clear === 'function') {
    instance.clear();
  } else if (typeof instance.removeDice === 'function') {
    instance.removeDice();
  }
}

function buildNotation(counts) {
  const parts = [];
  DIE_TYPES.forEach(die => {
    const value = Number(counts[die.key]);
    if (Number.isFinite(value) && value > 0) {
      parts.push(`${value}d${die.sides}`);
    }
  });
  return parts.join(' + ');
}

export function createDicePanelState(id) {
  return {
    id,
    type: 'dice',
    title: 'Dice Roller',
    x: 32,
    y: 32,
    width: 360,
    height: 240,
    zIndex: 1,
    minimized: false,
    closable: false,
    diceCounts: DIE_TYPES.reduce((acc, die) => {
      acc[die.key] = 0;
      return acc;
    }, {})
  };
}

export function ensureDicePanels(state, options = {}) {
  const createId = options.createId || (() => `panel-${Math.random().toString(36).slice(2, 9)}`);
  if (!state || !Array.isArray(state.tabs)) return;
  state.tabs.forEach(tab => {
    if (!Array.isArray(tab.panels)) {
      tab.panels = [];
    }
    let dicePanel = tab.panels.find(panel => panel.type === 'dice');
    if (!dicePanel) {
      const id = createId();
      dicePanel = createDicePanelState(id);
      tab.panels.unshift(dicePanel);
    } else {
      dicePanel.type = 'dice';
      dicePanel.title = dicePanel.title || 'Dice Roller';
      dicePanel.closable = false;
      if (typeof dicePanel.minimized !== 'boolean') {
        dicePanel.minimized = false;
      }
      if (typeof dicePanel.width !== 'number') {
        dicePanel.width = 360;
      }
      if (typeof dicePanel.height !== 'number') {
        dicePanel.height = 240;
      }
      if (typeof dicePanel.x !== 'number') {
        dicePanel.x = 32;
      }
      if (typeof dicePanel.y !== 'number') {
        dicePanel.y = 32;
      }
      if (typeof dicePanel.zIndex !== 'number') {
        dicePanel.zIndex = 1;
      }
      ensureCountsObject(dicePanel);
    }
  });
}

function renderSpinnerRow(context, panel, counts, bodyEl) {
  const controls = document.createElement('div');
  controls.className = 'dice-panel-controls';

  DIE_TYPES.forEach(die => {
    const field = document.createElement('label');
    field.className = 'dice-spinner';

    const span = document.createElement('span');
    span.className = 'dice-spinner-label';
    span.textContent = die.label.toUpperCase();

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.value = counts[die.key] ?? 0;
    input.className = 'dice-spinner-input';

    input.addEventListener('input', () => {
      let value = parseInt(input.value, 10);
      if (!Number.isFinite(value) || value < 0) value = 0;
      input.value = value;
      panel.diceCounts[die.key] = value;
      context.saveState();
    });

    field.appendChild(span);
    field.appendChild(input);
    controls.appendChild(field);
  });

  bodyEl.appendChild(controls);
  return controls;
}

function renderButtonsRow(context, panel, bodyEl) {
  const buttonsRow = document.createElement('div');
  buttonsRow.className = 'dice-panel-actions';

  const rollBtn = document.createElement('button');
  rollBtn.className = 'dice-action-btn';
  rollBtn.textContent = 'Roll';

  const clearBtn = document.createElement('button');
  clearBtn.className = 'dice-action-btn';
  clearBtn.textContent = 'Clear';
  clearBtn.classList.add('dice-action-btn-secondary');

  buttonsRow.appendChild(rollBtn);
  buttonsRow.appendChild(clearBtn);
  bodyEl.appendChild(buttonsRow);

  const setButtonsEnabled = enabled => {
    rollBtn.disabled = !enabled;
    clearBtn.disabled = !enabled;
  };

  const performRoll = async () => {
    const counts = panel.diceCounts || {};
    const notation = buildNotation(counts);
    if (!notation) {
      return;
    }
    setButtonsEnabled(false);
    try {
      const diceClient = await getDiceClient();
      clearDiceClient(diceClient);
      if (diceClient && typeof diceClient.roll === 'function') {
        await diceClient.roll(notation);
      }
    } catch (err) {
      console.error('Failed to roll dice:', err);
    } finally {
      setButtonsEnabled(true);
    }
  };

  rollBtn.addEventListener('click', performRoll);

  clearBtn.addEventListener('click', async () => {
    setButtonsEnabled(false);
    try {
      const diceClient = await getDiceClient();
      clearDiceClient(diceClient);
    } catch (err) {
      console.error('Failed to clear dice:', err);
    } finally {
      setButtonsEnabled(true);
    }
  });

  return { rollBtn, clearBtn };
}

export function renderDicePanel(context, panel, bodyEl) {
  if (!bodyEl) return;
  ensureOverlay();
  ensureCountsObject(panel);
  bodyEl.classList.add('dice-panel');

  if (!panel.minimized) {
      renderSpinnerRow(context, panel, panel.diceCounts, bodyEl);
      renderButtonsRow(context, panel, bodyEl);
  }
}

export function isDicePanel(panel) {
  return panel && panel.type === 'dice';
}

export { DIE_TYPES };
