import { Game } from './game/scripts/Game.js';
import * as Color from './game/scripts/Color.js';

document.querySelector('.loader-container').remove();

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
            showTopText("Checkpoint reached!", 5);  // TODO DELETE
            showBottomText("Checkpoint reached!", 5);  // TODO DELETE
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


export function showBottomText(message,
                               duration = 3,
                               text_color = 'white',
                               background_color = 'black',
                               font_size = 32,
                               is_bold = false,
) {
    const textElement = document.getElementById('bottomText');
    const fontWeight = is_bold ? 'bold' : 'normal';
    textElement.innerHTML = `<p style="font-size: ${font_size}px; font-weight: ${fontWeight};">${message}</p>`;
    textElement.style.opacity = '0';
    textElement.style.display = 'block';

    textElement.style.color = text_color;
    textElement.style.backgroundColor = background_color;

    // fade in
    setTimeout(function () {
        textElement.style.opacity = '1';
    }, 100);

    // fade out after duration
    setTimeout(function () {
        textElement.style.opacity = '0';
        setTimeout(function () {
            textElement.style.visibility = 'none';
        }, 500);
    }, duration * 1000);
}


export function showTopText(message,
                            duration = 3,
                            text_color = 'white',
                            background_color = 'black',
                            font_size = 32,
                            is_bold = false,
) {
    const topTextElement = document.getElementById('topText');
    const fontWeight = is_bold ? 'bold' : 'normal';
    topTextElement.innerHTML = `<p style="font-size: ${font_size}px; font-weight: ${fontWeight};">${message}</p>`;
    topTextElement.style.opacity = '0';
    topTextElement.style.display = 'block';

    topTextElement.style.color = text_color;
    topTextElement.style.backgroundColor = background_color;

    // fade in
    setTimeout(function () {
        topTextElement.style.opacity = '0.75';
    }, 100);

    // fade out after duration
    setTimeout(function () {
        topTextElement.style.opacity = '0';
        setTimeout(function () {
            topTextElement.style.visibility = 'none';
        }, 500);
    }, duration * 1000);
}
