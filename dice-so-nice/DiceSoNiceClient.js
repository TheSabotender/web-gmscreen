import './dice/config.js';
import { Dice3D } from './module/Dice3D.js';
import { DiceNotation } from './module/DiceNotation.js';
import { Roll } from './dice/roll.js';
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
    globalThis.dice3d = this._dice;
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
  * Forwarder for DiceSoNice that empties the canvas immediately.
  */
  clear() {

  }

  /**
  * Append dice to the current scene without clearing existing results.
  */
  async add(notation) {
    const dice = await this.#ensureReady();
    //return dice.renderRolls(notation);

    let roll = new Roll(notation);
    roll.evaluate({ async: false });

    let data = new DiceNotation(roll, Dice3D.ALL_CONFIG(), {id: "me"});
    return dice.show(data, false, null, false);

    //const dsnRoll = await new Roll(parameters).evaluate();
    //game.dice3d.showForRoll(dsnRoll, game.user, true);
  }

  /**
   * Roll a set of dice. The notation can be a standard dice string ("2d6")
   */
  async roll(notation) {
    const dice = await this.#ensureReady();
    this.clear();
    return this.add(notation);
  }

  /**
    * Release the underlying DiceSoNice instance so it can be garbage collected.
    */
  destroy() {
    if (this._dice) {
      this._dice.clear();
    }
    this._dice = null;
    globalThis.dice3d = null;
    this._initPromise = null;
  }
}
