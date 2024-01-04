import { Game } from './game/scripts/Game.js';

document.querySelector('.loader-container').remove();

//canvas

const bodyElement = document.body;
// bodyElement.classList.add('main-menu');  // TODO why does this change the menu layout?? This should've already been loaded before

window.startGame = startGame;
window.openSettings = openSettings;
window.openMap = openMap;

export let pause = false;
document.addEventListener("keydown", ({key}) => {
    if (key === "p") {
        pause = !pause;
        console.log("pause")
    }
})

function startGame() {
    showLoadingScreen();

    // Remove main menu styles and add game styles
    bodyElement.classList.remove('main-menu');
    bodyElement.classList.add('game');

    // bodyElement.classList.remove('game');
    // bodyElement.classList.add('main-menu');  // TODO FIX: this shouldn't change the menu LAYOUTTTTTTTTTTTTTTTT

    const game = new Game();
    game.initialize()
        .then(() => {
            console.log("Game initialized!");
            hideLoadingScreen();
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
    // TODO show random image/loading screen with a tip
}

function hideLoadingScreen() {
    // TODO hide loading screen
}