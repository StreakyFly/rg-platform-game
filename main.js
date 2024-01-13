import { Game } from './game/scripts/Game.js';
import { startClock } from './game/scripts/Stats.js';
import { toggleSettings, saveSettings, getRenderLight } from './game/scripts/Settings.js';
import { toggleLeaderboard } from './game/scripts/LeaderBoard.js';

document.querySelector('.loader-container').remove();

const bodyElement = document.body;

document.getElementById('startGameButton').addEventListener('click', startGame);
document.getElementById('openLeaderboardButton').addEventListener('click', toggleLeaderboard);
document.getElementById('openSettingsButton').addEventListener('click', toggleSettings);
document.getElementById('leaderboardBackButton').addEventListener('click', toggleLeaderboard);
document.getElementById('saveSettingsButton').addEventListener('click', saveSettings);
document.getElementById('settingsBackButton').addEventListener('click', toggleSettings);
document.getElementById('pauseButton').addEventListener('click', togglePause);
// document.getElementById('mainMenuButton').addEventListener('click', showMainMenu);

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
                focusElement(game.canvas);
                startClock();
            }, 300);
        })
        .catch(error => {
            console.error('Error during game initialization:', error);
            updateLoadingScreen(100, true);
        });
}

function focusElement(element) {
    element.addEventListener('click', () => element.requestPointerLock());
    element.click();
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

let topTextAnimationTimer;

export function showTopText(message,
                            textColor = 'white',
                            backgroundColor = 'black',
                            duration = 2,
                            fontSize = 32,
                            isBold = false,
) {
    const topTextElement = document.getElementById('topText');
    const fontWeight = isBold ? 'bold' : 'normal';
    topTextElement.innerHTML = `<p style="font-size: ${fontSize}px; font-weight: ${fontWeight};">${message}</p>`;
    topTextElement.style.opacity = '0.75';
    topTextElement.style.display = 'block';

    topTextElement.style.color = textColor;
    topTextElement.style.backgroundColor = backgroundColor;

    // clear previous timer
    clearTimeout(topTextAnimationTimer);

    // fade out after duration
    topTextAnimationTimer = setTimeout(function () {
        topTextElement.style.opacity = '0';
        setTimeout(function () {
            topTextElement.style.visibility = 'none';
        }, 500);
    }, duration * 1000);
}


let isShowingBottomText = false;

export function showBottomText(message,
                               textColor = 'white',
                               backgroundColor = 'black',
                               duration = 2,
                               fontSize = 32,
                               isBold = false,
) {
    const textElement = document.getElementById('bottomText');

    // check if there is an ongoing animation
    if (isShowingBottomText) {
        // delay showing the new message until the current animation finishes
        setTimeout(function () {
            showBottomText(message, textColor, backgroundColor, duration, fontSize, isBold);
        }, (duration + 0.5) * 1000); // delay for the duration + 0.5 seconds
        return;
    }

    isShowingBottomText = true;

    const fontWeight = isBold ? 'bold' : 'normal';
    textElement.innerHTML = `<p style="font-size: ${fontSize}px; font-weight: ${fontWeight};">${message}</p>`;
    textElement.style.opacity = '0';
    textElement.style.display = 'block';

    textElement.style.color = textColor;
    textElement.style.backgroundColor = backgroundColor;

    // fade in
    setTimeout(function () {
        textElement.style.opacity = '1';
    }, 100);

    // fade out after duration
    textElement.fadeOutTimer = setTimeout(function () {
        textElement.style.opacity = '0';
        textElement.fadeOutTimer = setTimeout(function () {
            textElement.style.visibility = 'none';
            isShowingBottomText = false; // animation is complete
        }, 500);
    }, duration * 1000);
}

export function interactionText(show = false) {
    const textElement = document.getElementById('interactText');
    textElement.style.opacity = '1';
    toggleVisibility('interactText', show);
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
