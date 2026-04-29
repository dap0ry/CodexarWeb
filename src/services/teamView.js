const TV_API = 'https://api.codexar.es/api';

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

    // Navbar (optional)
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
                window.location.href = '/';
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

    // Full-page background overlay (same as teams.html)
    if (team.background_url) {
        const overlay = document.getElementById('tvBgOverlay');
        overlay.style.backgroundImage = `url(${team.background_url})`;
    }

    // Banner strip (background_url if available, else photo)
    const bannerSrc = team.background_url || team.photo_url;
    if (bannerSrc) {
        const banner = document.getElementById('tvBanner');
        banner.style.backgroundImage = `url(${bannerSrc})`;
        banner.classList.remove('hidden');
    }

    // Team photo
    const photo = document.getElementById('tvPhoto');
    if (team.photo_url) {
        photo.style.backgroundImage = `url(${team.photo_url})`;
    } else {
        photo.textContent = (team.name || '?').charAt(0).toUpperCase();
    }

    document.getElementById('tvName').textContent        = team.name;
    document.getElementById('tvDesc').textContent        = team.description || '';
    document.getElementById('tvMemberCount').textContent = `${team.member_count ?? 0} miembro${(team.member_count ?? 0) !== 1 ? 's' : ''}`;

    document.getElementById('tvStatMembers').textContent    = team.member_count ?? 0;
    document.getElementById('tvStatTotalSolved').textContent = team.total_solved ?? 0;
    document.getElementById('tvStatHighestElo').textContent = team.highest_elo ?? 0;
    document.getElementById('tvStatAvgElo').textContent     = team.avg_elo ?? 0;

    renderMembersGrid(team.members_info || []);
}

function renderMembersGrid(members) {
    const grid = document.getElementById('tvMembersGrid');
    if (!members.length) {
        grid.innerHTML = '<div class="tm-empty">Sin miembros</div>';
        return;
    }
    grid.innerHTML = members.map(m => {
        const initials    = m.username.charAt(0).toUpperCase();
        const avatarStyle = m.avatar ? `style="background-image:url(${esc(m.avatar)})"` : '';
        const captainBadge = m.is_owner ? '<div class="tm-mc-captain">CAPITÁN</div>' : '';
        return `
            <a href="/perfil?u=${encodeURIComponent(m.username)}" class="tm-member-card${m.is_owner ? ' is-owner' : ''}">
                ${captainBadge}
                <div class="tm-mc-avatar" ${avatarStyle}>${m.avatar ? '' : initials}</div>
                <div class="tm-mc-name">${esc(m.username)}</div>
            </a>
        `;
    }).join('');
}

window.addEventListener('DOMContentLoaded', initTeamView);
