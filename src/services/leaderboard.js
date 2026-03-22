const API_BASE = 'http://127.0.0.1:8000/api';

const LANG_ICONS = {
    "C++": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
    "Python": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    "Java": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    "Go": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
    "C#": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg"
};

const MEDALS = ['🥇', '🥈', '🥉', '', ''];
const RANK_CLASS = ['rank-1', 'rank-2', 'rank-3', 'rank-4', 'rank-5'];

// Cube face rotation map: index → Y/X rotation in degrees
const FACE_ROTATIONS = [
    'translateZ(-180px) rotateY(0deg)',      // front  → face-1
    'translateZ(-180px) rotateY(-90deg)',     // right  → face-2
    'translateZ(-180px) rotateY(180deg)',     // back   → face-3
    'translateZ(-180px) rotateY(90deg)',      // left   → face-4
    'translateZ(-180px) rotateX(-90deg)',     // top    → face-5
];

// Each face index maps to a face element by css class
const FACE_IDS = ['face-1', 'face-2', 'face-3', 'face-4', 'face-5'];

let currentFace = 0;
let totalFaces = 5;

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

    return `
        <div class="player-card ${rankClass}">
            <div class="rank-watermark">POSICIÓN ${rank + 1}</div>
            <div class="rank-number">${rank + 1}</div>
            <div class="lb-avatar" style="${avatarStyle}">${avatarText}</div>
            <div class="lb-username">${escHtml(player.username)}${medal ? `<span class="lb-medal">${medal}</span>` : ''}</div>
            ${player.description ? `<div class="lb-description">"${escHtml(player.description)}"</div>` : ''}
            <div class="lb-score">
                <span style="color:var(--accent-cyan); font-weight:bold;">${player.rank_name || 'Bronce I'}</span> &bull; ${player.score} ELO
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
        <div class="face-empty">
            <div style="font-size:2rem; opacity:0.2;">?</div>
            <div>Posición ${rank + 1} libre</div>
        </div>
    `;
}

function rotateTo(faceIndex) {
    const cube = document.getElementById('cube');
    cube.style.transform = FACE_ROTATIONS[faceIndex];

    // Update dots
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === faceIndex);
    });

    currentFace = faceIndex;
}

function nextFace() {
    rotateTo((currentFace + 1) % totalFaces);
}

function prevFace() {
    rotateTo((currentFace - 1 + totalFaces) % totalFaces);
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

        // Populate cube faces  
        // face-1 = front = rank 1, face-2 = right = rank 2, etc.
        const faceMap = ['face-1', 'face-2', 'face-3', 'face-4', 'face-5'];
        faceMap.forEach((faceId, i) => {
            const el = document.getElementById(faceId);
            if (!el) return;
            if (players[i]) {
                el.innerHTML = buildPlayerCard(players[i], i);
            } else {
                el.innerHTML = buildEmptyFace(i);
            }
        });

        // Show cube, hide loading
        document.getElementById('cubeScene').style.opacity = '1';
        document.getElementById('lbLoading').style.display = 'none';

    } catch (err) {
        console.error('Leaderboard error:', err);
        if (err.message === 'Auth Fault') window.location.href = 'Login.html';
        document.getElementById('lbLoading').textContent = 'Error cargando clasificación.';
        document.getElementById('lbLoading').style.display = 'block';
    }
}

// Controls
document.getElementById('btnNext').addEventListener('click', nextFace);
document.getElementById('btnPrev').addEventListener('click', prevFace);

document.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => {
        const faceIdx = parseInt(dot.dataset.face);
        rotateTo(faceIdx);
    });
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextFace();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevFace();
});



// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = 'Login.html';
});

function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Init
document.getElementById('cubeScene').style.opacity = '0';
document.getElementById('cubeScene').style.transition = 'opacity 0.5s';
document.getElementById('lbLoading').style.display = 'block';
document.addEventListener('DOMContentLoaded', async () => {
    await initLeaderboard();
    document.getElementById('cubeScene').style.opacity = '1';
});
