const API_BASE_URL = 'http://127.0.0.1:8000/api';
let myData = null;
let searchInterval = null;
let searchSeconds = 0;
let isSearching = false;
let abortController = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Not authorized");

        myData = await res.json();

        // Update Navbar avatar
        document.getElementById('navUsername').textContent = myData.username;
        const navAvatar = document.getElementById('navAvatar');
        if (myData.avatar) {
            navAvatar.style.backgroundImage = `url('${myData.avatar}')`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border = '1px solid var(--accent-green)';
            navAvatar.textContent = '';
            // Also update search view avatar ring
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
        window.location.href = 'Login.html';
    }

    // Attach listeners
    document.getElementById('findMatchBtn').addEventListener('click', startSearch);
    document.getElementById('cancelSearchBtn').addEventListener('click', cancelSearch);
});

function updateTimerDisplay() {
    const m = Math.floor(searchSeconds / 60);
    const s = searchSeconds % 60;
    document.getElementById('searchTimer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

async function startSearch() {
    isSearching = true;
    searchSeconds = 0;
    updateTimerDisplay();

    // Switch views
    document.getElementById('readyView').classList.remove('active-view');
    document.getElementById('readyView').classList.add('hidden-view');
    document.getElementById('searchingView').classList.remove('hidden-view');
    document.getElementById('searchingView').classList.add('active-view');

    searchInterval = setInterval(() => {
        searchSeconds++;
        updateTimerDisplay();
    }, 1000);

    const token = localStorage.getItem('access_token');

    // Long-polling loop — same endpoint as ranked but with unranked=true flag
    while (isSearching) {
        abortController = new AbortController();
        try {
            const res = await fetch(`${API_BASE_URL}/matchmaking/join?unranked=true`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                signal: abortController.signal
            });

            if (!res.ok) throw new Error("Server error");
            const data = await res.json();

            if (data.status === 'matched') {
                clearInterval(searchInterval);
                isSearching = false;
                document.getElementById('searchTimer').textContent = "¡RIVAL ENCONTRADO!";
                document.getElementById('searchTimer').style.color = "var(--accent-green)";

                setTimeout(() => {
                    window.location.href = `UnrankedBattle.html?id=${data.match_id}`;
                }, 1500);
                break;
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Search cancelled by user');
                break;
            }
            console.error(err);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function cancelSearch() {
    isSearching = false;
    clearInterval(searchInterval);
    if (abortController) {
        abortController.abort();
    }

    // Ping API to leave queue
    const token = localStorage.getItem('access_token');
    try {
        await fetch(`${API_BASE_URL}/matchmaking/leave`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch(e) {}

    // Switch views back
    document.getElementById('searchingView').classList.remove('active-view');
    document.getElementById('searchingView').classList.add('hidden-view');
    document.getElementById('readyView').classList.remove('hidden-view');
    document.getElementById('readyView').classList.add('active-view');
}
