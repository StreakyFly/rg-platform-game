import { Game } from './game/scripts/Game.js';

document.querySelector('.loader-container').remove();

//canvas

const bodyElement = document.body;
// bodyElement.classList.add('main-menu');  // TODO why does this change the menu layout?? This should've already been loaded before

window.startGame = startGame;
window.openSettings = openSettings;
window.openMap = openMap;
window.pauseToggle = togglePause;

export let pause = false;
let mainMenu = true;

document.addEventListener('keydown', function (event) {
    if (event.key === 'p' && !mainMenu) {
        togglePause();
    }
});

document.addEventListener('click', function (event) {
    if (event.target.id !== 'pauseMenu' && pause) {
        togglePause();
    }
});

function togglePause() {
    var pauseMenu = document.getElementById('pauseMenu');
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
    updateLoadingScreen(5);
    mainMenu = false;

    // Remove main menu styles and add game styles
    bodyElement.classList.remove('main-menu');
    bodyElement.classList.add('game');

    // bodyElement.classList.remove('game');
    // bodyElement.classList.add('main-menu');  // TODO FIX: this shouldn't change the menu LAYOUTTTTTTTTTTTTTTTT
    updateLoadingScreen(45);

    const game = new Game();
    game.initialize()
        .then(() => {
            setTimeout(() => {
                updateLoadingScreen(80);
            }, 1000);
            console.log("Game initialized!");
            updateLoadingScreen(100);
            setTimeout(() => {
                hideLoadingScreen();
            }, 300);
        })
        .catch(error => {
            console.error('Error during game initialization:', error);
        });
}

export function showTopText(message, duration) {
    var topTextElement = document.getElementById('topText');
    topTextElement.innerHTML = `<p>${message}</p>`;
    topTextElement.style.opacity = '0';
    topTextElement.style.display = 'block';

    // Fade in
    setTimeout(function () {
        topTextElement.style.opacity = '1';
    }, 100);

    // Fade out after duration
    setTimeout(function () {
        topTextElement.style.opacity = '0';
        setTimeout(function () {
            topTextElement.style.display = 'none';
        }, 500);
    }, duration * 1000);
}


function openSettings() {
    console.log("Open Settings function has not been written yet!");

}

function openMap() {
    console.log("Open Map function has not been written yet!");
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function updateLoadingScreen(percentage) {
    document.getElementById('loadingBar').style.width = percentage + '%';
    document.getElementById('loadingText').innerText = 'Loading... ' + percentage + '%';
}