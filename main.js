import { Game } from './game/scripts/Game.js';
import { startClock } from './game/scripts/Stats.js';
import {
    toggleSettings,
    saveSettings,
    getRenderLight,
    getMouseSensitivity,
    getVolume,
} from './game/scripts/Settings.js';
import { toggleLeaderboard } from './game/scripts/LeaderBoard.js';

document.querySelector('.loader-container').remove();

const bodyElement = document.body;

document.getElementById('startGameButton').addEventListener('click', startGame);
document.getElementById('openLeaderboardButton').addEventListener('click', toggleLeaderboard);
document.getElementById('openSettingsButton').addEventListener('click', toggleSettings);
document.getElementById('leaderboardBackButton').addEventListener('click', toggleLeaderboard);
document.getElementById('saveSettingsButton').addEventListener('click', saveSettings);
document.getElementById('settingsBackButton').addEventListener('click', toggleSettings);
document.addEventListener('keydown', handleKeyDown);


let gameCanvas = null;

function startGame() {
    showLoadingScreen();
    isMainMenuActive = false;
    updateLoadingScreen(7);

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
                gameCanvas = game.canvas;
                startClock();
                toggleVisibility('menu-container')  // TODO move this somewhere better
            }, 300);
        })
        .catch(error => {
            console.error('Error during game initialization:', error);
            updateLoadingScreen(100, true);
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
    topTextElement.innerHTML = `<p style="color: ${textColor}; font-size: ${fontSize}px; font-weight: ${fontWeight};">${message}</p>`;
    topTextElement.style.opacity = '0.75';
    topTextElement.style.display = 'block';
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
    textElement.innerHTML = `<p style="color: ${textColor}; font-size: ${fontSize}px; font-weight: ${fontWeight};">${message}</p>`;
    textElement.style.opacity = '0';
    textElement.style.display = 'block';
    textElement.style.backgroundColor = backgroundColor;

    console.log(textElement);


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
    toggleVisibility('interactText', 'block', show);
}

export function toggleVisibility(elementId, displayValue='block', show=null) {
    const element = document.getElementById(elementId);

    if (element) {
        if (show !== null) {
            element.style.display = show ? displayValue : 'none';
        } else {
            element.style.display = element.style.display === 'none' ? displayValue : 'none';
        }
    }
}
