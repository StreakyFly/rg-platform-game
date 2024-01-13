import { showText } from "../../main.js";

const mouseSensitivity = document.getElementById('mouseSensitivity');
const volume = document.getElementById('volume');
const renderLight = document.getElementById('renderLight');

function toggleVisibility(elementId, displayValue='block') {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = element.style.display === 'none' ? displayValue : 'none';
    }
}

export function toggleSettings() {
    toggleVisibility('mainMenu', 'flex');
    toggleVisibility('settings', 'block');
    toggleVisibility('settingsHolder', 'block');

    mouseSensitivity.value = getMouseSensitivity();
    volume.value = getVolume();
    renderLight.checked = getRenderLight();
    updateMouseSensitivityValue(document.getElementById('mouseSensitivity').value);
    updateVolumeValue(document.getElementById('volume').value);
}

export function saveSettings() {
    showText("top", "Settings saved", 'white', 'black', 1.5);

    localStorage.setItem('mouseSensitivity', String(mouseSensitivity.value));
    localStorage.setItem('volume', String(volume.value));
    localStorage.setItem('renderLight', String(renderLight.checked));
}

export function getMouseSensitivity() {
    if (localStorage.getItem('mouseSensitivity') === null) {
        localStorage.setItem('mouseSensitivity', "50");
    }
    return parseInt(localStorage.getItem('mouseSensitivity'));
}

export function getVolume() {
    if (localStorage.getItem('volume') === null) {
        localStorage.setItem('volume', "false");
    }
    return parseInt(localStorage.getItem('volume'));
}

export function getRenderLight() {
    if (localStorage.getItem('renderLight') === null) {
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
    updateVolumeValue(this.value);
})
