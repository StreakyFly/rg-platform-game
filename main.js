import { Game } from './game/scripts/Game.js';
import { startClock } from './game/scripts/Stats.js';
import { toggleSettings, saveSettings, updateMouseSensitivityValue, getRenderLight } from './game/scripts/Settings.js';
import { toggleLeaderboard } from './game/scripts/LeaderBoard.js';

document.querySelector('.loader-container').remove();

const bodyElement = document.body;
// bodyElement.classList.add('main-menu');  // TODO why does this change the menu layout?? This should've already been loaded before

document.getElementById('startGameButton').addEventListener('click', startGame);
document.getElementById('openLeaderboardButton').addEventListener('click', toggleLeaderboard);
document.getElementById('openSettingsButton').addEventListener('click', toggleSettings);
document.getElementById('leaderboardBackButton').addEventListener('click', toggleLeaderboard);
document.getElementById('saveSettingsButton').addEventListener('click', saveSettings);
document.getElementById('settingsBackButton').addEventListener('click', toggleSettings);
document.getElementById('pauseButton').addEventListener('click', togglePause);
document.getElementById('mainMenuButton').addEventListener('click', showMainMenu);
document.getElementById('mouseSensitivity').addEventListener('change', function () {
    updateMouseSensitivityValue(this.value);
})


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

document.addEventListener('keydown', function (event) {
    if (event.key === 'p' && !isMainMenuActive) {
        togglePause();
    }
});

document.addEventListener('click', function (event) {
    if (event.target.id !== 'pauseMenu' && pause) {
        togglePause();
    }
});

function togglePause() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pause) {
        pauseMenu.style.display = 'none';
        pause = false;
    } else {
        pauseMenu.style.display = 'block';
        pause = true;
    }
}

function startGame() {
    showLoadingScreen();
    isMainMenuActive = false;
    updateLoadingScreen(7);

    // remove main menu styles and add game styles
    bodyElement.classList.remove('main-menu');
    bodyElement.classList.add('game');

    updateLoadingScreen(19);
    setTimeout(() => updateLoadingScreen(46), 500);

    const game = new Game(getRenderLight());
    game.initialize()
        .then(() => {
            updateLoadingScreen(81);
            bodyElement.classList.add('bottomText');
            console.log("Game initialized!");
            setTimeout(() => updateLoadingScreen(100), 100);
            document.getElementById('stats').style.display = 'block';
            setTimeout(() => {
                hideLoadingScreen();
                startClock();
            }, 300);
        })
        .catch(error => {
            console.error('Error during game initialization:', error);
            updateLoadingScreen(100, true);
        });
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}


function updateLoadingScreen(percentage, error = false) {
    document.getElementById('loadingBar').style.width = percentage + '%';
    if (error) {
        document.getElementById('loadingText').innerText = 'Failed to load the game.';
        document.getElementById('loadingBar').style.backgroundColor = 'red';
        return;
    }
    document.getElementById('loadingText').innerText = 'Loading... ' + percentage + '%';
}

window.isShowingText = false;

export function showText(position, message, text_color = 'white', background_color = 'black', duration = 2, font_size = 32, is_bold = false) {
    const textElement = document.getElementById(position === 'top' ? 'topText' : 'bottomText');

    if (window.isShowingText) {
        setTimeout(function () {
            showText(position, message, text_color, background_color, duration, font_size, is_bold);
        }, (duration + 0.5) * 1000);
        return;
    }

    window.isShowingText = true;

    const fontWeight = is_bold ? 'bold' : 'normal';
    textElement.innerHTML = `<p style="font-size: ${font_size}px; font-weight: ${fontWeight};">${message}</p>`;
    textElement.style.opacity = '0';
    textElement.style.display = 'block';
    textElement.style.color = text_color;
    textElement.style.backgroundColor = background_color;

    // fade in
    setTimeout(function () {
        textElement.style.opacity = position === 'top' ? '0.75' : '1';
    }, 100);

    // fade out after duration
    setTimeout(function () {
        textElement.style.opacity = '0';
        setTimeout(function () {
            textElement.style.visibility = 'none';
            window.isShowingText = false;
        }, 500);
    }, duration * 1000);
}


function toggleVisibility(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

function showMainMenu() {
    bodyElement.classList.remove('game');
    bodyElement.classList.add('main-menu');
    toggleVisibility('mainMenu', true);
    // toggleVisibility('lbHolder', false);
    // toggleVisibility('leaderboard', false);
    // toggleVisibility('settingsHolder', false);
    // toggleVisibility('settings', false);
}