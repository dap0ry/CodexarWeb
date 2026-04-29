const API_BASE_URL = 'https://api.codexar.es/api';
let myData = null;
let searchInterval = null;
let searchSeconds = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // If matchmaking is already active, confirm before replacing it
    if (window.isMatchmakingActive && window.isMatchmakingActive()) {
        window.showCancelConfirmModal(
            () => initRankedPage(token),
            () => history.back()
        );
        return;
    }

    initRankedPage(token);
});

async function initRankedPage(token) {
    try {
        const res = await fetch(`${API_BASE_URL}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Not authorized");

        myData = await res.json();

        // Update Navbar
        document.getElementById('navUsername').textContent = myData.username;
        const navAvatar = document.getElementById('navAvatar');
        if (myData.avatar) {
            navAvatar.style.backgroundImage = `url('${myData.avatar}')`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border = '1px solid var(--accent-cyan)';
            navAvatar.textContent = '';
            const myRing = document.getElementById('searchMyAvatar');
            if (myRing) {
                myRing.style.backgroundImage = `url('${myData.avatar}')`;
                myRing.style.backgroundSize = 'cover';
                myRing.style.backgroundPosition = 'center';
                myRing.textContent = '';
            }
        } else {
            navAvatar.textContent = myData.username.charAt(0).toUpperCase();
        }

        // Update Stats
        document.getElementById('myRank').textContent = myData.rank_name || 'Bronce I';
        document.getElementById('myRating').textContent = myData.elo || 0;
        document.getElementById('myStreak').textContent = myData.win_streak || 0;

        // Visual progress to next tier
        const elo = myData.elo || 0;
        let max = 25, remainder = elo, toNext = 25;
        if (elo <= 75)        { max = 26;  remainder = elo % 26;           toNext = 26  - remainder; }
        else if (elo <= 300)  { max = 75;  remainder = (elo - 76) % 75;    toNext = 75  - remainder; }
        else if (elo <= 800)  { max = 167; remainder = (elo - 301) % 167;  toNext = 167 - remainder; }
        else if (elo <= 1300) { max = 167; remainder = (elo - 801) % 167;  toNext = 167 - remainder; }
        else if (elo <= 2000) { max = 234; remainder = (elo - 1301) % 234; toNext = 234 - remainder; }
        else                  { max = 1;   remainder = 1;                   toNext = 0; }

        const pct = toNext === 0 ? 100 : (remainder / max) * 100;
        document.getElementById('progressText').textContent = toNext > 0 ? `${toNext} ELO para subir` : `Campeón`;
        document.getElementById('rankProgressBar').style.width = `${pct}%`;

    } catch (err) {
        console.error(err);
        localStorage.removeItem('access_token');
        window.location.href = '/';
        return;
    }

    document.getElementById('findMatchBtn').addEventListener('click', startSearch);
    document.getElementById('cancelSearchBtn').addEventListener('click', cancelSearch);
}

function updateTimerDisplay() {
    const m = Math.floor(searchSeconds / 60);
    const s = searchSeconds % 60;
    document.getElementById('searchTimer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

function startSearch() {
    searchSeconds = 0;
    updateTimerDisplay();

    // Switch to searching view
    document.getElementById('readyView').classList.remove('active-view');
    document.getElementById('readyView').classList.add('hidden-view');
    document.getElementById('searchingView').classList.remove('hidden-view');
    document.getElementById('searchingView').classList.add('active-view');

    // Update ELO range display
    const elo = myData.elo || 0;
    document.getElementById('searchRange').textContent = `${elo - 150} - ${elo + 150} LP`;

    searchInterval = setInterval(() => {
        searchSeconds++;
        updateTimerDisplay();
    }, 1000);

    // Delegate to global matchmaking manager (WebSocket)
    window.startMatchmaking('ranked');
}

function cancelSearch() {
    clearInterval(searchInterval);
    window.cancelMatchmaking();

    document.getElementById('searchingView').classList.remove('active-view');
    document.getElementById('searchingView').classList.add('hidden-view');
    document.getElementById('readyView').classList.remove('hidden-view');
    document.getElementById('readyView').classList.add('active-view');
}
