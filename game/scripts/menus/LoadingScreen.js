
export function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

export function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

export function updateLoadingScreen(percentage, error = false) {
    document.getElementById('loadingBar').style.width = percentage + '%';
    if (error) {
        document.getElementById('loadingText').innerText = 'Failed to load the game.';
        document.getElementById('loadingBar').style.backgroundColor = 'red';
        return;
    }
    document.getElementById('loadingText').innerText = 'Loading... ' + percentage + '%';
}
