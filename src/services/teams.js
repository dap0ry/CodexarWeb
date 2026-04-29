const API = 'https://api.codexar.es/api';

let currentUser = null;
let hasTeam = false;

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
    if (!token()) { window.location.href = '/login'; return; }

    const res = await fetch(`${API}/user/me`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if (!res.ok) { window.location.href = '/login'; return; }
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
        e.preventDefault(); localStorage.removeItem('access_token'); window.location.href = '/';
    });

    await loadTeamsPage();
}

// ── Main load ─────────────────────────────────────────────────────────────────
async function loadTeamsPage() {
    try {
        const [mineRes, allRes, invitesRes] = await Promise.all([
            fetch(`${API}/teams/mine`,         { headers: { 'Authorization': `Bearer ${token()}` } }),
            fetch(`${API}/teams`,              { headers: { 'Authorization': `Bearer ${token()}` } }),
            fetch(`${API}/teams/invites/mine`, { headers: { 'Authorization': `Bearer ${token()}` } })
        ]);

        const myTeam   = mineRes.ok   ? await mineRes.json()   : null;
        const allTeams = allRes.ok    ? await allRes.json()    : [];
        const invites  = invitesRes.ok ? await invitesRes.json() : [];

        hasTeam = !!myTeam;

        document.getElementById('tmLoading').classList.add('hidden');
        document.getElementById('tmPage').classList.remove('hidden');

        if (hasTeam) {
            document.getElementById('tmMyTeamBar').classList.remove('hidden');
        } else {
            document.getElementById('tmTopBar').classList.remove('hidden');
            document.getElementById('tmOpenCreateBtn').addEventListener('click', () => {
                document.getElementById('tmCreateModal').classList.remove('hidden');
            });
            if (invites && invites.length) renderInviteStrip(invites);
        }

        renderClubsGrid(allTeams, myTeam);

        // Create modal bindings
        document.getElementById('tmCreateCancel').addEventListener('click', () => {
            document.getElementById('tmCreateModal').classList.add('hidden');
        });
        document.getElementById('tmCreateModal').addEventListener('click', e => {
            if (e.target === document.getElementById('tmCreateModal'))
                document.getElementById('tmCreateModal').classList.add('hidden');
        });
        document.getElementById('tmCreateSave').addEventListener('click', createTeam);

    } catch (e) {
        console.error(e);
        document.getElementById('tmLoading').classList.add('hidden');
        document.getElementById('tmPage').classList.remove('hidden');
        document.getElementById('tmTopBar').classList.remove('hidden');
    }
}

// ── Render clubs grid ─────────────────────────────────────────────────────────
function renderClubsGrid(teams, myTeam) {
    const grid = document.getElementById('tmClubsGrid');
    if (!teams || !teams.length) {
        grid.innerHTML = '<div class="tm-empty">No hay clubes todavía. ¡Crea el primero!</div>';
        return;
    }

    const myName = myTeam ? myTeam.name : null;
    const sorted = myName
        ? [teams.find(t => t.name === myName), ...teams.filter(t => t.name !== myName)].filter(Boolean)
        : teams;

    grid.innerHTML = sorted.map(t => buildClubCard(t, myName)).join('');

    if (!hasTeam) {
        grid.querySelectorAll('.tm-card-join-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                const r = await fetch(`${API}/teams/${btn.dataset.id}/join`, { method: 'POST', headers: authHeaders() });
                const d = await r.json();
                if (r.ok) { showToast(d.message || '¡Unido al club!'); setTimeout(() => location.reload(), 700); }
                else showToast(d.detail || 'Error al unirse', true);
            });
        });
    }
}

function buildClubCard(t, myName) {
    const isOwn = myName && t.name === myName;
    const bannerAttr = t.background_url
        ? `style="background-image:url(${esc(t.background_url)})"` : '';
    const photoStyle = t.photo_url
        ? `background-image:url(${esc(t.photo_url)});color:transparent` : '';
    const initial = (t.name || '?').charAt(0).toUpperCase();
    const memberCount = Array.isArray(t.members) ? t.members.length : (t.member_count ?? 0);
    const joinBtn = (!hasTeam && !isOwn)
        ? `<button class="tm-card-join-btn" data-id="${esc(t.id)}">Unirse</button>` : '';
    const ownBadge = isOwn ? '<div class="tm-own-badge">Tu club</div>' : '';

    return `
        <div class="tm-club-card${isOwn ? ' is-own' : ''}" onclick="window.location.href='/equipo?t=${encodeURIComponent(t.name)}'">
            ${ownBadge}
            <div class="tm-card-banner" ${bannerAttr}></div>
            <div class="tm-card-body">
                <div class="tm-card-photo-wrap">
                    <div class="tm-card-photo" style="${photoStyle}">${t.photo_url ? '' : initial}</div>
                </div>
                <div class="tm-card-name">${esc(t.name)}</div>
                <div class="tm-card-desc">${t.description ? esc(t.description) : ''}</div>
                <div class="tm-card-footer">
                    <span class="tm-card-members">${memberCount}/10 miembros</span>
                    ${joinBtn}
                </div>
            </div>
        </div>
    `;
}

// ── Pending invites strip ─────────────────────────────────────────────────────
function renderInviteStrip(invites) {
    const strip = document.getElementById('tmPendingStrip');
    strip.classList.remove('hidden');
    strip.innerHTML = invites.map(inv => {
        const photoAttr = inv.photo_url ? `style="background-image:url(${esc(inv.photo_url)})"` : '';
        return `
            <div class="tm-invite-card">
                <div class="tm-invite-card-photo" ${photoAttr}>${inv.photo_url ? '' : '🛡'}</div>
                <div style="flex:1;min-width:0">
                    <div class="tm-invite-team-name">${esc(inv.name)}</div>
                    <div class="tm-invite-sub">${inv.member_count ?? '?'}/10 miembros · Cap: ${esc(inv.owner || '—')}</div>
                </div>
                <button class="tm-btn-accept" data-id="${esc(inv.id)}">Unirse</button>
                <button class="tm-btn-decline" data-id="${esc(inv.id)}">✕</button>
            </div>
        `;
    }).join('');

    strip.querySelectorAll('.tm-btn-accept').forEach(btn => {
        btn.addEventListener('click', async () => {
            const r = await fetch(`${API}/teams/${btn.dataset.id}/accept`, { method: 'POST', headers: authHeaders() });
            if (r.ok) location.reload();
            else { const d = await r.json(); showToast(d.detail || 'Error', true); }
        });
    });
    strip.querySelectorAll('.tm-btn-decline').forEach(btn => {
        btn.addEventListener('click', async () => {
            await fetch(`${API}/teams/${btn.dataset.id}/decline`, { method: 'POST', headers: authHeaders() });
            btn.closest('.tm-invite-card').remove();
        });
    });
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
