import {showText} from "../../main.js";

const mouseSensitivity = document.getElementById('mouseSensitivity');
const volume = document.getElementById('volume');
const renderLight = document.getElementById('renderLight');

export function toggleSettings() {
    const settingsHolder = document.getElementById('settingsHolder');
    const settings = document.getElementById('settings');
    const mainMenu = document.getElementById('mainMenu');
    mainMenu.style.display = mainMenu.style.display === 'none' ? 'flex' : 'none';
    settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
    settingsHolder.style.display = settingsHolder.style.display === 'none' ? 'block' : 'none';

    mouseSensitivity.value = getMouseSensitivity();
    updateMouseSensitivityValue(document.getElementById('mouseSensitivity').value);

    volume.checked = getVolume();
    renderLight.checked = getRenderLight();
}

export function saveSettings() {
    showText("top", "Settings saved", 'white', 'black', 1.5);

    localStorage.setItem('mouseSensitivity', mouseSensitivity.value);
    localStorage.setItem('volume', volume.checked);
    localStorage.setItem('renderLight', renderLight.checked);
}

export function getMouseSensitivity() {
    if (localStorage.getItem('mouseSensitivity') === null) {
        localStorage.setItem('mouseSensitivity', 50);
    }
    return stringToBool(localStorage.getItem('mouseSensitivity'));
}

export function getVolume() {
    if (localStorage.getItem('volume') === null) {
        localStorage.setItem('volume', false);
    }
    return stringToBool(localStorage.getItem('volume'));
}

export function getRenderLight() {
    if (localStorage.getItem('renderLight') === null) {
        localStorage.setItem('renderLight', true);
    }
    return stringToBool(localStorage.getItem('renderLight'));
}

function stringToBool(string) {
    return string === "true"
}

export function updateMouseSensitivityValue(value) {
    document.getElementById('mouseSensitivityValue').textContent = value;
}

mouseSensitivity.addEventListener('change', function () {
    updateMouseSensitivityValue(this.value);
})