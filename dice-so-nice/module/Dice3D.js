import { DiceFactory } from './DiceFactory.js';
import { DiceBox } from './DiceBox.js';
import { DiceColors, TEXTURELIST, COLORSETS } from './DiceColors.js';
import { DiceNotation } from './DiceNotation.js';
import { DiceSFXManager } from './DiceSFXManager.js';
import { Accumulator } from './Accumulator.js';
import { Utils } from './Utils.js';
import { ThinFilmFresnelMap } from './libs/ThinFilmFresnelMap.js';
import { TextureLoader } from 'three';
import { DiceSFX } from './DiceSFX.js';
import { DiceSystem } from './DiceSystem.js';
/**
 * Main class to handle 3D Dice animations.
 */
export class Dice3D {

    static get DEFAULT_OPTIONS() {
        const quality = {};        
        const performanceMode = localStorage.getItem("dice-performanceMode");
        switch (performanceMode) {
            case 0:
                quality.bumpMapping = false;
                quality.shadowQuality = "low";
                quality.glow = false;
                quality.antialiasing = "none";
                quality.useHighDPI = false;
                quality.imageQuality = "low";
                break;
            case 1:
                quality.bumpMapping = true;
                quality.shadowQuality = "low";
                quality.glow = false;
                quality.antialiasing = "none";
                quality.useHighDPI = false;
                quality.imageQuality = "medium";
                break;
            case 2:
            case 3:
                quality.bumpMapping = true;
                quality.shadowQuality = "high";
                quality.glow = true;
                quality.antialiasing = game.canvas.app.renderer.context.webGLVersion === 2 ? "msaa" : "smaa";
                quality.useHighDPI = true;
                quality.imageQuality = "high";
                break;
        }

        return {
            enabled: true,
            showExtraDice: false,
            onlyShowOwnDice: false,
            hideAfterRoll: true,
            timeBeforeHide: 2000,
            hideFX: 'fadeOut',
            autoscale: true,
            scale: 75,
            speed: 1,
            imageQuality: quality.imageQuality,
            shadowQuality: quality.shadowQuality,
            bumpMapping: quality.bumpMapping,
            sounds: true,
            soundsSurface: 'felt',
            soundsVolume: 0.5,
            canvasZIndex: 'over',
            throwingForce: 'medium',
            useHighDPI: quality.useHighDPI,
            antialiasing: quality.antialiasing,
            glow: quality.glow,
            showOthersSFX: true,
            immersiveDarkness: true,
            muteSoundSecretRolls: false,
            enableFlavorColorset: true,
            rollingArea: false
        };
    }

    static DEFAULT_APPEARANCE() {
        let diceColor = localStorage.getItem("dice-diceColor");
        if (!diceColor || !DiceColors.hasColor(diceColor.toString())) {
            diceColor = "none";
        }

        return {            
            global: {
                labelColor: Utils.contrastOf(diceColor.toString()),
                diceColor: diceColor.toString(),
                outlineColor: diceColor.toString(),
                edgeColor: diceColor.toString(),
                texture: "none",
                material: "auto",
                font: "auto",
                colorset: "custom",
                system: "standard"
            }
        };
    }

    static ALL_DEFAULT_OPTIONS() {
        let options = foundry.utils.mergeObject(Dice3D.DEFAULT_OPTIONS, { appearance: Dice3D.DEFAULT_APPEARANCE() }, { performDeletions: true });
        options.appearance.global.system = DiceFactory.preferredSystem;
        options.appearance.global.colorset = DiceFactory.preferredColorset;
        return options;
    }

    static CONFIG() {
        const settings = localStorage.getItem("dice-settings");

        let userSettings = settings ? foundry.utils.duplicate(settings) : null;
        let config = foundry.utils.mergeObject(Dice3D.DEFAULT_OPTIONS, userSettings, { performDeletions: true });
        foundry.utils.mergeObject(config, { "-=appearance": null, "-=sfxLine": null }, { performDeletions: true });
        return config;
    }

    static APPEARANCE() {
        const appearanceSetting = localStorage.getItem("dice-appearance");

        let userAppearance = appearanceSetting ? foundry.utils.duplicate(appearanceSetting) : null;
        let appearance = foundry.utils.mergeObject(Dice3D.DEFAULT_APPEARANCE(), userAppearance, { performDeletions: true });
        return foundry.utils.mergeObject(appearance, { "-=dimensions": null }, { performDeletions: true });
    }

    static SFX() {
        const sfxList = localStorage.getItem("dice-sfxList");
        let sfxArray = sfxList ? foundry.utils.duplicate(sfxList) : [];

        if (!Array.isArray(sfxArray)) {
            sfxArray = [];
        }
        return sfxArray;
    }

    static SYSTEM_SETTINGS() {
        const systemSettingsListSetting = localStorage.getItem("dice-systemSettingsList");
        let systemSettingsList = systemSettingsListSetting ? foundry.utils.duplicate(systemSettingsListSetting) : [];

        if (!Array.isArray(systemSettingsList)) {
            systemSettingsList = [];
        }
        return systemSettingsList;
    }

    /**
     * Get the full customizations settings for the _showAnimation method 
     */
    static ALL_CUSTOMIZATION(dicefactory = null) {
        let specialEffects = Dice3D.SFX() || [];
        
        let config = foundry.utils.mergeObject({ appearance: Dice3D.APPEARANCE() }, { specialEffects: specialEffects }, { performDeletions: true });
        const appearance = localStorage.getItem("dice-appearance");
        if (dicefactory && !appearance) {
            if (dicefactory.preferredSystem != "standard")
                config.appearance.global.system = dicefactory.preferredSystem;
            if (dicefactory.preferredColorset != "custom")
                config.appearance.global.colorset = dicefactory.preferredColorset;
        }
        return config;
    }

    static ALL_CONFIG() {
        let ret = foundry.utils.mergeObject(Dice3D.CONFIG(), { appearance: Dice3D.APPEARANCE() }, { performDeletions: true });
        ret.specialEffects = Dice3D.SFX();
        return ret;
    }

    /**
     * Register a new system (legacy)
     * The id is to be used with addDicePreset
     * The name can be a localized string
     * @param {Object} system {id, name, group} or instance of DiceSystem
     * @param {Boolean} mode "default,preferred". Default will add the system as a choice. Preferred will be enabled for all users unless they change their settings.
     * @param {String} group Group to display in the dice selector. Can be any string, like the dice maker name or a brand
     */
    addSystem(system, mode = "default") {
        //retrocompatibility with  API version < 3.1
        if (typeof mode == "boolean") {
            mode = mode ? "preferred" : "default";
        }

        this.DiceFactory.addSystem(system, mode);
    }

    /**
     * Register a new dice preset
     * Type should be a known dice type (d4,d6,d8,d10,d12,d14,d16,d20,d24,d30,d100)
     * Labels contains either strings (unicode) or a path to a texture (png, gif, jpg, webp)
     * The texture file size should be 256*256
     * The system should be a system id already registered
     * @param {Object} dice {type:"",labels:[],system:""}
     */
    addDicePreset(dice, shape = null) {
        this.DiceFactory.addDicePreset(dice, shape);
    }

    /**
     * Add a texture to the list of textures and preload it
     * @param {String} textureID 
     * @param {Object} textureData 
     * @returns {Promise}
     */
    addTexture(textureID, textureData) {
        if (!textureData.bump)
            textureData.bump = '';
        return new Promise((resolve) => {
            let textureEntry = {};
            textureEntry[textureID] = textureData;
            TEXTURELIST[textureID] = textureData;
            DiceColors.loadTextures(textureEntry, (images) => {
                resolve();
            });
        });
    }

    /**
     * Add a colorset (theme)
     * @param {Object} colorset 
     * @param {Object} mode = "default", "preferred"
     */
    async addColorset(colorset, mode = "default") {
        let defaultValues = {
            foreground: "custom",
            background: "custom",
            outline: "",
            edge: "",
            texture: "custom",
            material: "custom",
            font: "custom",
            visibility: "visible"
        }
        colorset = foundry.utils.mergeObject(defaultValues, colorset, { performDeletions: true });
        COLORSETS[colorset.name] = colorset;
        DiceColors.initColorSets(colorset);

        if (colorset.font && !foundry.applications.settings.menus.FontConfig.getAvailableFonts().includes(colorset.font)) {
            await foundry.applications.settings.menus.FontConfig.loadFont(colorset.font, { editor: false, fonts: [] });
        }
        if (mode == "preferred")
            this.DiceFactory.preferredColorset = colorset.name;
    }

    /**
     * Add a new type if SFX trigger that can be customized by users.
     * This trigger can then be pulled by a system, a module or a macro
     * @param {String} id : Identifier of the trigger, ex: fate3df
     * @param {String} name : Localized name of the trigger, ex: Fate Roll
     * @param {Array(String)} results : Array of possible results for this trigger, ex: ["-3","3","0"]
     */
    addSFXTrigger(id, name, results) {
        if (DiceSFXManager.EXTRA_TRIGGER_RESULTS[id])
            return;
        DiceSFXManager.EXTRA_TRIGGER_TYPE.push({ id: id, name: name });
        DiceSFXManager.EXTRA_TRIGGER_RESULTS[id] = [];
        results.forEach((res) => {
            DiceSFXManager.EXTRA_TRIGGER_RESULTS[id].push({ id: res, name: res });
        });
    }

    /**
     * Registers a new SFX mode class with the DiceSFXManager.
     *
     * @param {DiceSFX} sfxClass - The SFX mode class to be registered.
     * @return {void}
     */
    addSFXMode(sfxClass) {
        DiceSFXManager.registerSFXModeClass(sfxClass);
    }

    /**
     * Load a save file by its name
     * @param {String} name 
     * @returns {Promise}
     */
    async loadSaveFile(name) {
        const saves = localStorage.getItem("dice-saves");

        if (saves.hasOwnProperty(name))
            await Utils.actionLoadSave(name);
    }

    /**
     * Get Loaded Dice Systems
     * return a map of DiceSystem
     * @returns {Map<systemId, DiceSystem>}
     */
    getLoadedDiceSystems() {
        return this.DiceFactory.systems;
    }


    /**
     * Constructor. Create and initialize a new Dice3d.
     */
    constructor() {        
        Messages.send("diceSoNiceInit", this);
        this.dice3dRenderers = {
            "board": null,
            "showcase": null
        };

        this.exports = {
            "Utils": Utils,
            "DiceColors": DiceColors,
            "TEXTURELIST": TEXTURELIST,
            "COLORSETS": COLORSETS
        };

        this.uniforms = {
            globalBloom: { value: 1 },
            bloomStrength: { value: 1.1 },
            bloomRadius: { value: 0.2 },
            bloomThreshold: { value: 0 },
            iridescenceLookUp: { value: new ThinFilmFresnelMap() },
            iridescenceNoise: { value: new TextureLoader().load("dice-so-nice/module/textures/noise-thin-film.webp") },
            boost: { value: 1.5 },
            time: { value: 0 }
        };

        this.hiddenAnimationQueue = [];
        this.defaultShowExtraDice = Dice3D.DEFAULT_OPTIONS.showExtraDice;
    }

    init() {
        this._buildCanvas();
        this._initListeners();
        this._buildDiceBox();
        DiceColors.loadTextures(TEXTURELIST, async (images) => {
            DiceColors.initColorSets();

            Messages.send("diceSoNiceReady", this);
            await this.DiceFactory._loadFonts();
            await this.DiceFactory.preloadPresets();
        });
        DiceSFXManager.init();
        this._startQueueHandler();
        this._nextAnimationHandler();
    }

    get canInteract() {
        return !this.box.running;
    }

    /**
     * Create and inject the dice box canvas resizing to the window total size.
     *
     * @private
     */
    _buildCanvas() {
        const config = Dice3D.CONFIG();
        const bodyTop = parseInt(window.getComputedStyle(document.body).top, 10) || 0;

        const area = {
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight - 1 - bodyTop
        };

        if(config.rollingArea) {
            area.width = config.rollingArea.width;
            area.height = config.rollingArea.height;
            area.left = config.rollingArea.left;
            area.top = config.rollingArea.top;
        }

        if (!config.enabled) {
            area.width = 1;
            area.height = 1;
        }

        this.canvas = $(`<div id="dice-box-canvas" style="position: absolute; left: ${area.left}px; top: ${area.top}px; pointer-events: none;"></div>`);
        if (config.canvasZIndex === "over") {
            this.canvas.css("z-index", 1000);
            this.canvas.appendTo($('body'));
        }
        else {
            $("#board").after(this.canvas);
        }
        this.canvas.width(area.width + 'px');
        this.canvas.height(area.height + 'px');
    }

    /**
     * Build the dicebox.
     *
     * @private
     */
    _buildDiceBox() {
        this.DiceFactory = new DiceFactory(this);
        let config = Dice3D.ALL_CONFIG();
        config.boxType = "board";

        config.dimensions = this._computeDimensions(config.rollingArea);

        this.box = new DiceBox(this.canvas[0], this.DiceFactory, config);
        this.box.initialize();
    }

    _computeDimensions(rollingArea) {
        const dimensions = {
            width: window.innerWidth,
            height: window.innerHeight - 1,
            margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            }
        };

        dimensions.width = rollingArea.width;
        dimensions.height = rollingArea.height;

        return dimensions;
    }

    /**
     * Init listeners on windows resize and on click if auto hide has been disabled within the settings.
     *
     * @private
     */
    _initListeners() {
        this._rtime;
        this._timeout = false;
        $(window).resize(() => {
            this._rtime = new Date();
            if (this._timeout === false) {
                this._timeout = true;
                setTimeout(resizeEnd.bind(this), 1000);
            }
        });

        const resizeEnd = () => {
            if (new Date() - this._rtime < 1000) {
                setTimeout(resizeEnd.bind(this), 1000);
            } else {
                this._timeout = false;
                //resize ended probably, lets update the canvas
                this.resizeAndRebuild();
            }
        };

        // Resize the play area
        // Only works if the window size hasn't changed
        this.resizePlayArea = () => {
            const config = Dice3D.CONFIG();
            const dimensions = this._computeDimensions(config.rollingArea);
            this.box.updateBoundaries(dimensions);
        };

        //Only used after a window resize
        this.resizeAndRebuild = () => {
            this.canvas[0].remove();
            this.dice3dRenderers.board.dispose();
            this.dice3dRenderers.board = null;

            //save previous systems
            const systemBackup = this.DiceFactory.systems;

            this.box.clearScene();
            this._buildCanvas();
            this._buildDiceBox();
            this.box.soundManager.preloadSounds();

            // Restore previous systems
            this.DiceFactory.systems = systemBackup;
        };

        Messages.listen('module.dice-so-nice', (request) => {
            switch (request.type) {
                case "show":
                    this.show(request.data);
                    break;
                case "update":
                    DiceSFXManager.init();
                    this.DiceFactory.preloadPresets(false);
                    break;
            }
        });

        const hideCanvasAndClear = () => {
            const config = Dice3D.CONFIG();
            if (!config.hideAfterRoll && this.canvas.is(":visible") && !this.box.rolling) {
                this.canvas.hide();
                this.box.clearAll();
            }
        }

        const mouseNDC = (event) => {
            let rect = this.canvas[0].getBoundingClientRect();
            let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            if (x > 1)
                x = 1;
            let y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
            return { x: x, y: y };
        }

        const allowInteractivity = localStorage.getItem("dice-allowInteractivity");
        if (allowInteractivity) {
            $(document).on("mousemove.dicesonice", "body", async (event) => {
                if (!this.canInteract)
                    return;
                await this.box.onMouseMove(event, mouseNDC(event));
            });

            $(document).on("mousedown.dicesonice", "body", async (event) => {
                if (!this.canInteract)
                    return;
                let hit = await this.box.onMouseDown(event, mouseNDC(event));
                if (hit)
                    this._beforeShow();
                else {
                    hideCanvasAndClear();
                }
            });

            $(document).on("mouseup.dicesonice", "body", async (event) => {
                if (!this.canInteract)
                    return;
                let hit = await this.box.onMouseUp(event);
                if (hit)
                    this._afterShow();
            });
        } else {
            $(document).on("mousedown.dicesonice", "body", async (event) => {
                hideCanvasAndClear();
            });
        }
    }

    /**
     * Check if 3D simulation is enabled from the settings.
     */
    isEnabled() {        
        return true;
    }

    /**
     * Update the DiceBox with fresh new settgins.
     *
     * @param settings
     */
    update(settings) {
        this.box.update(settings);
    }

    /**
     * Parse, sort and add the dice animation to the queue for a chat message and an array of Roll
     * Used internally by the message Hooks. Not meant to be used outside of the module.
     * Please use the showForRoll method instead.
     * @param {ChatMessage} chatMessage 
     * @param {Array<Roll>} rolls 
     */
    renderRolls(chatMessage, rolls) {
        const showMessage = () => {
            delete chatMessage._dice3danimating;

            let messageElement = $(window.ui.chat.element).find(`.message[data-message-id="${chatMessage.id}"]`);
            messageElement.removeClass("dsn-hide");

            let messageElementPopout;
            if (window.ui.sidebar.popouts.chat) {
                messageElementPopout = $(window.ui.sidebar.popouts.chat.element).find(`.message[data-message-id="${chatMessage.id}"]`);
                messageElementPopout.removeClass("dsn-hide");
            }

            // Manage v13 popup system - TODO clean up consistency jquery
            const notificationElement = document.querySelector(`#chat-notifications .message[data-message-id="${chatMessage.id}"]`);
            if (notificationElement) {
                notificationElement.classList.remove("dsn-hide");
                notificationElement._lifeSpan = 0; // Reset lifespan so timeout duration starts from when the message is shown. No public method yet
            }

            if(!ui.sidebar.expanded) {
                ui.chat.notify(chatMessage, { newMessage: true, existing: ui.chat.element.querySelector(`[data-message-id="${chatMessage.id}"]`) });
            }

            if (chatMessage._dice3dMessageHidden) {
                //first/initial rolls are done
                chatMessage._dice3dMessageHidden = false;
            } else if (chatMessage._dice3dRollsHidden && chatMessage._dice3dRollsHidden.length) {
                //subsequent rolls. for every 'done' roll we reveal x hidden rolls by shifting the _dice3dRollsHidden array
                messageElement.find(`.dice-roll.dsn-hide`).slice(0, chatMessage._dice3dRollsHidden.shift()).removeClass("dsn-hide");

                if (window.ui.sidebar.popouts.chat) {
                    messageElementPopout.find(`.dice-roll.dsn-hide`).slice(0, chatMessage._dice3dRollsHidden.shift()).removeClass("dsn-hide");
                }
            }

            Messages.send("diceSoNiceRollComplete", chatMessage.id);
        }

        //1- We create a list of all 3D rolls, ordered ASC
        //2- We create a Roll object with the correct formula and results
        //3- We queue the showForRoll calls and then show the message
        let orderedDiceList = [[]];
        rolls.forEach(roll => {
            roll.dice.forEach(diceTerm => {
                let index = 0;
                const enabledSimultaneousRollForMessage = localStorage.getItem("dice-enabledSimultaneousRollForMessage");
                if (!enabledSimultaneousRollForMessage && diceTerm.options.hasOwnProperty("rollOrder")) {
                    index = diceTerm.options.rollOrder;
                    if (orderedDiceList[index] == null) {
                        orderedDiceList[index] = [];
                    }
                }

                //In order to allow for custom appearance and the roll level, we merge the roll appearance in the dice term
                if (roll.options?.appearance) {
                    if (!diceTerm.options)
                        diceTerm.options = {};
                    if (!diceTerm.options.appearance)
                        diceTerm.options.appearance = {};
                    diceTerm.options.appearance = foundry.utils.mergeObject(diceTerm.options.appearance, roll.options.appearance);
                }

                orderedDiceList[index].push(diceTerm);
            });
        });
        orderedDiceList = orderedDiceList.filter(el => el != null);

        let rollList = [];
        const plus = "+";
        //_evaluated is false in v12, true in v13+
        if (!plus._evaluated)
            plus.evaluate();

        orderedDiceList.forEach(dice => {
            //add a "plus" between each term
            if (Array.isArray(dice) && dice.length) {
                let termList = [...dice].map((e, i) => i < dice.length - 1 ? [e, plus] : [e]).reduce((a, b) => a.concat(b));
                //We use the Roll class registered in the CONFIG constant in case the system overwrites it (eg: HeXXen)
                rollList.push(CONFIG.dice.rolls[0].fromTerms(termList));
            }
        });

        //call each promise one after the other, then call the showMessage function
        const recursShowForRoll = (rollList, index) => {
            let author = chatMessage.author;

            this.showForRoll(rollList[index], author, false, null, false, chatMessage.id, chatMessage.speaker).then(() => {
                index++;
                if (rollList[index] != null)
                    recursShowForRoll(rollList, index);
                else
                    showMessage();
            });
        };

        recursShowForRoll(rollList, 0);
    }

    /**
     * Show the 3D Dice animation for the Roll made by the User.
     *
     * @param roll an instance of Roll class to show 3D dice animation.
     * @param user the user who made the roll.
     * @param synchronize if the animation needs to be sent and played for each players (true/false).
     * @param users list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind if the roll is blind for the current user
     * @param messageID ChatMessage related to this roll (default: null)
     * @param speaker Object based on the ChatSpeakerData data schema related to this roll. Useful to fully support DsN settings like "hide npc rolls". (Default: null)
     * @param options Object with 2 booleans: ghost (default: false) and secret (default: false)
     * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
     */
    showForRoll(roll, user, synchronize, users = null, blind, messageID = null, speaker = null, options = { ghost: false, secret: false }) {
        let context = {
            roll: roll,
            user: user,
            users: users,
            blind: blind
        };

        if (options.ghost) {
            context.roll.ghost = true;
        }

        if (options.secret) {
            context.roll.secret = true;
        }

        //If the showForRoll method was called directly from the API, we didn't get the chance to retrieve a roll appearance
        const applyAppearance = (roll) => {
            if (roll.rolls) { // Is PoolTerm
                roll.rolls.forEach(applyAppearance);
            } else if (roll.options?.appearance) { // Is Roll with appearance
                roll.dice.forEach(diceTerm => {
                    if (!diceTerm.options)
                        diceTerm.options = {};
                    if (!diceTerm.options.appearance)
                        diceTerm.options.appearance = {};

                    diceTerm.options.appearance = foundry.utils.mergeObject(diceTerm.options.appearance, roll.options.appearance);
                });
            }
        };
        applyAppearance(context.roll);

        context.messageID = messageID;
        Messages.send("diceSoNiceRollStart", context);
        
        let hookedRoll = context.dsnRoll || context.roll;
        let notation = new DiceNotation(hookedRoll, Dice3D.ALL_CONFIG(user), user);
        return this.show(notation, context.user, synchronize, context.users, context.blind);
    }

    /**
     * Show the 3D Dice animation based on data configuration made by the User.
     *
     * @param data data containing the dice info.
     * @param user the user who made the roll.
     * @param synchronize
     * @param users list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind if the roll is blind for the current user
     * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
     */
    show(data, synchronize = false, users = null, blind) {
        return new Promise((resolve, reject) => {

            if (!data.throws) throw new Error("Roll data should be not null");

            if (!data.throws.length || !this.isEnabled()) {
                resolve(false);
            } else {                
                this._showAnimation(data, Dice3D.ALL_CUSTOMIZATION(user, this.DiceFactory)).then(displayed => {
                    resolve(displayed);
                });
            }
            const immediatelyDisplayChatMessages = localStorage.getItem("dice-immediatelyDisplayChatMessages");
            if (immediatelyDisplayChatMessages) {
                resolve();
            }
        });
    }

    /**
     * Change the default value of the showExtraDice settings
     * @param {Boolean} show 
     */
    showExtraDiceByDefault(show = true) {
        this.defaultShowExtraDice = show;
    }

    /**
     * enableDebugMode
     */
    enableDebugMode() {
        if(this.box)
            this.box.debugMode = true;
    }

    /**
     * Helper function to detect the end of a 3D animation for a message
     * @param {ChatMessage.ID} targetMessageId 
     * @returns Promise<boolean>
     */
    waitFor3DAnimationByMessageID(targetMessageId) {
        function buildHook(resolve) {
            Messages.listen('diceSoNiceRollComplete', (messageId) => {
                if (targetMessageId === messageId)
                    resolve(true);
                else
                    buildHook(resolve)
            });
        }

        return new Promise((resolve, reject) => {
            const immediatelyDisplayChatMessages = localStorage.getItem("dice-immediatelyDisplayChatMessages");
            if (Dice3D.CONFIG().enabled && !immediatelyDisplayChatMessages) {
                buildHook(resolve);
            } else {
                resolve(true);
            }
        });
    }


    /**
     * Add the 3D Dice animation to the Accumulator based on data configuration made by the User.
     *
     * @param notation 
     * @param dsnConfig
     * @returns {Promise<boolean>}
     * @private
     */
    _showAnimation(notation, dsnConfig) {
        notation.dsnConfig = dsnConfig;
        return new Promise((resolve, reject) => {
            this.nextAnimation.addItem({
                params: notation,
                resolve: resolve
            });
        });
    }

    /**
     * Initializes the animation queue system.
     * Sets up an empty queue array for managing dice roll animations
     * and initializes a Promise to track the current animation state.
     * 
     * @private
     */
    _startQueueHandler() {
        this.queue = [];
        this._currentAnimation = Promise.resolve();
    }


    /**
     * Processes the queue of dice animations recursively.
     * Each animation in the queue is executed one at a time in sequence.
     * Once an animation is complete, it moves on to the next one if available.
     *
     * @private
     * @returns {Promise<void>} Resolves when all queued animations are complete
     */
    async _processQueue() {
        if (this.queue.length === 0) return;

        const animate = this.queue.shift();
        await animate();

        // If there are more animations, process the next one
        if (this.queue.length > 0) {
            await this._processQueue();
        }
    }

    /**
     * Initializes and handles the animation queue system for dice rolls.
     * This method sets up an Accumulator to manage multiple dice roll animations,
     * potentially allowing for simultaneous rolls based on game settings.
     *
     * @private
     * @returns {Promise<void>} A promise that resolves when the animation handler is initialized
     */
    async _nextAnimationHandler() {
        const enabledSimultaneousRolls = localStorage.getItem("dice-enabledSimultaneousRolls");
        const timing = enabledSimultaneousRolls ? 400 : 0;

        this.nextAnimation = new Accumulator(timing, async (items) => {
            // If dice are disabled or queue is too long, resolve all items as false
            if (!this.isEnabled() || this.queue.length >= 10) {
                items.forEach(item => item.resolve(false));
                return;
            }

            // Merge multiple roll commands into a single command array
            const commands = DiceNotation.mergeQueuedRollCommands(items);
            let remainingAnimations = commands.length;

            // Chain the animations using promises
            this._currentAnimation = this._currentAnimation.then(async () => {
                // Process each dice throw command
                for (const diceThrow of commands) {
                    this.queue.push(() => new Promise(async (resolve) => {
                        this._beforeShow();
                        await this.box.start_throw(diceThrow, () => {
                            remainingAnimations--;
                            // When all animations are complete, resolve items and cleanup
                            if (remainingAnimations === 0) {
                                items.forEach(item => item.resolve(true));
                                this._afterShow();
                            }
                            resolve();
                        });
                    }));
                }
                return this._processQueue();
            });

            await this._currentAnimation;
        });
    }

    /**
     *
     * @private
     */
    _beforeShow() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }
        this.canvas.stop(true);
        this.canvas.show();
    }

    /**
     *
     * @private
     */
    _afterShow() {
        if (Dice3D.CONFIG().hideAfterRoll) {
            if (DiceSFXManager.renderQueue.length) {
                clearTimeout(this.timeoutHandle);
                return;
            } else {
                this.timeoutHandle = setTimeout(() => {
                    if (!this.box.rolling) {
                        if (Dice3D.CONFIG().hideFX === 'none') {
                            this.canvas.hide();
                            this.box.clearAll();
                        }
                        if (Dice3D.CONFIG().hideFX === 'fadeOut') {
                            this.canvas.fadeOut({
                                duration: 1000,
                                complete: () => {
                                    this.box.clearAll();
                                },
                                fail: () => {
                                    this.canvas.fadeIn(0);
                                }
                            });
                        }
                    }
                }, Dice3D.CONFIG().timeBeforeHide);
            }
        }
    }
}