import { Box3, CatmullRomCurve3, Clock, Vector3 } from 'three';
import { DiceSFX } from '../DiceSFX.js';
import { DiceSFXManager } from './../DiceSFXManager';
import { ShaderUtils } from './../ShaderUtils';


export class PlayAnimationThormund extends DiceSFX {
    static id = "PlayAnimationThormund";
    static specialEffectName = "DICESONICE.PlayAnimationThormund";
    static file = "modules/dice-so-nice/sfx/models/thormund.glb";
    static sound = "modules/dice-so-nice/sfx/sounds/thormund.mp3";
    static model = null;
    static curve = null;
    static duration1 = 2.5;
    static duration2 = 2.5;
    static up = new Vector3(0,0,1);
    /**@override init */
    static async init() {
        game.audio.pending.push(function(){
            foundry.audio.AudioHelper.preloadSound(PlayAnimationThormund.sound);
        }.bind(this));

        let gltf = await this.loadAsset(DiceSFXManager.GLTFLoader, PlayAnimationThormund.file);
        gltf.scene.traverse(function (node) {
            if (node.isMesh) {
                node.castShadow = true; 
                node.material.onBeforeCompile = ShaderUtils.applyDiceSoNiceShader;
            }
        });
        PlayAnimationThormund.model = gltf.scene.children[0];
    }

    /**@override play */
    async play() {
        this.step = 1;
        this.clock = new Clock();
        this.thormund = PlayAnimationThormund.model.clone();
        let scale = this.box.dicefactory.baseScale/100;

        let boundingBox = new Vector3();
        let parent = null;
        if(this.dicemesh.isMesh){
            parent = this.dicemesh.parent;
        } else {
            parent = this.dicemesh.parent.clone();
            delete parent.children[0].geometry;
        }
        new Box3().setFromObject(parent).getSize(boundingBox);
        
		this.thormund.scale.set(scale,scale,scale);
        this.thormund.rotation.x = Math.PI/2;
        this.thormund.position.x = parent.position.x;
        this.thormund.position.y = parent.position.y;
        this.thormund.position.z = parent.position.z + (boundingBox.z/2);

        this.curve = new CatmullRomCurve3( [
            new Vector3( this.thormund.position.x, this.thormund.position.y,-50),
            new Vector3( this.thormund.position.x +0, this.thormund.position.y    -100, this.thormund.position.z  +0 ),
            new Vector3( this.thormund.position.x +100, this.thormund.position.y  -30, this.thormund.position.z    +0 ),
            new Vector3( this.thormund.position.x +100, this.thormund.position.y  +30, this.thormund.position.z    +0 ),
            new Vector3( this.thormund.position.x +30, this.thormund.position.y    +100, this.thormund.position.z  +0 ),
            new Vector3( this.thormund.position.x -30, this.thormund.position.y    +100, this.thormund.position.z  +0 ),
            new Vector3( this.thormund.position.x -100, this.thormund.position.y  +30, this.thormund.position.z    +80 ),
            new Vector3( this.thormund.position.x /2, this.thormund.position.y /2, this.thormund.position.z    +100 )
        ],false,"chordal");

        this.curve2 = new CatmullRomCurve3([
            new Vector3( this.thormund.position.x /2, this.thormund.position.y /2, this.thormund.position.z    +100 ),
            new Vector3( 100, 50, this.box.camera.position.z/4 ),
            new Vector3( -100, -50, this.box.camera.position.z/4*2 ),
            new Vector3( 0, -50, this.box.camera.position.z/4*3 ),
            new Vector3( 0, 0, this.box.camera.position.z )
        ],false,"chordal");

        this.axis = new Vector3();
        this.box.scene.add(this.thormund);
        foundry.audio.AudioHelper.play({
            src: PlayAnimationThormund.sound,
            volume: this.volume
		}, false);
        this.renderReady = true;
    }

    render() {
        if(!this.renderReady)
            return;
        let duration = this.step == 1? PlayAnimationThormund.duration1:PlayAnimationThormund.duration2;
        let x = 1-((duration - this.clock.getElapsedTime())/duration);
        if(x>1){
            if(this.step == 1){
                this.step++;
                x = 0;
                this.clock.start();
                this.render();
            }
            else
                this.destroy();
        } else {
            let curve = this.step==1?this.curve:this.curve2;
            let p = curve.getPointAt(x);
            let t = curve.getTangentAt(x).normalize();
            this.axis.crossVectors(PlayAnimationThormund.up, t).normalize();
            let radians = Math.acos(PlayAnimationThormund.up.dot(t));

            this.thormund.position.copy(p);
            this.thormund.quaternion.setFromAxisAngle(this.axis,radians);
        }
    }

    destroy(){
        this.box.scene.remove(this.thormund);
        this.destroyed = true;
    }
}