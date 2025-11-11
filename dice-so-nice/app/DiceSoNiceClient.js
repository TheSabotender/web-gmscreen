import DiceBox from "../../dice-box/index.js";

const DEFAULT_OPTIONS = {
  /**
   * CSS selector or HTMLElement that will receive the Dice So Nice canvas.
   * The caller can still manage the DOM separately; we simply pass the selector
   * through to DiceBox which will create or reuse the target canvas element.
   */
  selector: "#dice-box-canvas",
  /**
   * Relative asset path passed to DiceBox. The Dice So Nice assets live inside
   * the repo so we default to that location, but callers can override it.
   */
  assetPath: "/dice/assets/",
  /** Theme identifier configured inside the DiceBox theme loader. */
  theme: "default",
  /** Base color for dice that rely on tinting rather than baked textures. */
  themeColor: "#ffae2e",
  /** Physics / rendering tweaks delegated to DiceBox. */
  enableShadows: true,
  shadowTransparency: 0.8,
  lightIntensity: 1,
  delay: 120,
  scale: 7,
  offscreen: true,
  suspendSimulation: false,
  preloadThemes: [],
  externalThemes: {},
};

/**
 * Lightweight wrapper around the DiceBox renderer that mirrors the parts of
 * Dice So Nice we rely on inside the GM Screen application.  The original
 * Foundry module registered itself through the `game` and `Hooks` globals.
 * This class provides a framework agnostic API so the roller can be reused in
 * a regular web environment.
 */
export default class DiceSoNiceClient {
  constructor(options = {}) {
    if (typeof options === "string" || options instanceof HTMLElement) {
      this.options = { ...DEFAULT_OPTIONS, selector: options };
    } else {
      this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    if (!this.options.selector) {
      throw new Error("DiceSoNiceClient requires a selector or HTMLElement.");
    }

    this._diceBox = null;
    this._initPromise = null;
  }

  /**
   * Initialise the DiceBox renderer.
   * @returns {Promise<DiceSoNiceClient>}
   */
  async init() {
    if (!this._initPromise) {
      this._initPromise = this.#initialiseDiceBox();
    }
    await this._initPromise;
    return this;
  }

  async #initialiseDiceBox() {
    const {
      selector,
      preloadThemes = [],
      externalThemes = {},
      origin,
      ...diceBoxOptions
    } = this.options;

    const config = {
      container: selector,
      preloadThemes,
      externalThemes,
      ...diceBoxOptions,
    };

    if (origin !== undefined) {
      config.origin = origin;
    }

    this._diceBox = new DiceBox(config);
    await this._diceBox.init();

    if (Array.isArray(preloadThemes) && preloadThemes.length > 0) {
      const loader = preloadThemes.map((themeName) =>
        this._diceBox.loadTheme?.(themeName)
      );
      await Promise.all(loader);
    }
  }

  async #ensureReady() {
    if (!this._diceBox) {
      await this.init();
    } else if (this._initPromise) {
      await this._initPromise;
    }
    return this._diceBox;
  }

  /**
   * Roll a set of dice. The notation can be a standard dice string ("2d6") or
   * the structured objects accepted by DiceBox.
   * @param {string|object|Array} notation
   * @param {object} rollOptions - Optional overrides for the DiceBox roll call.
   * @returns {Promise<object>} Resolves with the DiceBox roll results.
   */
  async roll(notation, rollOptions = {}) {
    const diceBox = await this.#ensureReady();
    const theme = rollOptions.theme ?? this.options.theme;
    const themeColor = rollOptions.themeColor ?? this.options.themeColor;
    const newStartPoint = rollOptions.newStartPoint ?? true;

    return diceBox.roll(notation, { theme, themeColor, newStartPoint });
  }

  /**
   * Append dice to the current scene without clearing existing results.
   */
  async add(notation, rollOptions = {}) {
    const diceBox = await this.#ensureReady();
    const theme = rollOptions.theme ?? this.options.theme;
    const themeColor = rollOptions.themeColor ?? this.options.themeColor;
    const newStartPoint = rollOptions.newStartPoint ?? true;

    return diceBox.add(notation, { theme, themeColor, newStartPoint });
  }

  /**
   * Forwarder for DiceBox#clear that empties the canvas immediately.
   */
  clear() {
    this._diceBox?.clear();
  }

  /**
    * Release the underlying DiceBox instance so it can be garbage collected.
    */
  destroy() {
    if (this._diceBox) {
      this._diceBox.clear();
    }
    this._diceBox = null;
    this._initPromise = null;
  }
}
