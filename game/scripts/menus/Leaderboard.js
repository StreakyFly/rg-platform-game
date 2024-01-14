
function timeToSeconds(time) {
    const [minutes, seconds] = time.split(':');
    return parseInt(minutes) * 60 + parseInt(seconds);
}

function displayLeaderboard() {
    let playerData = JSON.parse(localStorage.getItem('leaderboardInfo'));
    if (playerData === null) {
        return
    }

    let maxDisplay = 4;
    let index = 0;
    playerData.forEach(player => {
        if (index >= maxDisplay) {
            return;
        }
        index++;
        showPlayerLB(player.name, player.date, player.time, player.deaths);
    });
}

// dodamo igralca v localstorage
export function savePlayerData(player, date, time, deaths) {
    let playerData = JSON.parse(localStorage.getItem('leaderboardInfo'));
    if (playerData === null) {
        localStorage.setItem('leaderboardInfo', JSON.stringify([{ name: player, date: date, time: time, deaths: deaths }]));
        return;
    }
    playerData.push({ name: player, date: date, time: time, deaths: deaths });
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


export function toggleLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    const lbHolder = document.getElementById('lbHolder');
    const mainMenu = document.getElementById('main-menu');
    mainMenu.style.display = mainMenu.style.display === 'none' ? 'flex' : 'none';
    lbHolder.style.display = lbHolder.style.display === 'none' ? 'block' : 'none';
    leaderboard.style.display = leaderboard.style.display === 'none' ? 'block' : 'none';
    if (leaderboard.style.display === 'block') {
        displayLeaderboard();
    } else {
        const table = document.getElementById("lb");
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }
    }
}

export function getDate() {
    let date = new Date();
    return date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear();
}
