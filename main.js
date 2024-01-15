import { Game } from './game/scripts/Game.js';
import {
    toggleSettings,
    saveSettings,
    getRenderLight,
    getVolume,
    getMouseSensitivity,
} from './game/scripts/menus/Settings.js';
import { toggleLeaderboard, getDate, savePlayerData } from './game/scripts/menus/Leaderboard.js';
import { showLoadingScreen, updateLoading, hideLoadingScreen, checkName, clickedPlay } from "./game/scripts/menus/LoadingScreen.js";
import { toggleVisibility, startClock } from './game/scripts/controllers/HUDController.js';
import { SoundController } from "./game/scripts/controllers/SoundController.js";

document.querySelector('.loader-container').remove();

document.getElementById('startGameButton').addEventListener('click', startGame);
document.getElementById('openLeaderboardButton').addEventListener('click', toggleLeaderboard);
document.getElementById('openSettingsButton').addEventListener('click', toggleSettings);
document.getElementById('leaderboardBackButton').addEventListener('click', toggleLeaderboard);
document.getElementById('saveSettingsButton').addEventListener('click', saveSettings);
document.getElementById('settingsBackButton').addEventListener('click', toggleSettings);
document.getElementById('play').addEventListener('click', checkName);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('click', firstInteraction);
document.addEventListener('click', function (event) {
    if (pause) {
        togglePause();
    }
});

// rotate buttons slightly when hovered
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mouseenter', () => {
        const randomDegree = Math.floor(Math.random() * 3) + 4;
        const negativeMultiplier = Math.random() < 0.5 ? -1 : 1;
        button.style.setProperty('--random-rotation', (randomDegree * negativeMultiplier) + 'deg');
    });
});

let game = null;
export let pause = false;
export let soundController = null;
export let isLoadingActive = false;
export const mouseSensitivity = getMouseSensitivity();


async function startGame() {
    showLoadingScreen();
    isLoadingActive = true;
    updateLoading();
    game = new Game(getRenderLight());
    game.initialize()
        .then(async () => {
            menuToGame();
        })
        .catch(error => {
            console.error('Error during game initialization:', error);
        });
}

async function handleKeyDown(event) {
    if (event.key === 'p' && !document.getElementById('main-menu').style.display && !isLoadingActive) {
        togglePause();
    }
    if (event.key === 'm' && pause) {
        toggleVisibility('menu-container')
        togglePause();
        document.exitPointerLock();
        toggleVisibility('stats');
        // soundController.stopPlaying(null, true, ['ambience']);
        window.location.reload()
    }
}

function menuToGame() {
    document.body.classList.add('bottomText');
    console.log("Game initialized!");
    setTimeout(async () => {
        while (!clickedPlay) {
            await new Promise(r => setTimeout(r, 100));
        }
        toggleVisibility('stats', 'block', true);
        hideLoadingScreen();
        isLoadingActive = false;
        focusElement(game.canvas);
        startClock();
        toggleVisibility('menu-container')
    }, 300);
}

export function endGame(deaths) {
    document.exitPointerLock();
    game.canvas.classList.add('blur-effect');
    document.getElementById('endGame-menu').style.display = 'block';
    const clock = document.getElementById('time');

    const time = clock.textContent;
    const date = getDate();
    const name = localStorage.getItem('playerName');

    document.getElementById('endData').innerHTML = `You escaped the castle in ${time} and died ${deaths === 1 ? deaths + " time" : deaths + " times"}!`;
    savePlayerData(name, date, time, deaths);
}

function togglePause() {
    pause = !pause;
    toggleVisibility('pause-menu', 'flex');
    toggleVisibility('stats', 'block');

    if (pause) {
        document.exitPointerLock();
        game.canvas.classList.add('blur-effect');
    } else {
        game.canvas.requestPointerLock();
        game.canvas.click();
        game.canvas.classList.remove('blur-effect');
    }
}

function focusElement(element) {
    element.addEventListener('click', () => element.requestPointerLock());
    element.click();
}

function firstInteraction() {
    document.removeEventListener('click', firstInteraction);
    soundController = new SoundController();
    soundController.setGlobalVolume(getVolume());
    loadSounds().then(() => {
        soundController.playSound('ambience', { loop: true, globalSound: true });
        soundController.setVolume('ambience', 50);
    });
}

async function loadSounds() {
    await soundController.loadSound('ambience', 'ambience');
    await soundController.loadSound('fire', 'fire');
    await soundController.loadSound('pick-up', 'pick-up');
    await soundController.loadSound('stone-sliding', 'stone-sliding');
    await soundController.loadSound('death', 'death');
    await soundController.loadSound('footsteps', 'footsteps');
    await soundController.loadSound('jump', 'jump');
    await soundController.loadSound('double-jump', 'double-jump');
    await soundController.loadSound('achievement', 'achievement');
    soundController.loaded = true;
}
