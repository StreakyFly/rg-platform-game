export function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
}

export function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

export function updateLoading() {
    let i = 0;
    document.getElementById("nameInput").style.display = "block";
    if (i == 0) {
        i = 1;
        var elem = document.getElementById("loadingBar");
        var width = 0;
        var id = setInterval(frame, 80);
        function frame() {
            if (width >= 62) {
                clearInterval(id);
                elem.innerHTML = "100%";
                i = 0;
            } else {
                width += 2;
                elem.style.width = width + "%";
                var displayPercentage = Math.round((width / 62) * 100);
                elem.innerHTML = displayPercentage + "%";
            }
        }
    }
}

export let clickedPlay = false;
export function checkName() {
    const playerName = document.getElementById('name').value;
    
    if (playerName.length <= 0) {
        return false;
    }
    localStorage.setItem('playerName', playerName);
    clickedPlay = true;
    return true;
}