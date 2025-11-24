import { Coin } from "./dice/coin.js";
import { Die } from "./dice/die.js";
import { FateDie } from "./dice/fate.js";

import { DiceTerm } from "./terms/dice.js";
import { MathTerm } from "./terms/math.js";
import { NumericTerm } from "./terms/numeric.js";
import { OperatorTerm } from "./terms/operator.js";
import { ParentheticalTerm } from "./terms/parenthetical.js";
import { PoolTerm } from "./terms/pool.js";
import { StringTerm } from "./terms/string.js";

import { Roll } from "./roll.js";
import { MersenneTwister } from "./twister.js";

const DICE_ROLL_MODES = globalThis.DICE_ROLL_MODES = {
    BLIND: "blindroll",
    PRIVATE: "gmroll",
    PUBLIC: "publicroll",
    SELF: "selfroll"
}

const CONFIG = globalThis.CONFIG = {
    Dice: {
        types: [Die, FateDie],
        rollModes: Object.entries(DICE_ROLL_MODES).reduce((obj, e) => {
            let [k, v] = e;
            obj[v] = k;
            return obj;
        }, {}),
        rolls: [Roll],
        termTypes: { DiceTerm, MathTerm, NumericTerm, OperatorTerm, ParentheticalTerm, PoolTerm, StringTerm },
        terms: { c: Coin, d: Die, f: FateDie },
        randomUniform: MersenneTwister.random
    }
}