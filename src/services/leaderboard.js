const API_BASE = 'https://codexarapi.onrender.com/api';

const LANG_ICONS = {
    "C++": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
    "Python": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    "Java": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    "Go": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
    "C#": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg"
};

const MEDALS = ['🥇', '🥈', '🥉', '', ''];
const RANK_CLASS = ['rank-1', 'rank-2', 'rank-3', 'rank-4', 'rank-5'];

function buildPlayerCard(player, rank) {
    const rankClass = RANK_CLASS[rank] || '';
    const medal = MEDALS[rank] || '';

    const langIconsHtml = (player.languages || [])
        .filter(l => LANG_ICONS[l])
        .map(l => `<img src="${LANG_ICONS[l]}" class="lb-lang-icon" title="${l}" alt="${l}">`)
        .join('');

    const avatarStyle = player.avatar
        ? `background-image:url(${player.avatar}); background-size:cover; background-position:center;`
        : '';
    const avatarText = player.avatar ? '' : (player.username || '?').charAt(0).toUpperCase();

    // Helper function for HTML escaping inside buildPlayerCard
    const escHtml = (unsafe) => {
        if (!unsafe) return '';
        return unsafe.toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    return `
        <div class="player-card ${rankClass}" style="cursor:pointer;" onclick="window.location.href='ProfileView.html?u=${encodeURIComponent(player.username)}'">
            <div class="rank-watermark">POSICIÓN ${rank + 1}</div>
            <div class="rank-number">${rank + 1}</div>
            <div class="lb-avatar" style="${avatarStyle}">${avatarText}</div>
            <div class="lb-username">${escHtml(player.username)}${medal ? `<span class="lb-medal">${medal}</span>` : ''}</div>
            ${player.description ? `<div class="lb-description">"${escHtml(player.description)}"</div>` : ''}
            <div class="lb-score">
                <div style="width:100%;">
                    <span style="color:var(--accent-cyan); font-weight:bold;">${player.rank_name || 'Bronce I'}</span> &bull; ${player.score} ELO
                </div>
                <div style="font-size:0.85rem; margin-top:5px; color:var(--text-muted);">
                    ✓ ${player.solved} ejercicio${player.solved !== 1 ? 's' : ''} resuelto${player.solved !== 1 ? 's' : ''}
                </div>
            </div>
            ${langIconsHtml ? `<div class="lb-langs">${langIconsHtml}</div>` : ''}
        </div>
    `;
}

function buildEmptyFace(rank) {
    return `
        <div class="face-empty" style="margin-top: 40px;">
            <div style="font-size:2rem; opacity:0.2;">?</div>
            <div>Posición ${rank + 1} libre</div>
        </div>
    `;
}

async function initLeaderboard() {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    try {
        // Navbar
        const userRes = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userRes.ok) throw new Error('Auth Fault');
        const user = await userRes.json();

        document.getElementById('navUsername').textContent = user.username;
        const navAvatar = document.getElementById('navAvatar');
        if (user.avatar) {
            navAvatar.style.backgroundImage = `url(${user.avatar})`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border = '1px solid var(--accent-cyan)';
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = user.username.charAt(0).toUpperCase();
        }

        // Leaderboard
        const lbRes = await fetch(`${API_BASE}/leaderboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!lbRes.ok) throw new Error('LB Fault');
        const players = await lbRes.json();

        // Populate podium spots  
        const spotMap = ['spot-1', 'spot-2', 'spot-3', 'spot-4', 'spot-5'];
        spotMap.forEach((spotId, i) => {
            const el = document.getElementById(spotId);
            if (!el) return;
            if (players[i]) {
                el.innerHTML = buildPlayerCard(players[i], i);
            } else {
                el.innerHTML = buildEmptyFace(i);
            }
        });

        // Show podium, hide loading
        document.getElementById('podiumContainer').style.opacity = '1';
        document.getElementById('lbLoading').style.display = 'none';

    } catch (err) {
        console.error('Leaderboard error:', err);
        if (err.message === 'Auth Fault') window.location.href = 'Login.html';
        document.getElementById('lbLoading').textContent = 'Error cargando clasificación.';
        document.getElementById('lbLoading').style.display = 'block';
    }
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
});

function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
}

// Init
document.getElementById('podiumContainer').style.opacity = '0';
document.getElementById('podiumContainer').style.transition = 'opacity 0.5s';
document.getElementById('lbLoading').style.display = 'block';
document.addEventListener('DOMContentLoaded', async () => {
    await initLeaderboard();
    document.getElementById('podiumContainer').style.opacity = '1';
});
