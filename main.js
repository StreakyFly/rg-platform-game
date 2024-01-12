import { Game } from './game/scripts/Game.js';

document.querySelector('.loader-container').remove();

const bodyElement = document.body;
// bodyElement.classList.add('main-menu');  // TODO why does this change the menu layout?? This should've already been loaded before

window.startGame = startGame;
window.toggleSettings = toggleSettings;
window.saveSettings = saveSettings;
window.toggleLeaderboard = toggleLeaderboard;
window.pauseToggle = togglePause;

export let pause = false;
let mainMenu = true;

// TODO fix this, if you click too early it shows an error
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.querySelector('.fadein').classList.remove('fadein');
    }, 2000);
});


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
            bodyElement.classList.add('bottomText');
            console.log("Game initialized!");
            updateLoadingScreen(100);
            setTimeout(() => {
                hideLoadingScreen();
            }, 300);
        })
        .catch(error => {
            console.error('Error during game initialization:', error);
            updateLoadingScreen(100, true);
        });
}

// startGame(); // TODO delete


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


export function showTopText(message,
                            text_color = 'white',
                            background_color = 'black',
                            duration = 3, // 1.25
                            font_size = 32,  // 25
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


export function showBottomText(message,
                               text_color = 'white',
                               background_color = 'black',
                               duration = 3,  // 1.5
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

function toggleLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    const lbHolder = document.getElementById('lbHolder');
    const mainMenu = document.getElementById('mainMenu');
    mainMenu.style.display = mainMenu.style.display === 'none' ? 'block' : 'none';
    lbHolder.style.display = lbHolder.style.display === 'none' ? 'block' : 'none';
    leaderboard.style.display = leaderboard.style.display === 'none' ? 'block' : 'none';
    displayLeaderboard();
}

const playerSensitivity = document.getElementById('playerSensitivity');
const muteMusic = document.getElementById('muteMusic');

function toggleSettings() {
    const settingsHolder = document.getElementById('settingsHolder');
    const settings = document.getElementById('settings');
    const mainMenu = document.getElementById('mainMenu');
    mainMenu.style.display = mainMenu.style.display === 'none' ? 'block' : 'none';
    settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
    settingsHolder.style.display = settingsHolder.style.display === 'none' ? 'block' : 'none';

    playerSensitivity.value = getPlayerSesnitivity();
    updateSensitivityValue(document.getElementById('playerSensitivity').value);

    if (getMuteMusic() === "true") {
        muteMusic.checked = true;
    }
}

function saveSettings() {
    showTopText("Settings saved", 'white', 'black', 1.5);

    localStorage.setItem('playerSensitivity', playerSensitivity.value);
    localStorage.setItem('muteMusic', muteMusic.checked);
}

export function getPlayerSesnitivity() {
    if (localStorage.getItem('playerSensitivity') === null) {
        localStorage.setItem('playerSensitivity', 50);
    }
    return localStorage.getItem('playerSensitivity');
}

export function getMuteMusic() {
    if (localStorage.getItem('muteMusic') === null) {
        localStorage.setItem('muteMusic', false);
    }
    return localStorage.getItem('muteMusic');
}

function updateSensitivityValue(value) {
    document.getElementById('sensitivityValue').textContent = value;
}

playerSensitivity.addEventListener('change', function () {
    updateSensitivityValue(this.value);
})