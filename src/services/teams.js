const API = 'https://codexarapi.onrender.com/api';

let currentUser = null;
let myTeamData  = null;

function token() { return localStorage.getItem('access_token'); }
function authHeaders() { return { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' }; }

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer = null;
function showToast(msg, isErr = false) {
    const el = document.getElementById('tmToast');
    el.textContent = msg;
    el.className = `tm-toast${isErr ? ' err' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

function setFeedback(id, msg, ok) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = `tm-feedback ${ok ? 'ok' : 'err'}`;
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function initTeams() {
    if (!token()) { window.location.href = 'Login.html'; return; }

    const res = await fetch(`${API}/user/me`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if (!res.ok) { window.location.href = 'Login.html'; return; }
    currentUser = await res.json();

    const navUsername = document.getElementById('navUsername');
    const navAvatar   = document.getElementById('navAvatar');
    if (navUsername) navUsername.textContent = currentUser.username;
    if (navAvatar) {
        if (currentUser.avatar) {
            navAvatar.style.backgroundImage    = `url(${currentUser.avatar})`;
            navAvatar.style.backgroundSize     = 'cover';
            navAvatar.style.backgroundPosition = 'center';
        } else {
            navAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        }
    }
    document.getElementById('logoutBtn')?.addEventListener('click', e => {
        e.preventDefault(); localStorage.removeItem('access_token'); window.location.href = 'index.html';
    });

    await Promise.all([loadMyTeam(), loadPendingInvites()]);
}

// ── My Team ───────────────────────────────────────────────────────────────────
async function loadMyTeam() {
    document.getElementById('tmLoading').classList.remove('hidden');
    document.getElementById('tmHasTeam').classList.add('hidden');
    document.getElementById('tmNoTeam').classList.add('hidden');

    try {
        const res = await fetch(`${API}/teams/mine`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();

        document.getElementById('tmLoading').classList.add('hidden');

        if (!data) {
            showNoTeam();
            return;
        }

        myTeamData = data;
        showHasTeam(data);
    } catch {
        document.getElementById('tmLoading').classList.add('hidden');
        showNoTeam();
    }
}

function showNoTeam() {
    document.getElementById('tmNoTeam').classList.remove('hidden');
    loadAllTeams();
    document.getElementById('createTeamBtn').onclick = createTeam;
}

function showHasTeam(data) {
    const isOwner = data.owner === currentUser.username;
    document.getElementById('tmHasTeam').classList.remove('hidden');

    // Background
    if (data.background_url) {
        const overlay = document.getElementById('tmBgOverlay');
        overlay.style.backgroundImage = `url(${data.background_url})`;
    }

    // Banner (same photo blurred, or background)
    if (data.photo_url || data.background_url) {
        const banner = document.getElementById('tmBanner');
        banner.style.backgroundImage = `url(${data.background_url || data.photo_url})`;
        banner.classList.remove('hidden');
    }

    // Team photo
    const photo = document.getElementById('tmPhoto');
    if (data.photo_url) {
        photo.style.backgroundImage = `url(${data.photo_url})`;
    } else {
        photo.textContent = (data.name || '?').charAt(0).toUpperCase();
    }

    document.getElementById('tmClubName').textContent = data.name;
    document.getElementById('tmClubDesc').textContent = data.description || '';

    const roleBadge = document.getElementById('tmRoleBadge');
    roleBadge.textContent = isOwner ? 'CAPITÁN' : 'MIEMBRO';
    if (isOwner) roleBadge.classList.add('captain');

    const members = data.members_info || [];
    document.getElementById('tmMemberCount').textContent = `${members.length} miembro${members.length !== 1 ? 's' : ''}`;

    // Stats
    document.getElementById('tmStatMembers').textContent    = members.length;
    document.getElementById('tmStatTotalSolved').textContent = data.total_solved ?? 0;
    document.getElementById('tmStatAvgElo').textContent     = data.avg_elo ?? 0;
    document.getElementById('tmStatAvgSolved').textContent  = data.avg_solved ?? 0;

    // Public view btn
    const viewBtn = document.getElementById('tmViewPublicBtn');
    viewBtn.href = `TeamView.html?t=${encodeURIComponent(data.name)}`;

    // Owner tools
    if (isOwner) {
        document.getElementById('tmOwnerTools').style.display = 'flex';
        document.getElementById('tmPhotoOverlay').style.display = 'flex';
        document.getElementById('tmInviteSection').style.display = 'flex';
        bindOwnerUploadPhoto(data.id);
        bindOwnerUploadBg(data.id);
        bindEditModal(data);
        loadFriendsForInvite(data);
        document.getElementById('inviteBtn').onclick = inviteMember;
    }

    // Leave btn
    const leaveBtn = document.getElementById('tmLeaveBtn');
    leaveBtn.textContent = isOwner ? 'Disolver club' : 'Abandonar';
    leaveBtn.onclick = () => leaveTeam(data.id, isOwner);

    // Members grid
    renderMembersGrid(members, data.id, isOwner);
}

// ── Members grid ──────────────────────────────────────────────────────────────
function renderMembersGrid(members, teamId, isOwner) {
    const grid = document.getElementById('tmMembersGrid');
    grid.innerHTML = members.map(m => {
        const initials    = m.username.charAt(0).toUpperCase();
        const avatarStyle = m.avatar
            ? `style="background-image:url(${esc(m.avatar)})"` : '';
        const captainBadge = m.is_owner ? '<div class="tm-mc-captain">CAPITÁN</div>' : '';
        const kickBtn = (isOwner && !m.is_owner)
            ? `<button class="tm-mc-kick" data-user="${esc(m.username)}" data-team="${teamId}" title="Expulsar">✕</button>` : '';
        return `
            <a href="ProfileView.html?u=${encodeURIComponent(m.username)}" class="tm-member-card${m.is_owner ? ' is-owner' : ''}">
                ${captainBadge}
                ${kickBtn}
                <div class="tm-mc-avatar" ${avatarStyle}>${m.avatar ? '' : initials}</div>
                <div class="tm-mc-name">${esc(m.username)}</div>
                <div class="tm-mc-elo">${m.elo} ELO</div>
                <div class="tm-mc-solved">${m.solved} resueltos</div>
            </a>
        `;
    }).join('');

    // Kick buttons (stop propagation so click doesn't navigate)
    grid.querySelectorAll('.tm-mc-kick').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.preventDefault();
            e.stopPropagation();
            if (!confirm(`¿Expulsar a ${btn.dataset.user}?`)) return;
            const r = await fetch(`${API}/teams/${btn.dataset.team}/members/${btn.dataset.user}`, {
                method: 'DELETE', headers: authHeaders()
            });
            const d = await r.json();
            if (r.ok) { showToast(d.message); await loadMyTeam(); }
            else showToast(d.detail || 'Error', true);
        });
    });
}

// ── Owner: upload photo ───────────────────────────────────────────────────────
function bindOwnerUploadPhoto(teamId) {
    const input = document.getElementById('photoInput');
    input.addEventListener('change', async () => {
        if (!input.files[0]) return;
        const fd = new FormData();
        fd.append('photo', input.files[0]);
        const res = await fetch(`${API}/teams/${teamId}/upload-photo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}` },
            body: fd
        });
        const data = await res.json();
        if (res.ok) { showToast('Foto actualizada'); await loadMyTeam(); }
        else showToast(data.detail || 'Error subiendo foto', true);
    });
}

// ── Owner: upload background ──────────────────────────────────────────────────
function bindOwnerUploadBg(teamId) {
    const input = document.getElementById('bgInput');
    input.addEventListener('change', async () => {
        if (!input.files[0]) return;
        const fd = new FormData();
        fd.append('bg', input.files[0]);
        const res = await fetch(`${API}/teams/${teamId}/upload-background`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}` },
            body: fd
        });
        const data = await res.json();
        if (res.ok) { showToast('Fondo actualizado'); await loadMyTeam(); }
        else showToast(data.detail || 'Error subiendo fondo', true);
    });
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function bindEditModal(data) {
    const modal    = document.getElementById('tmEditModal');
    const editName = document.getElementById('editName');
    const editDesc = document.getElementById('editDesc');

    document.getElementById('tmEditBtn').onclick = () => {
        editName.value = data.name;
        editDesc.value = data.description || '';
        modal.classList.remove('hidden');
    };
    document.getElementById('tmEditCancel').onclick = () => modal.classList.add('hidden');
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

    document.getElementById('tmEditSave').onclick = async () => {
        const name = editName.value.trim();
        const desc = editDesc.value.trim();
        if (!name) { setFeedback('editFeedback', 'El nombre es obligatorio.', false); return; }
        const res = await fetch(`${API}/teams/${data.id}`, {
            method: 'PATCH', headers: authHeaders(),
            body: JSON.stringify({ name, description: desc, photo_url: data.photo_url || null })
        });
        const d = await res.json();
        if (res.ok) {
            showToast('Club actualizado');
            modal.classList.add('hidden');
            await loadMyTeam();
        } else {
            setFeedback('editFeedback', d.detail || 'Error', false);
        }
    };
}

// ── Friends quick-invite ──────────────────────────────────────────────────────
async function loadFriendsForInvite(teamData) {
    const row = document.getElementById('tmFriendsRow');
    try {
        const res = await fetch(`${API}/friends`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) { row.innerHTML = ''; return; }
        const data    = await res.json();
        const friends = data.friends || [];
        const members = new Set((teamData.members_info || []).map(m => m.username));
        const eligible = friends.filter(f => !members.has(f.username));

        if (!eligible.length) {
            row.innerHTML = '<span style="font-family:\'JetBrains Mono\',monospace;font-size:0.62rem;color:rgba(114,114,138,0.45)">No hay amigos disponibles para invitar</span>';
            return;
        }
        row.innerHTML = eligible.map(f => {
            const avatarStyle = f.avatar
                ? `style="background-image:url(${esc(f.avatar)})"` : '';
            const initials = f.username.charAt(0).toUpperCase();
            return `
                <div class="tm-friend-chip" data-username="${esc(f.username)}">
                    <div class="tm-friend-chip-avatar" ${avatarStyle}>${f.avatar ? '' : initials}</div>
                    <span class="tm-friend-chip-name">${esc(f.username)}</span>
                </div>
            `;
        }).join('');

        row.querySelectorAll('.tm-friend-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.getElementById('inviteInput').value = chip.dataset.username;
                inviteMember();
            });
        });
    } catch { row.innerHTML = ''; }
}

// ── Invite member ─────────────────────────────────────────────────────────────
async function inviteMember() {
    const input    = document.getElementById('inviteInput');
    const username = input.value.trim();
    if (!username || !myTeamData) return;

    const res = await fetch(`${API}/teams/${myTeamData.id}/invite`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ username })
    });
    const data = await res.json();
    setFeedback('inviteFeedback', data.detail || data.message, res.ok);
    if (res.ok) input.value = '';
}

// ── Leave / Dissolve ──────────────────────────────────────────────────────────
async function leaveTeam(teamId, isOwner) {
    const msg = isOwner
        ? '¿Disolver el club? Todos los miembros perderán el equipo. Esta acción no se puede deshacer.'
        : '¿Abandonar el club?';
    if (!confirm(msg)) return;
    const res = await fetch(`${API}/teams/${teamId}/leave`, { method: 'POST', headers: authHeaders() });
    if (res.ok) location.reload();
    else { const d = await res.json(); showToast(d.detail || 'Error', true); }
}

// ── Pending invites ───────────────────────────────────────────────────────────
async function loadPendingInvites() {
    const panel = document.getElementById('tmPendingPanel');
    const list  = document.getElementById('tmPendingList');
    try {
        const res = await fetch(`${API}/teams/invites/mine`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) return;
        const invites = await res.json();
        if (!invites || !invites.length) return;

        if (panel) panel.style.display = 'block';
        if (!list) return;

        list.innerHTML = invites.map(inv => {
            const photoHtml = inv.photo_url
                ? `style="background-image:url(${esc(inv.photo_url)})"` : '';
            return `
                <div class="tm-invite-card" data-id="${esc(inv.id)}">
                    <div class="tm-invite-card-photo" ${photoHtml}>${inv.photo_url ? '' : '🛡'}</div>
                    <div style="flex:1;min-width:0">
                        <div class="tm-invite-team-name">${esc(inv.name)}</div>
                        <div class="tm-invite-sub">${inv.member_count}/10 miembros · Cap: ${esc(inv.owner || '—')}</div>
                    </div>
                    <button class="tm-btn-accept" data-id="${esc(inv.id)}">Unirse</button>
                    <button class="tm-btn-decline" data-id="${esc(inv.id)}">✕</button>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.tm-btn-accept').forEach(btn => {
            btn.addEventListener('click', async () => {
                const r = await fetch(`${API}/teams/${btn.dataset.id}/accept`, { method: 'POST', headers: authHeaders() });
                if (r.ok) location.reload();
                else { const d = await r.json(); showToast(d.detail || 'Error', true); }
            });
        });
        list.querySelectorAll('.tm-btn-decline').forEach(btn => {
            btn.addEventListener('click', async () => {
                await fetch(`${API}/teams/${btn.dataset.id}/decline`, { method: 'POST', headers: authHeaders() });
                btn.closest('.tm-invite-card').remove();
                const remaining = list.querySelectorAll('.tm-invite-card').length;
                if (!remaining && panel) panel.style.display = 'none';
            });
        });
    } catch { /* silent */ }
}

// ── All teams (no-team view) ──────────────────────────────────────────────────
async function loadAllTeams() {
    const grid = document.getElementById('teamsGrid');
    try {
        const res = await fetch(`${API}/teams`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) throw new Error();
        const teams = await res.json();
        if (!teams || !teams.length) {
            grid.innerHTML = '<div class="tm-empty">No hay clubes todavía. ¡Crea el primero!</div>';
            return;
        }
        grid.innerHTML = teams.map(t => {
            const photoHtml = t.photo_url
                ? `<img src="${esc(t.photo_url)}" alt="team" onerror="this.parentNode.textContent='🛡'">`
                : '🛡';
            const descHtml = t.description
                ? `<div class="tm-tc-desc">${esc(t.description)}</div>` : '';
            return `
                <div class="tm-team-card" onclick="window.location.href='TeamView.html?t=${encodeURIComponent(t.name)}'">
                    <div class="tm-tc-header">
                        <div class="tm-tc-photo">${photoHtml}</div>
                        <div>
                            <div class="tm-tc-name">${esc(t.name)}</div>
                            <div class="tm-tc-captain">Cap: ${esc(t.owner || '—')}</div>
                        </div>
                    </div>
                    ${descHtml}
                    <div class="tm-tc-footer">
                        <span class="tm-tc-members">${(t.members || []).length}/10 miembros</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch {
        grid.innerHTML = '<div class="tm-empty">No se pudieron cargar los clubes.</div>';
    }
}

// ── Create team ───────────────────────────────────────────────────────────────
async function createTeam() {
    const name = document.getElementById('createName').value.trim();
    const desc = document.getElementById('createDesc').value.trim();
    if (!name) { setFeedback('createFeedback', 'El nombre es obligatorio.', false); return; }

    const res = await fetch(`${API}/teams/create`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ name, description: desc, photo_url: null })
    });
    const data = await res.json();
    if (res.ok) {
        setFeedback('createFeedback', '¡Club fundado!', true);
        setTimeout(() => location.reload(), 700);
    } else {
        setFeedback('createFeedback', data.detail || 'Error', false);
    }
}

window.addEventListener('DOMContentLoaded', initTeams);
