export class SoundController {
    loaded = false;
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.globalVolume = 0.5;
        this.sounds = {}; // sound buffers
        this.soundInstances = {}; // instances of playing sounds
        this.listener = this.audioContext.listener;
    }

    async loadSound(id, name) {
        const response = await fetch(this.getSoundUrl(name));
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sounds[id] = audioBuffer;
    }

    getSoundUrl(name) {
        // return `../../game/assets/audio/${name}.mp3`;
        return `game/assets/audio/${name}.mp3`;

    }

    playSound(id, options = {}) {
        const soundBuffer = this.sounds[id];
        if (!soundBuffer) {
            console.warn(`Sound buffer with ID ${id} not found.`);
            return;
        }

        // Can the sound be played multiple times at once?
        if (options.singleInstance && this.soundInstances[id] && this.soundInstances[id].length > 0) {
            const existingInstance = this.soundInstances[id][0];
            if (existingInstance.source && !existingInstance.source.ended) {
                if (options.restart) {
                    existingInstance.source.stop();
                } else {
                    return existingInstance;
                }
            }
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        let panner = null;

        source.buffer = soundBuffer;
        source.loop = options.loop || false;
        gainNode.gain.value = this.globalVolume;

        if (options.globalSound) {
            // for global sound, connect directly to gainNode without spatialization
            source.connect(gainNode);
        } else {
            // for spatialized sound, use a panner
            panner = this.audioContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            source.connect(panner).connect(gainNode);
        }

        gainNode.connect(this.audioContext.destination);
        source.start(0);

        // create instance and store in array
        if (!this.soundInstances[id]) {
            this.soundInstances[id] = [];
        }

        const instance = {source, gainNode, panner: options.globalSound ? null : panner};
        this.soundInstances[id].push(instance);

        return instance;
    }

    stopPlaying(id, all = false, exceptions = []) {
        if (all) {
            Object.keys(this.soundInstances).forEach(soundId => {
                if (!exceptions.includes(soundId)) {
                    this.stopInstances(soundId);
                }
            });
        } else {
            this.stopInstances(id);
        }
    }

    stopInstances(id) {
        const instances = this.soundInstances[id];
        if (instances && instances.length > 0) {
            instances.forEach(instance => {
                if (instance.source) {
                    instance.source.stop();
                }
            });
            this.soundInstances[id] = [];
        } else {
            console.warn(`No instances found for sound ID ${id} to stop.`);
        }
    }


    updateSoundPosition(id, index, x, y, z) {
        const instanceArray = this.soundInstances[id];
        if (instanceArray && instanceArray.length > index) {
            const instance = instanceArray[index];
            if (instance && instance.panner) {
                instance.panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
                instance.panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
                instance.panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);
            } else {
                console.warn(`Panner not found for sound ID ${id} at index ${index}`);
            }
        } else {
            console.warn(`Instance array not found or index out of range for sound ID ${id}`);
        }
    }

    updateListenerPosition(x, y, z) {
        this.listener.positionX.setValueAtTime(x, this.audioContext.currentTime);
        this.listener.positionY.setValueAtTime(y, this.audioContext.currentTime);
        this.listener.positionZ.setValueAtTime(z, this.audioContext.currentTime);
    }

    updateListenerOrientation(quaternion) {
        const forwardVector = this.quaternionToForwardVector(quaternion);
        const upVector = [0, 1, 0];

        this.listener.forwardX.setValueAtTime(-forwardVector[0], this.audioContext.currentTime);
        this.listener.forwardY.setValueAtTime(forwardVector[1], this.audioContext.currentTime);
        this.listener.forwardZ.setValueAtTime(-forwardVector[2], this.audioContext.currentTime);

        this.listener.upX.setValueAtTime(upVector[0], this.audioContext.currentTime);
        this.listener.upY.setValueAtTime(upVector[1], this.audioContext.currentTime);
        this.listener.upZ.setValueAtTime(upVector[2], this.audioContext.currentTime);
    }

    quaternionToForwardVector(quaternion) {
        const [x, y, z, w] = quaternion;
        return [
            2 * (x * z + w * y),
            2 * (y * z - w * x),
            1 - 2 * (x * x + y * y)
        ];
    }

    setVolume(id, volume) {
        const scaledVolume = Math.min(Math.max(volume / 100, 0), 1);
        const instances = this.soundInstances[id];
        if (instances) {
            instances.forEach(instance => {
                if (instance.gainNode) {
                    instance.gainNode.gain.value = scaledVolume * this.globalVolume;
                }
            });
        } else {
            console.warn(`No instances found for sound ID ${id}`);
        }
    }

    setGlobalVolume(volume) {
        const scaledVolume = Math.min(Math.max(volume / 100, 0), 1);
        this.globalVolume = scaledVolume;

        Object.values(this.soundInstances).forEach(instances => {
            instances.forEach(instance => {
                if (instance.gainNode) {
                    instance.gainNode.gain.value = scaledVolume;
                }
            });
        });
    }

}
