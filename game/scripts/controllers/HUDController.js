import { pause } from '../../../main.js';
import { getDate, savePlayerData } from '../menus/Leaderboard.js';

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
