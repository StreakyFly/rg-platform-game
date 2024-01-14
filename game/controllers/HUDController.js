import { pause } from '../../main.js';
import { getDate } from '../scripts/menus/Leaderboard.js';

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

export function finishedGame(deaths) {
    if (gameFinish) return;
    gameFinish = true
    timeRunning = false;
    const time = clock.textContent;
    const date = getDate();
    const playerName = "testing"
    showBottomText('You completed the game in ' + time + '! Deaths: ' + deaths, 'white', 'black', 5, 32, true);
    // showBottomText('You found all the orbs and managed to escaped in ' + time + '! Deaths: ' + deaths, 'white', 'black', 5, 32, true);

    savePlayerData(playerName, date, time, deaths);
}
