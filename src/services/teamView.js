const TV_API = 'https://codexarapi.onrender.com/api';

function token() { return localStorage.getItem('access_token'); }

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function initTeamView() {
    const params   = new URLSearchParams(window.location.search);
    const teamName = params.get('t');
    if (!teamName) { showError(); return; }

    // Navbar (optional — works without login too)
    const t = token();
    if (t) {
        const res = await fetch(`${TV_API}/user/me`, { headers: { 'Authorization': `Bearer ${t}` } });
        if (res.ok) {
            const user = await res.json();
            const navUsername = document.getElementById('navUsername');
            const navAvatar   = document.getElementById('navAvatar');
            if (navUsername) navUsername.textContent = user.username;
            if (navAvatar) {
                if (user.avatar) {
                    navAvatar.style.backgroundImage    = `url(${user.avatar})`;
                    navAvatar.style.backgroundSize     = 'cover';
                    navAvatar.style.backgroundPosition = 'center';
                } else {
                    navAvatar.textContent = user.username.charAt(0).toUpperCase();
                }
            }
            document.getElementById('logoutBtn')?.addEventListener('click', e => {
                e.preventDefault();
                localStorage.removeItem('access_token');
                window.location.href = 'index.html';
            });
        }
    }

    try {
        const res = await fetch(`${TV_API}/teams/public/${encodeURIComponent(teamName)}`);
        if (!res.ok) { showError(); return; }
        const team = await res.json();
        renderTeam(team);
    } catch {
        showError();
    }
}

function showError() {
    document.getElementById('tvLoading').classList.add('hidden');
    document.getElementById('tvError').classList.remove('hidden');
}

function renderTeam(team) {
    document.getElementById('tvLoading').classList.add('hidden');
    document.getElementById('tvContent').classList.remove('hidden');

    document.title = `Codexar — ${team.name}`;

    // Banner (use photo_url blurred as banner)
    if (team.photo_url) {
        const banner = document.getElementById('tvBanner');
        banner.style.backgroundImage = `url(${team.photo_url})`;
        banner.classList.remove('hidden');
    }

    // Team photo
    const photo = document.getElementById('tvPhoto');
    if (team.photo_url) {
        photo.style.backgroundImage = `url(${team.photo_url})`;
    } else {
        photo.textContent = (team.name || '?').charAt(0).toUpperCase();
    }

    // Header
    document.getElementById('tvName').textContent    = team.name;
    document.getElementById('tvDesc').textContent    = team.description || '';
    document.getElementById('tvAvgEloLabel').textContent = `${team.avg_elo ?? 0} ELO prom.`;

    // Left mini stats
    document.getElementById('tvMiniSolved').textContent  = team.total_solved ?? 0;
    document.getElementById('tvMiniElo').textContent     = team.highest_elo ?? 0;
    document.getElementById('tvMiniMembers').textContent = team.member_count ?? 0;

    // Bottom stat cards
    document.getElementById('tvStatTotalSolved').textContent = team.total_solved ?? 0;
    const members = team.members_info || [];
    const avgSolved = members.length
        ? Math.round(members.reduce((s, m) => s + m.solved, 0) / members.length)
        : 0;
    document.getElementById('tvStatAvgSolved').textContent  = avgSolved;
    document.getElementById('tvStatHighestElo').textContent = team.highest_elo ?? 0;
    document.getElementById('tvStatAvgElo').textContent     = team.avg_elo ?? 0;
    document.getElementById('tvStatMembers').textContent    = team.member_count ?? 0;
    const leader = members.find(m => m.is_owner);
    document.getElementById('tvStatLeader').textContent     = leader ? leader.username : '—';

    renderPodium(members.slice(0, 3));
    renderMembersList(members);

    if (members.length <= 3) {
        document.getElementById('tvAllSection').style.display = 'none';
    }
}

const RANK_CLASSES = ['rank-1', 'rank-2', 'rank-3'];
const RANK_LABELS  = ['#1', '#2', '#3'];

function renderPodium(top3) {
    const container = document.getElementById('tvPodium');
    if (!top3.length) {
        container.innerHTML = '<div style="color:rgba(114,114,138,0.45);font-family:\'JetBrains Mono\',monospace;font-size:0.72rem">Sin miembros</div>';
        return;
    }
    container.innerHTML = top3.map((m, i) => {
        const initials    = m.username.charAt(0).toUpperCase();
        const avatarStyle = m.avatar ? `style="background-image:url(${m.avatar})"` : '';
        const ownerBadge  = m.is_owner ? '<div class="tv-podium-owner">Líder</div>' : '';
        return `
            <div class="tv-podium-card ${RANK_CLASSES[i]}">
                <div class="tv-podium-rank">${RANK_LABELS[i]}</div>
                <div class="tv-podium-avatar" ${avatarStyle}>${m.avatar ? '' : initials}</div>
                <a href="ProfileView.html?u=${encodeURIComponent(m.username)}" class="tv-podium-username">${esc(m.username)}</a>
                ${ownerBadge}
                <div class="tv-podium-stats">
                    <div class="tv-podium-stat">
                        <span class="tv-podium-stat-val">${m.elo}</span>
                        <span class="tv-podium-stat-lbl">ELO</span>
                    </div>
                    <div class="tv-podium-stat">
                        <span class="tv-podium-stat-val">${m.solved}</span>
                        <span class="tv-podium-stat-lbl">Resueltos</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderMembersList(members) {
    const list = document.getElementById('tvMembersList');
    list.innerHTML = members.map((m, i) => {
        const initials    = m.username.charAt(0).toUpperCase();
        const avatarStyle = m.avatar ? `style="background-image:url(${m.avatar})"` : '';
        const ownerBadge  = m.is_owner ? '<span class="tv-member-owner">Líder</span>' : '';
        return `
            <a href="ProfileView.html?u=${encodeURIComponent(m.username)}" class="tv-member-row">
                <div class="tv-member-pos">${i + 1}</div>
                <div class="tv-member-avatar" ${avatarStyle}>${m.avatar ? '' : initials}</div>
                <div class="tv-member-name">${esc(m.username)}</div>
                ${ownerBadge}
                <div class="tv-member-elo">${m.elo} ELO</div>
                <div class="tv-member-solved">${m.solved} resueltos</div>
            </a>
        `;
    }).join('');
}

window.addEventListener('DOMContentLoaded', initTeamView);
