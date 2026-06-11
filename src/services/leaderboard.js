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

document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = '/';
});

// ── Players top 10 ──────────────────────────────────────────────

function renderPlayerRow(player, position) {
    const avatarStyle = player.avatar
        ? `background-image:url(${player.avatar});background-size:cover;background-position:center;`
        : '';
    const avatarText = player.avatar ? '' : escHtml(player.username).charAt(0).toUpperCase();
    return `
        <a class="lb-row lb-row-player-cols" href="/perfil?u=${encodeURIComponent(player.username)}">
            <span class="lb-row-pos ${position <= 3 ? 'lb-pos-top' : ''}">${position}</span>
            <span class="lb-row-player">
                <span class="lb-row-avatar" style="${avatarStyle}">${avatarText}</span>
                <span class="lb-row-name">${escHtml(player.username)}</span>
            </span>
            <span class="lb-row-rank">${escHtml(player.rank_name)}</span>
            <span class="lb-row-elo">${player.elo}</span>
            <span class="lb-row-solved">${player.solved}</span>
        </a>`;
}

async function loadPlayers() {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/leaderboard/all?skip=0&limit=10`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        document.getElementById('lbLoadingPlayers').style.display = 'none';
        const list = document.getElementById('lbPlayerList');
        data.players.slice(0, 10).forEach((p, i) => {
            list.insertAdjacentHTML('beforeend', renderPlayerRow(p, i + 1));
        });
    } catch {
        document.getElementById('lbLoadingPlayers').textContent = 'Error cargando clasificación.';
    }
}

// ── Teams top 10 ────────────────────────────────────────────────

function renderTeamRow(team, position) {
    const logoStyle = team.photo_url
        ? `background-image:url(${team.photo_url});background-size:cover;background-position:center;`
        : '';
    const logoText = team.photo_url ? '' : escHtml(team.name).charAt(0).toUpperCase();
    return `
        <a class="lb-row lb-row-team-cols" href="/equipo?t=${encodeURIComponent(team.name)}">
            <span class="lb-row-pos ${position <= 3 ? 'lb-pos-top' : ''}">${position}</span>
            <span class="lb-row-player">
                <span class="lb-row-avatar" style="${logoStyle}">${logoText}</span>
                <span class="lb-row-name">${escHtml(team.name)}</span>
            </span>
            <span class="lb-row-members">${team.member_count}</span>
            <span class="lb-row-solved">${team.total_solved}</span>
        </a>`;
}

async function loadTeams() {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/teams/leaderboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const teams = await res.json();
        document.getElementById('lbLoadingTeams').style.display = 'none';
        const list = document.getElementById('lbTeamList');
        teams.slice(0, 10).forEach((t, i) => {
            list.insertAdjacentHTML('beforeend', renderTeamRow(t, i + 1));
        });
    } catch {
        document.getElementById('lbLoadingTeams').textContent = 'Error cargando equipos.';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const ok = await initNavbar();
    if (!ok) return;
    loadPlayers();
    loadTeams();
});
