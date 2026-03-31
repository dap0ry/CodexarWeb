const API_BASE_URL = 'http://localhost:8000/api';
let myData = null;
let searchInterval = null;
let searchSeconds = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    // If matchmaking is already active, confirm before replacing it
    if (window.isMatchmakingActive && window.isMatchmakingActive()) {
        window.showCancelConfirmModal(
            () => initUnrankedPage(token),
            () => history.back()
        );
        return;
    }

    initUnrankedPage(token);
});

async function initUnrankedPage(token) {
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
            navAvatar.style.border = '1px solid var(--accent-green)';
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

    } catch (err) {
        console.error(err);
        localStorage.removeItem('access_token');
        window.location.href = 'index.html';
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

    searchInterval = setInterval(() => {
        searchSeconds++;
        updateTimerDisplay();
    }, 1000);

    // Delegate to global matchmaking manager (WebSocket)
    window.startMatchmaking('unranked');
}

function cancelSearch() {
    clearInterval(searchInterval);
    window.cancelMatchmaking();

    document.getElementById('searchingView').classList.remove('active-view');
    document.getElementById('searchingView').classList.add('hidden-view');
    document.getElementById('readyView').classList.remove('hidden-view');
    document.getElementById('readyView').classList.add('active-view');
}
