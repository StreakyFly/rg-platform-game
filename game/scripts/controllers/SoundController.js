export class SoundController {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.globalVolume = 0.5;
        this.sounds = {};
        this.listener = this.audioContext.listener;
    }

    async loadSound(id, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sounds[id] = audioBuffer;
    }

    playSound(id, options = {}) {
        const sound = this.sounds[id];
        if (!sound) {
            console.warn(`Sound with ID ${id} not found.`);
            return;
        }

        // Can the sound be played multiple times at once?
        if (options.singleInstance && sound.source && !sound.source.ended) {
            // // restart the sound
            // sound.source.stop();
            // keep the current instance playing
            return sound.source;
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const panner = this.audioContext.createPanner();

        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;

        source.buffer = sound;
        source.loop = options.loop || false;
        source.connect(panner).connect(gainNode);
        gainNode.gain.value = this.globalVolume;
        gainNode.connect(this.audioContext.destination);

        source.start(0);

        // Store sound data with the new source, gainNode, and panner
        this.sounds[id] = { buffer: source.buffer, source, gainNode, panner };

        return { source, gainNode, panner };
    }

    updateSoundPosition(id, x, y, z) {
        if (this.sounds[id] && this.sounds[id].panner) {
            const panner = this.sounds[id].panner;
            panner.positionX.setValueAtTime(x, this.audioContext.currentTime);
            panner.positionY.setValueAtTime(y, this.audioContext.currentTime);
            panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);
        } else {
            console.error(`Panner not found for sound ID ${id}`);
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
        if (this.sounds[id] && this.sounds[id].gainNode) {
            const gainNode = this.sounds[id].gainNode;
            gainNode.gain.value = Math.min(Math.max(volume / 100, 0), 1);
            console.log(id, gainNode.gain.value);
        } else {
            console.warn(`Gain node not found for sound ID ${id}`);
        }
    }

    setGlobalVolume(volume) {
        const scaledVolume = Math.min(Math.max(volume / 100, 0), 1);
        Object.values(this.sounds).forEach(sound => {
            if (sound.gainNode) {
                sound.gainNode.gain.value = scaledVolume;
            }
        });
    }

}
