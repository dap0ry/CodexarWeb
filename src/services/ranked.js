const API_BASE_URL = 'https://codexarapi.onrender.com/api';
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
        
        // Update Navbar avatar (uses background-image like all other pages)
        document.getElementById('navUsername').textContent = myData.username;
        const navAvatar = document.getElementById('navAvatar');
        if (myData.avatar) {
            navAvatar.style.backgroundImage = `url('${myData.avatar}')`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border = '1px solid var(--accent-cyan)';
            navAvatar.textContent = '';
            // Also update the search view my-ring
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

        // Visual progress to next tier based on dynamic ELO brackets
        const elo = myData.elo || 0;
        let max = 25, remainder = elo, toNext = 25;
        if (elo <= 75) { max = 26; remainder = elo % 26; toNext = 26 - remainder; }
        else if (elo <= 300) { max = 75; remainder = (elo - 76) % 75; toNext = 75 - remainder; }
        else if (elo <= 800) { max = 167; remainder = (elo - 301) % 167; toNext = 167 - remainder; }
        else if (elo <= 1300) { max = 167; remainder = (elo - 801) % 167; toNext = 167 - remainder; }
        else if (elo <= 2000) { max = 234; remainder = (elo - 1301) % 234; toNext = 234 - remainder; }
        else { max = 1; remainder = 1; toNext = 0; }
        
        const pct = toNext === 0 ? 100 : (remainder / max) * 100;
        document.getElementById('progressText').textContent = toNext > 0 ? `${toNext} ELO para subir` : `Campeón`;
        document.getElementById('rankProgressBar').style.width = `${pct}%`;

    } catch (err) {
        console.error(err);
        localStorage.removeItem('access_token');
        window.location.href = 'index.html';
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

    // Update range looking text
    const elo = myData.elo;
    document.getElementById('searchRange').textContent = `${elo - 150} - ${elo + 150} LP`;

    searchInterval = setInterval(() => {
        searchSeconds++;
        updateTimerDisplay();
    }, 1000);

    const token = localStorage.getItem('access_token');
    
    // Loop for long-polling
    while (isSearching) {
        abortController = new AbortController();
        try {
            const res = await fetch(`${API_BASE_URL}/matchmaking/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                signal: abortController.signal
            });
            
            if (!res.ok) throw new Error("Server error");
            const data = await res.json();

            if (data.status === 'matched') {
                clearInterval(searchInterval);
                isSearching = false;
                // Transition effect
                document.getElementById('searchTimer').textContent = "MATCH FOUND!";
                document.getElementById('searchTimer').style.color = "#10b981"; // green
                
                setTimeout(() => {
                    window.location.href = `RankedBattle.html?id=${data.match_id}`;
                }, 1500);
                break;
            }
            // If status is 'timeout', loop will continue
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Search cancelled by user');
                break;
            }
            console.error(err);
            // Wait a bit before retrying on error
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
