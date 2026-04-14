const API = 'https://codexarapi.onrender.com/api';

let currentUser = null;
let myTeamData = null;

function token() { return localStorage.getItem('access_token'); }

function authHeaders() {
    return { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' };
}

// ── Escape HTML ──────────────────────────────────────────────────────────────
function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function initTeams() {
    if (!token()) { window.location.href = 'Login.html'; return; }

    // Load current user
    const res = await fetch(`${API}/user/me`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if (!res.ok) { window.location.href = 'Login.html'; return; }
    currentUser = await res.json();

    // Populate navbar
    const navUser = document.getElementById('navUsername');
    const navAvatar = document.getElementById('navAvatar');
    if (navUser) navUser.textContent = currentUser.username;
    if (navAvatar) {
        if (currentUser.avatar) {
            navAvatar.style.backgroundImage = `url(${currentUser.avatar})`;
            navAvatar.style.backgroundSize = 'cover'; navAvatar.style.backgroundPosition = 'center';
        } else {
            navAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        }
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', e => {
        e.preventDefault(); localStorage.removeItem('access_token'); window.location.href = 'index.html';
    });

    await Promise.all([loadMyTeam(), loadAllTeams(), loadPendingInvites()]);
}

// ── My Team ───────────────────────────────────────────────────────────────────
async function loadMyTeam() {
    const loading   = document.getElementById('teamLoading');
    const noTeam    = document.getElementById('noTeamState');
    const myCard    = document.getElementById('myTeamCard');
    const invitePanel = document.getElementById('invitePanel');
    const createPanel = document.getElementById('createTeamPanel');

    try {
        const res = await fetch(`${API}/teams/mine`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();

        loading.style.display = 'none';

        if (!data) {
            // No team
            noTeam.style.display = 'flex';
            createPanel.style.display = 'block';
            document.getElementById('createTeamBtn').onclick = createTeam;
            return;
        }

        myTeamData = data;
        myCard.style.display = 'flex';

        // Photo
        const photo = document.getElementById('myTeamPhoto');
        if (data.photo_url) {
            photo.innerHTML = `<img src="${esc(data.photo_url)}" alt="Team photo" onerror="this.parentNode.textContent='🛡'">`;
        }

        document.getElementById('myTeamName').textContent = data.name;
        document.getElementById('myTeamMemberCount').textContent = (data.members_info || []).length;
        document.getElementById('myTeamAvgElo').textContent = data.avg_elo || '—';
        document.getElementById('myTeamAvgSolved').textContent = data.avg_solved || '—';

        const isOwner = data.owner === currentUser.username;
        document.getElementById('myTeamRole').textContent = isOwner ? 'CAPITÁN' : 'MIEMBRO';

        // Members list
        renderMembers(data.members_info || [], data.id, isOwner);

        // Owner invite panel
        if (isOwner) invitePanel.style.display = 'block';
        document.getElementById('inviteBtn').onclick = inviteMember;

        // Leave btn
        const leaveBtn = document.getElementById('leaveTeamBtn');
        leaveBtn.textContent = isOwner ? 'Disolver' : 'Abandonar';
        leaveBtn.onclick = () => leaveTeam(data.id, isOwner);

    } catch (err) {
        loading.style.display = 'none';
        noTeam.style.display = 'flex';
        createPanel.style.display = 'block';
        document.getElementById('createTeamBtn').onclick = createTeam;
    }
}

function renderMembers(members, teamId, isOwner) {
    const list = document.getElementById('memberList');
    list.innerHTML = '';
    members.forEach(m => {
        const div = document.createElement('div');
        div.className = 'member-item';
        const avatarStyle = m.avatar
            ? `style="background-image:url(${esc(m.avatar)});background-size:cover;background-position:center;"`
            : '';
        div.innerHTML = `
            <div class="member-avatar" ${avatarStyle}>${m.avatar ? '' : esc(m.username.charAt(0).toUpperCase())}</div>
            <div class="member-info">
                <div class="member-name">${esc(m.username)}</div>
                <div class="member-elo">ELO ${m.elo}</div>
            </div>
            ${m.is_owner ? '<span class="member-badge-owner">CAP</span>' : ''}
            ${isOwner && !m.is_owner ? `<button class="btn-kick" data-user="${esc(m.username)}" data-team="${teamId}" title="Expulsar">✕</button>` : ''}
        `;
        list.appendChild(div);
    });

    // Kick buttons
    list.querySelectorAll('.btn-kick').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(`¿Expulsar a ${btn.dataset.user}?`)) return;
            const r = await fetch(`${API}/teams/${btn.dataset.team}/members/${btn.dataset.user}`, {
                method: 'DELETE', headers: authHeaders()
            });
            const d = await r.json();
            if (r.ok) await loadMyTeam();
            else alert(d.detail || 'Error');
        });
    });
}

// ── Create Team ───────────────────────────────────────────────────────────────
async function createTeam() {
    const name     = document.getElementById('createName').value.trim();
    const desc     = document.getElementById('createDesc').value.trim();
    const photoUrl = document.getElementById('createPhoto').value.trim() || null;
    const feedback = document.getElementById('createFeedback');

    if (!name) { setFeedback(feedback, 'El nombre es obligatorio.', false); return; }

    const res = await fetch(`${API}/teams/create`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ name, description: desc, photo_url: photoUrl })
    });
    const data = await res.json();
    if (res.ok) {
        setFeedback(feedback, '¡Equipo creado!', true);
        setTimeout(() => location.reload(), 800);
    } else {
        setFeedback(feedback, data.detail || 'Error', false);
    }
}

// ── Invite Member ────────────────────────────────────────────────────────────
async function inviteMember() {
    const input    = document.getElementById('inviteInput');
    const feedback = document.getElementById('inviteFeedback');
    const username = input.value.trim();
    if (!username || !myTeamData) return;

    const res = await fetch(`${API}/teams/${myTeamData.id}/invite`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ username })
    });
    const data = await res.json();
    setFeedback(feedback, data.detail || data.message, res.ok);
    if (res.ok) input.value = '';
}

// ── Leave / Dissolve Team ────────────────────────────────────────────────────
async function leaveTeam(teamId, isOwner) {
    const confirmMsg = isOwner
        ? '¿Disolver el equipo? Todos los miembros perderán el equipo.'
        : '¿Abandonar el equipo?';
    if (!confirm(confirmMsg)) return;

    const res = await fetch(`${API}/teams/${teamId}/leave`, {
        method: 'POST', headers: authHeaders()
    });
    if (res.ok) location.reload();
    else { const d = await res.json(); alert(d.detail || 'Error'); }
}

// ── Pending Invites ───────────────────────────────────────────────────────────
async function loadPendingInvites() {
    const panel = document.getElementById('pendingInvitesPanel');
    const list  = document.getElementById('pendingInvitesList');

    try {
        const res = await fetch(`${API}/teams/invites/mine`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) return;
        const invites = await res.json();
        if (!invites || invites.length === 0) return;

        panel.style.display = 'block';
        list.innerHTML = '';
        invites.forEach(inv => {
            const div = document.createElement('div');
            div.className = 'invite-card';
            div.innerHTML = `
                <span class="invite-team-name">${esc(inv.name)}</span>
                <span style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;color:var(--text-muted);">${inv.member_count}/10</span>
                <button class="btn-accept-invite" data-id="${inv.id}">Aceptar</button>
                <button class="btn-decline-invite" data-id="${inv.id}">✕</button>
            `;
            list.appendChild(div);
        });

        list.querySelectorAll('.btn-accept-invite').forEach(btn => {
            btn.addEventListener('click', async () => {
                const r = await fetch(`${API}/teams/${btn.dataset.id}/accept`, {
                    method: 'POST', headers: authHeaders()
                });
                if (r.ok) location.reload();
                else { const d = await r.json(); alert(d.detail || 'Error'); }
            });
        });
        list.querySelectorAll('.btn-decline-invite').forEach(btn => {
            btn.addEventListener('click', async () => {
                await fetch(`${API}/teams/${btn.dataset.id}/decline`, {
                    method: 'POST', headers: authHeaders()
                });
                btn.closest('.invite-card').remove();
            });
        });
    } catch (e) { /* silent */ }
}

// ── All Teams ────────────────────────────────────────────────────────────────
async function loadAllTeams() {
    const grid = document.getElementById('teamsGrid');
    try {
        const res = await fetch(`${API}/teams`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) throw new Error();
        const teams = await res.json();
        grid.innerHTML = '';
        if (!teams || teams.length === 0) {
            grid.innerHTML = '<div class="teams-empty">No hay equipos todavía. ¡Crea el primero!</div>';
            return;
        }
        teams.forEach(t => grid.appendChild(buildTeamCard(t)));
    } catch (e) {
        grid.innerHTML = '<div class="teams-empty">No se pudieron cargar los equipos.</div>';
    }
}

function buildTeamCard(t) {
    const card = document.createElement('div');
    card.className = 'team-card';

    const photoHtml = t.photo_url
        ? `<img src="${esc(t.photo_url)}" alt="team" onerror="this.parentNode.textContent='🛡'">`
        : '🛡';

    card.innerHTML = `
        <div class="team-card-header">
            <div class="team-card-photo">${photoHtml}</div>
            <div>
                <div class="team-card-name">${esc(t.name)}</div>
                <div class="team-card-owner">Cap: ${esc(t.owner || '—')}</div>
            </div>
        </div>
        ${t.description ? `<div style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--text-muted);line-height:1.5;">${esc(t.description)}</div>` : ''}
        <div class="team-card-stats">
            <span class="team-card-stat">👥 <span class="team-card-stat-val">${(t.members || []).length}</span>/10</span>
        </div>
    `;
    return card;
}

// ── Util ─────────────────────────────────────────────────────────────────────
function setFeedback(el, msg, ok) {
    if (!el) return;
    el.textContent = msg;
    el.className = `tl-feedback ${ok ? 'ok' : 'err'}`;
}

window.addEventListener('DOMContentLoaded', initTeams);
