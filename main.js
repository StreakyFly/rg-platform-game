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

window.isShowingBottomText = false;

export function showText(position, message, text_color = 'white', background_color = 'black', duration = 2, font_size = 32, is_bold = false) {
    const textElement = document.getElementById(position === 'top' ? 'topText' : 'bottomText');

    if (position === 'bottom' && window.isShowingBottomText) {
        // delay showing the new message if there's an ongoing bottom animation
        setTimeout(function () {
            showText(position, message, text_color, background_color, duration, font_size, is_bold);
        }, (duration + 0.5) * 1000);
        return;
    }

    if (position === 'bottom') {
        window.isShowingBottomText = true;
    }

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
            if (position === 'bottom') {
                window.isShowingBottomText = false;
            }
        }, 500);
    }, duration * 1000);
}

<<<<<<< Updated upstream


// get player data from localstorage
let playerData = JSON.parse(localStorage.getItem('leaderboardInfo'));

function timeToSeconds(time) {
    const [minutes, seconds] = time.split(':');
    return parseInt(minutes) * 60 + parseInt(seconds);
}

function displayLeaderboard() {
    if (playerData === null) {
        return
    }

    playerData.forEach(player => {
        showPlayerLB(player.name, player.date, player.time, player.deaths);
    });
}

// dodamo igralca na localstorage
export function savePlayerData(player, date, time, deaths) {
    if (playerData === null) {
        localStorage.setItem('leaderboardInfo', JSON.stringify([{ name: player, date: date, time: time, deaths: deaths}]));
        return;
    }
    playerData.push({ name: player, date: date, time: time, deaths: deaths});
    playerData.sort((a, b) => {
        return timeToSeconds(a.time) - timeToSeconds(b.time);
    })
    localStorage.setItem('leaderboardInfo', JSON.stringify(playerData));
    playerData = JSON.parse(localStorage.getItem('leaderboardInfo'));
}

function showPlayerLB(player, date, time, deaths) {
    const table = document.getElementById("lb");
    const row = table.insertRow(-1);
    const playerCell = row.insertCell(0);
    const dateCell = row.insertCell(1);
    const timeCell = row.insertCell(2);
    const deathCell = row.insertCell(3);

    playerCell.innerHTML = player;
    dateCell.innerHTML = date;
    timeCell.innerHTML = time;
    deathCell.innerHTML = deaths;
}

function toggleVisibility(elementId, displayValue='block') {
=======
function toggleVisibility(elementId, show) {
>>>>>>> Stashed changes
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = element.style.display === 'none' ? displayValue : 'none';
    }
}

function showMainMenu() {
    bodyElement.classList.remove('game');
    bodyElement.classList.add('main-menu');
    toggleVisibility('mainMenu', 'flex');
    // toggleVisibility('leaderboard', false);
    // toggleVisibility('lbHolder', false);
    // toggleVisibility('settings', false);
<<<<<<< Updated upstream
    // toggleVisibility('settingsHolder', false);
}

function toggleLeaderboard() {
    toggleVisibility('mainMenu', 'flex');
    toggleVisibility('leaderboard', 'block');
    toggleVisibility('lbHolder', 'block');
    displayLeaderboard();
}

const mouseSensitivity = document.getElementById('mouseSensitivity');
const volume = document.getElementById('volume');
const renderLight = document.getElementById('renderLight');

function toggleSettings() {
    toggleVisibility('mainMenu', 'flex');
    toggleVisibility('settings', 'block');
    toggleVisibility('settingsHolder', 'block');

    mouseSensitivity.value = getMouseSensitivity();
    volume.value = getVolume();
    renderLight.checked = getRenderLight();
    updateMouseSensitivityValue(document.getElementById('mouseSensitivity').value);
    updateVolumeValue(document.getElementById('volume').value);
}

function saveSettings() {
    showTopText("Settings saved", 'white', 'black', 1.5);

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

function updateMouseSensitivityValue(value) {
    document.getElementById('mouseSensitivityValue').textContent = value + " %";
}

mouseSensitivity.addEventListener('input', function () {
    updateMouseSensitivityValue(this.value);
})

function updateVolumeValue(value) {
    document.getElementById('volumeValue').textContent = value + " %";
}

volume.addEventListener('input', function () {
    updateVolumeValue(this.value);
})

// timer
const clock = document.getElementById('time');
export let timeRunning = false;
export let gameFinish = false;

export function startClock() {
    if (timeRunning || gameFinish) return;
    timeRunning = true;
    let seconds = 0;
    let minutes = 0;
    let time = '00:00';
    clock.textContent = time;
    setInterval(function () {
        if (timeRunning && !pause) {
            seconds++;
            if (seconds === 60) {
                seconds = 0;
                minutes++;
            }
            if (minutes === 60) {
                minutes = 0;
            }
            time = (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
            clock.textContent = time;
        }
    }, 1000);
}

export function finishedGame() {
    if (gameFinish) return;
    gameFinish = true
    timeRunning = false;
    const time = clock.textContent;
    const date = new Date().toLocaleDateString();
    const hearts = document.querySelectorAll('.hearts');
    const deaths = 3 - hearts.length;
    const playerName = "testing"
    showBottomText('You completed the game in ' + time + '! Deaths: ' + deaths, 'white', 'black', 5, 32, true);
    // showBottomText('You found all the orbs and managed to escaped in ' + time + '! Deaths: ' + deaths, 'white', 'black', 5, 32, true);

    savePlayerData(playerName, date, time, deaths);
}

export function addInventory() {
    const inventoryCount = document.querySelector('.inventory-slot.iCount');
    if (inventoryCount) {
        inventoryCount.textContent = parseInt(inventoryCount.textContent[0]) + 1 + "x";
    }
}

export function removeInventory() {
    const inventoryCount = document.querySelector('.inventory-slot.iCount');
    if (inventoryCount) {
        inventoryCount.textContent = parseInt(inventoryCount.textContent[0]) - 1 + "x";
    }
=======
>>>>>>> Stashed changes
}