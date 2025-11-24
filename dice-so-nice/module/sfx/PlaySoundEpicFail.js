import { DiceSFX } from '../DiceSFX.js';

export class PlaySoundEpicFail extends DiceSFX {
    static id = "PlaySoundEpicFail";
    static specialEffectName = "DICESONICE.PlaySoundEpicFail";
    static path = 'dice-so-nice/module/sfx/sounds/epic_fail.mp3';
    static PLAY_ONLY_ONCE_PER_MESH = true;
    /**@override init */
    static async init(){
        game.audio.pending.push(function(){
            foundry.audio.AudioHelper.preloadSound(PlaySoundEpicFail.path);
        }.bind(this));
        return true;
    }

    /**@override play */
    async play(){
        foundry.audio.AudioHelper.play({
            src: PlaySoundEpicFail.path,
            volume: this.volume
		}, false);
    }
}