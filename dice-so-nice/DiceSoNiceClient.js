import { Dice3D } from './module/Dice3D.js';
import { DiceConfig } from './module/DiceConfig.js';
import { RollableAreaConfig } from './module/RollableAreaConfig.js';
import { Utils } from './module/Utils.js';

/**
 * Lightweight wrapper around Dice So Nice we rely on inside the GM Screen application. 
 * The original Foundry module registered itself through the `game` and `Hooks` globals.
 * This class provides a framework agnostic API so the roller can be reused in
 * a regular web environment.
 */
export default class DiceSoNiceClient {
  constructor(container) {    
    if (!container) {
      throw new Error("DiceSoNiceClient requires a HTMLElement container.");
    }

    this.container = container;
    this._dice = null;
    this._initPromise = null;
  }

  /**
   * Initialise the DiceSoNice renderer.
   * @returns {Promise<DiceSoNiceClient>}
   */
  async init() {
    if (!this._initPromise) {
      this._initPromise = this.#initialiseDiceSoNice();
    }
    await this._initPromise;
    return this;
  }

  async #initialiseDiceSoNice() {    
    this._dice = new Dice3D();
      await this._dice.init();
  }

  async #ensureReady() {
    if (!this._dice) {
      await this.init();
    } else if (this._initPromise) {
      await this._initPromise;
    }
    return this._dice;
  }

  /**
   * Roll a set of dice. The notation can be a standard dice string ("2d6")
   */
  async roll(notation) {
    const dice = await this.#ensureReady();
    clear();
    return add(notation);
  }

  /**
   * Append dice to the current scene without clearing existing results.
   */
  async add(notation) {
    const dice = await this.#ensureReady();
      return dice.renderRolls(notation, rolls);

      //const dsnRoll = await new Roll(parameters).evaluate();
      //game.dice3d.showForRoll(dsnRoll, game.user, true);
  }

  /**
   * Forwarder for DiceSoNice that empties the canvas immediately.
   */
  clear() {
      
  }

  /**
    * Release the underlying DiceSoNice instance so it can be garbage collected.
    */
  destroy() {
      if (this._dice) {
          this._dice.clear();
    }
      this._dice = null;
    this._initPromise = null;
  }
}
