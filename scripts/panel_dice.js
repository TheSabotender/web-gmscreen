// assets/panel_dice.js

const pageLoadPromise = new Promise(resolve => {
  if (document.readyState === 'complete') {
    resolve();
  } else {
    window.addEventListener('load', () => resolve(), { once: true });
  }
});

const DIE_TYPES = [
  { key: 'd4', label: 'd4', sides: 4 },
  { key: 'd6', label: 'd6', sides: 6 },
  { key: 'd8', label: 'd8', sides: 8 },
  { key: 'd10', label: 'd10', sides: 10 },
  { key: 'd12', label: 'd12', sides: 12 },
  { key: 'd20', label: 'd20', sides: 20 },
  { key: 'd100', label: 'd100', sides: 100 }
];

let diceClientModulePromise = null;
let DiceSoNiceClientClass = null;
let diceClientInstance = null;
let diceClientInitPromise = null;

let dice2ClientModulePromise = null;
let DiceBoxClientClass = null;
let dice2ClientInstance = null;
let dice2ClientInitPromise = null;

function loadDiceClientModule() {
  if (!diceClientModulePromise) {
    diceClientModulePromise = pageLoadPromise
      .then(() => import('../dice-so-nice/DiceSoNiceClient.js'))
      .then(module => {
        DiceSoNiceClientClass = module.default || module;
        return DiceSoNiceClientClass;
      })
      .catch(err => {
        diceClientModulePromise = null;
        throw err;
      });
  }
  return diceClientModulePromise;
}

function loadDice2ClientModule() {
    if (!dice2ClientModulePromise) {
        dice2ClientModulePromise = pageLoadPromise
            .then(() => import('../dice-box/index.js'))
            .then(module => {
                DiceBoxClientClass = module.default || module;
                return DiceBoxClientClass;
            })
            .catch(err => {
                dice2ClientModulePromise = null;
                throw err;
            });
    }
    return dice2ClientModulePromise;
}

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
  let overlay = document.getElementById('dice-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dice-overlay';
    overlay.className = 'dice-overlay';

    const container = document.createElement('div');
    container.id = 'dice-canvas';
    container.className = 'dice-canvas';

    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }
  return overlay.querySelector('#dice-canvas');
}

async function getDiceClient() {
  const DiceClientCtor = await loadDiceClientModule();
  const canvas = ensureOverlay();
  if (!diceClientInstance) {
    diceClientInstance = new DiceClientCtor(canvas);
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

async function getDice2Client() {
    const Dice2ClientCtor = await loadDice2ClientModule();
    const canvas = ensureOverlay();
    if (!dice2ClientInstance) {
        dice2ClientInstance = new Dice2ClientCtor("#dice-box", {
            assetPath: "/dice-box/assets", // required
        });
        dice2ClientInitPromise = dice2ClientInstance.init();
    }

    if (dice2ClientInitPromise) {
        try {
            await dice2ClientInitPromise;
        } catch (err) {
            console.error('Failed to initialise Dice Box.', err);
            throw err;
        }
    }

    return dice2ClientInstance;
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
    width: 500,
    height: 200,
    zIndex: 1,
    minimized: true,
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
        dicePanel.minimized = true;
      }
      if (typeof dicePanel.width !== 'number') {
        dicePanel.width = 500;
      }
      if (typeof dicePanel.height !== 'number') {
        dicePanel.height = 200;
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
    const field = document.createElement('div');
    field.className = 'dice-spinner';

    const br1 = document.createElement('br');
    const br2 = document.createElement('br');
    const br3 = document.createElement('br');

    const label = document.createElement('div');
    label.className = 'dice-spinner-label';
    label.textContent = die.label.toUpperCase();

      const addDice = document.createElement('button');
      addDice.className = 'dice-spinner-button';
      addDice.textContent = '+';
      addDice.addEventListener('click', () => {
          let value = parseInt(input.value, 10)+1;
          if (!Number.isFinite(value) || value < 0) value = 0;
          input.value = value;
          panel.diceCounts[die.key] = value;
          context.saveState();
      });

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

      const remDice = document.createElement('button');
      remDice.className = 'dice-spinner-button';
      remDice.textContent = '-';
      remDice.addEventListener('click', () => {
          let value = parseInt(input.value, 10)-1;
          if (!Number.isFinite(value) || value < 0) value = 0;
          input.value = value;
          panel.diceCounts[die.key] = value;
          context.saveState();
      });

      field.appendChild(label);
      field.appendChild(br1);
      field.appendChild(addDice);    
      field.appendChild(br2);
      field.appendChild(input);   
      field.appendChild(br3);
      field.appendChild(remDice);
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
  rollBtn.textContent = 'Roll (Dice-so-nice)';

  const rollBtn2 = document.createElement('button');
  rollBtn2.className = 'dice-action-btn';
  rollBtn2.textContent = 'Roll (Dice-Box)';

  const clearBtn = document.createElement('button');
  clearBtn.className = 'dice-action-btn';
  clearBtn.textContent = 'Clear';
  clearBtn.classList.add('dice-action-btn-secondary');

  buttonsRow.appendChild(rollBtn);
  buttonsRow.appendChild(rollBtn2);
  buttonsRow.appendChild(clearBtn);
  bodyEl.appendChild(buttonsRow);

  const setButtonsEnabled = enabled => {
    rollBtn.disabled = !enabled;
    rollBtn2.disabled = !enabled;
    clearBtn.disabled = !enabled;
  };

  rollBtn.addEventListener('click', async () => {
      const counts = panel.diceCounts || {};
      const notation = buildNotation(counts);
      if (!notation) {
          return;
      }
      setButtonsEnabled(false);
      try {
          const diceClient = await getDiceClient();
          diceClient.clear();
          if (diceClient && typeof diceClient.roll === 'function') {
              await diceClient.roll(notation);
          }
      } catch (err) {
          console.error('Failed to roll dice:', err);
      } finally {
          setButtonsEnabled(true);
      }
  });

  rollBtn2.addEventListener('click', async () => {
      const counts = panel.diceCounts || {};
      const notation = buildNotation(counts);
      if (!notation) {
          return;
      }

      setButtonsEnabled(false);
      try {
          const dice2Client = await getDice2Client();

          if (dice2Client) {
              dice2Client.init().then(() => {
                  dice2Client.roll("2d20");
              });
          }          
      } catch (err) {
          console.error('Failed to roll dice:', err);
      } finally {
          setButtonsEnabled(true);
      }
  });

  clearBtn.addEventListener('click', async () => {
    setButtonsEnabled(false);
    try {
      const diceClient = await getDiceClient();
      diceClient.clear();
    } catch (err) {
      console.error('Failed to clear dice:', err);
    } finally {
      setButtonsEnabled(true);
    }
  });

  return { rollBtn, rollBtn2, clearBtn };
}

function renderLoadingBar(bodyEl) {
  const container = document.createElement('div');
  container.className = 'dice-panel-loading';

  const bar = document.createElement('div');
  bar.className = 'dice-panel-loading-bar';

  container.appendChild(bar);
  bodyEl.appendChild(container);
  return container;
}

function renderDiceControls(context, panel, bodyEl) {
  bodyEl.innerHTML = '';
  ensureOverlay();
  ensureCountsObject(panel);
  renderSpinnerRow(context, panel, panel.diceCounts, bodyEl);
  renderButtonsRow(context, panel, bodyEl);
}

export function renderDicePanel(context, panel, bodyEl) {
  if (!bodyEl) return;

  bodyEl.classList.add('dice-panel');

  if (panel.minimized) {
    return;
  }

  if (DiceSoNiceClientClass) {
    renderDiceControls(context, panel, bodyEl);
    return;
  }

  bodyEl.innerHTML = '';
  const loadingEl = renderLoadingBar(bodyEl);

  loadDiceClientModule()
    .then(() => {
      if (!bodyEl.isConnected) {
        return;
      }
      renderDiceControls(context, panel, bodyEl);
    })
    .catch(err => {
      console.error('Failed to load Dice So Nice client.', err);
      if (!bodyEl.isConnected) {
        return;
      }
      loadingEl.textContent = 'Failed to load dice client.';
    });
}

export function isDicePanel(panel) {
  return panel && panel.type === 'dice';
}

export { DIE_TYPES };
