import { showTopText, toggleVisibility } from "../controllers/HUDController.js";
import { soundController } from "../../../main.js";

const mouseSensitivity = document.getElementById('mouseSensitivity');
const volume = document.getElementById('volume');
const renderLight = document.getElementById('renderLight');

export function toggleSettings() {
    toggleVisibility('main-menu', 'flex');
    toggleVisibility('settings', 'block');
    toggleVisibility('settingsHolder', 'block');

    mouseSensitivity.value = getMouseSensitivity();
    volume.value = getVolume();
    renderLight.checked = getRenderLight();
    updateMouseSensitivityValue(document.getElementById('mouseSensitivity').value);
    updateVolumeValue(document.getElementById('volume').value);
    if (soundController !== null) {
        soundController.setGlobalVolume(volume.value);
    }
}

export function saveSettings() {
    showTopText("Settings saved", 'white', 'black', 1.5);

    localStorage.setItem('mouseSensitivity', String(mouseSensitivity.value));
    localStorage.setItem('volume', String(volume.value));
    localStorage.setItem('renderLight', String(renderLight.checked));
}

export function getMouseSensitivity() {
    let sensitivity = parseInt(localStorage.getItem('mouseSensitivity'));
    if (isNaN(sensitivity) || sensitivity == null) {
        sensitivity = 50;
        localStorage.setItem('mouseSensitivity', "50");
    }
    return sensitivity;
}

export function getVolume() {
    let volume = parseInt(localStorage.getItem('volume'));
    if (isNaN(volume) || volume == null) {
        volume = 50;
        localStorage.setItem('volume', "50");
    }
    return volume;
}

export function getRenderLight() {
    if (localStorage.getItem('renderLight') == null) {
        localStorage.setItem('renderLight', "true");
    }
    return stringToBool(localStorage.getItem('renderLight'));
}

function stringToBool(string) {
    return string === "true"
}

export function updateMouseSensitivityValue(value) {
    document.getElementById('mouseSensitivityValue').textContent = value + " %";
}

mouseSensitivity.addEventListener('input', function () {
    updateMouseSensitivityValue(this.value);
})

export function updateVolumeValue(value) {
    document.getElementById('volumeValue').textContent = value + " %";
}

volume.addEventListener('input', function () {
    const volume = this.value;
    updateVolumeValue(volume);
    soundController.setGlobalVolume(volume);
})
