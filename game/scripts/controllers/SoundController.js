export class SoundController {
    constructor() {
        this.audioContext = new window.AudioContext();
    }

    loadSound(url) {
        // Load and decode sound file
    }

    playSound(id, options) {
        // Play a sound with given id and options (like loop, volume, etc.)
    }

    updatePositionalSound(id, x, y, z) {
        // Update 3D sound position
    }

    setVolume(id, volume) {
        const scaledVolume = volume / 100;
        // ensure the volume is within the valid range
        const clampedVolume = Math.min(Math.max(scaledVolume, 0), 1);

        // Assuming you have a way to get the audio source or gain node by 'id'
        // const audioSource = this.getAudioSourceById(id);
        // if (audioSource && audioSource.gain) {
        //     audioSource.gain.value = clampedVolume;
        // }
    }



}



// setTimeout(() => {
//     const ambientSound = new Audio('../../game/assets/audio/Vexento - Glow.mp3');
//     ambientSound.loop = true;
//     ambientSound.play();
// }, 2000);