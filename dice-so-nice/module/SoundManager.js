export class SoundManager {
    constructor() {
        this.sounds_table = {};
        this.sounds_dice = {};
        this.sounds_coins = [];
        this.sounds = true;
        this.volume = 1;
        this.soundsSurface = "felt";
        this.muteSoundSecretRolls = false;
        this.preloaded = false;
        this.audioContext = null;
        this.preloadPromise = null;
    }

    update(config) {
        this.sounds = config.sounds || this.sounds;
        this.volume = config.volume || this.volume;
        this.soundsSurface = config.soundsSurface || this.soundsSurface;
        this.muteSoundSecretRolls = config.muteSoundSecretRolls || this.muteSoundSecretRolls;

        this.ensurePreload();
    }

    ensurePreload() {
        if (this.preloadPromise) return this.preloadPromise;

        this.preloaded = true;
        this.preloadPromise = this.preloadSounds();
        return this.preloadPromise;
    }

    preloadSounds() {
        // Surfaces
        const surfacesPromise = this.fetchJsonResource('dice-so-nice/module/sounds/surfaces.json')
            .then(surfacesJson => this.processSoundsData(this.sounds_table, surfacesJson, 'surface'));

        // Hits
        const diceHitPromise = this.fetchJsonResource('dice-so-nice/module/sounds/dicehit.json')
            .then(diceHitJson => this.processSoundsData(this.sounds_dice, diceHitJson, 'dicehit'));

        return Promise.all([surfacesPromise, diceHitPromise]).catch(() => {});
    }

    fetchJsonResource(url) {
        return fetch(url).then(response => response.json());
    }

    ensureAudioContext() {
        if (!this.audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
        }
        return this.audioContext;
    }

    loadAudioBuffer(url) {
        const context = this.ensureAudioContext();
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer));
    }

    processSoundsData(target, jsonData, prefix) {
        const resourcePath = `dice-so-nice/module/sounds/${jsonData.resources[0]}`;
        const loadPromise = this.loadAudioBuffer(resourcePath)
            .then(buffer => target.source = { buffer })
            .catch(() => {});

        Object.entries(jsonData.spritemap).forEach(sound => {
            let type = sound[0].match(new RegExp(`${prefix}\_([a-z\_]*)`))[1];
            if (!target[type])
                target[type] = [];
            target[type].push(sound[1]);
        });

        return loadPromise;
    }

    playAudioSprite(source, sprite, selfVolume) {
        if (!source || !source.buffer)
            return false;

        const context = this.ensureAudioContext();

        const gainNode = context.createGain();
        gainNode.gain.value = selfVolume * this.volume;
        gainNode.connect(context.destination);

        const bufferSource = context.createBufferSource();
        bufferSource.buffer = source.buffer;
        bufferSource.loop = sprite.loop;
        bufferSource.loopStart = sprite.start;
        bufferSource.loopEnd = sprite.end;
        bufferSource.connect(gainNode);

        const offset = sprite.start;
        const duration = sprite.end - sprite.start;
        bufferSource.start(0, offset, duration);
    }

    eventCollide({ source, diceType, diceMaterial, strength }) {
        if (!this.sounds || !this.sounds_dice.source) return;

        const sound = this.selectSound(source, diceType, diceMaterial);
        const audioSource = this.getSoundSource(source);
        this.playAudioSprite(audioSource, sound, strength);
    }

    getSoundSource(source) {
        if (source === "dice") {
            return this.sounds_dice.source;
        } else {
            return this.sounds_table.source;
        }
    }

    selectSound(source, diceType, diceMaterial) {
        let sound;

        if (source === "dice") {
            if (diceType !== "dc") {
                let sounds_dice = this.sounds_dice['plastic'];
                if (this.sounds_dice[diceMaterial]) {
                    sounds_dice = this.sounds_dice[diceMaterial];
                }
                sound = sounds_dice[Math.floor(Math.random() * sounds_dice.length)];
            } else {
                sound = this.sounds_dice['coin'][Math.floor(Math.random() * this.sounds_dice['coin'].length)];
            }
        } else {
            const surface = this.soundsSurface;
            const soundlist = this.sounds_table[surface];
            sound = soundlist[Math.floor(Math.random() * soundlist.length)];
        }

        return sound;
    }

    generateCollisionSounds(workerCollides) {
        const detectedCollides = new Array(1000);
        if (!this.sounds || !this.sounds_dice.source) return detectedCollides;

        for (let i = 0; i < workerCollides.length; i++) {
            const collide = workerCollides[i];
            if (!collide) continue;

            const [source, diceType, diceMaterial, strength] = collide;
            const sound = this.selectSound(source, diceType, diceMaterial);
            const audioSource = this.getSoundSource(source);
            detectedCollides[i] = [audioSource, sound, strength];
        }

        return detectedCollides;
    }
}
