import { Game } from './game/scripts/Game.js';
import {
    toggleSettings,
    saveSettings,
    getRenderLight,
    getMouseSensitivity,
    getVolume,
} from './game/scripts/menus/Settings.js';
import { toggleLeaderboard } from './game/scripts/menus/Leaderboard.js';
import { showLoadingScreen, updateLoading, hideLoadingScreen, checkName, clickedPlay } from "./game/scripts/menus/LoadingScreen.js";
import { toggleVisibility, startClock } from './game/scripts/controllers/HUDController.js';
import { SoundController } from "./game/scripts/controllers/SoundController.js";

document.querySelector('.loader-container').remove();

const bodyElement = document.body;

document.getElementById('startGameButton').addEventListener('click', startGame);
document.getElementById('openLeaderboardButton').addEventListener('click', toggleLeaderboard);
document.getElementById('openSettingsButton').addEventListener('click', toggleSettings);
document.getElementById('leaderboardBackButton').addEventListener('click', toggleLeaderboard);
document.getElementById('saveSettingsButton').addEventListener('click', saveSettings);
document.getElementById('settingsBackButton').addEventListener('click', toggleSettings);
document.addEventListener('keydown', handleKeyDown);
document.getElementById('play').addEventListener('click', checkName);

export let soundController = null;

let gameCanvas = null;


async function startGame() {
    showLoadingScreen();
    isMainMenuActive = false;
    updateLoading();
    const game = new Game(getRenderLight());
    game.initialize()
        .then(async () => {
            bodyElement.classList.add('bottomText');
            console.log("Game initialized!");            
            setTimeout(async () => {
                while (!clickedPlay) {
                    await new Promise(r => setTimeout(r, 100));
                }
                document.getElementById('stats').style.display = 'block';
                hideLoadingScreen();
                focusElement(game.canvas);
                gameCanvas = game.canvas;
                startClock();
                toggleVisibility('menu-container')
            }, 300);
        })
        .catch(error => {
            console.error('Error during game initialization:', error);
        });
}


// rotate buttons slightly when hovered
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mouseenter', () => {
        const randomDegree = Math.floor(Math.random() * 3) + 4;
        const negativeMultiplier = Math.random() < 0.5 ? -1 : 1;
        button.style.setProperty('--random-rotation', (randomDegree * negativeMultiplier) + 'deg');
    });
});

export let pause = false;
let isMainMenuActive = true;

async function handleKeyDown(event) {
    if (event.key === 'p' && !isMainMenuActive) {
        togglePause();
    }
    if (event.key === 'm' && pause) {
        isMainMenuActive = true;
        toggleVisibility('menu-container')
        togglePause();
        document.exitPointerLock();
        toggleVisibility('stats');
    }
}

document.addEventListener('click', function (event) {
    if (pause) {
        togglePause();
    }
});

function togglePause() {
    pause = !pause;
    toggleVisibility('pause-menu', 'flex');
    toggleVisibility('stats', 'block');

    if (pause) {
        document.exitPointerLock();
        gameCanvas.classList.add('blur-effect');
    } else {
        gameCanvas.requestPointerLock();
        gameCanvas.click();
        gameCanvas.classList.remove('blur-effect');
    }
}

function focusElement(element) {
    element.addEventListener('click', () => element.requestPointerLock());
    element.click();
}

let backgroundSource = null;
function firstInteraction() {
    soundController = new SoundController();
    loadSounds().then(r => {
        backgroundSource = soundController.playSound('test', { loop: true });
        document.removeEventListener('click', firstInteraction);
    });
}

document.addEventListener('click', firstInteraction);

async function loadSounds() {
    await soundController.loadSound('test', '../../game/assets/audio/Vexento - Glow.mp3')
    // soundController.loadSound('test2', '../../game/assets/audio/Vexento - Glow.mp3')
}
