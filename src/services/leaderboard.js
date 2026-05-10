const API_BASE = 'https://api.codexar.es/api';

function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function initNavbar() {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return false; }

    const userRes = await fetch(`${API_BASE}/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!userRes.ok) { window.location.href = '/login'; return false; }

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
    return true;
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = '/';
});

// ── Full player list with pagination ──────────────────────────
let lbSkip = 0;
let lbTotal = 0;
const LB_PAGE = 20;

function renderPlayerRow(player, position) {
    const avatarStyle = player.avatar
        ? `background-image:url(${player.avatar});background-size:cover;background-position:center;`
        : '';
    const avatarText = player.avatar ? '' : escHtml(player.username).charAt(0).toUpperCase();

    return `
        <a class="lb-row" href="/perfil?u=${encodeURIComponent(player.username)}">
            <span class="lb-row-pos ${position <= 3 ? 'lb-pos-top' : ''}">${position}</span>
            <span class="lb-row-player">
                <span class="lb-row-avatar" style="${avatarStyle}">${avatarText}</span>
                <span class="lb-row-name">${escHtml(player.username)}</span>
            </span>
            <span class="lb-row-rank">${escHtml(player.rank_name)}</span>
            <span class="lb-row-elo">${player.elo}</span>
            <span class="lb-row-solved">${player.solved}</span>
        </a>
    `;
}

async function loadPlayerList() {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE}/leaderboard/all?skip=${lbSkip}&limit=${LB_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        document.getElementById('lbLoading').textContent = 'Error cargando clasificación.';
        return;
    }
    const data = await res.json();
    lbTotal = data.total;

    document.getElementById('lbLoading').style.display = 'none';

    const list = document.getElementById('lbPlayerList');
    data.players.forEach((p, i) => {
        list.insertAdjacentHTML('beforeend', renderPlayerRow(p, lbSkip + i + 1));
    });

    lbSkip += data.players.length;

    const btn = document.getElementById('lbLoadMore');
    if (lbSkip < lbTotal) {
        btn.classList.remove('hidden');
        btn.textContent = `Cargar más · ${lbTotal - lbSkip} restantes`;
    } else {
        btn.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const ok = await initNavbar();
    if (!ok) return;
    await loadPlayerList();
    document.getElementById('lbLoadMore').addEventListener('click', loadPlayerList);
});
