const API_BASE = "https://api.codexar.es/api";
let currentUser = null;
let _allFriends  = [];
let _activeTab   = 'all';

/* ─── Helpers ───────────────��────────────────────────────── */

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const VALID_LANG_ICONS = {
    'python':   'python',
    'java':     'java',
    'go':       'go',
    'c++':      'cplusplus',
    'c#':       'csharp',
};

function buildLangsHTML(languages) {
    if (!languages || languages.length === 0) return '';
    const icons = languages
        .map(l => VALID_LANG_ICONS[l.toLowerCase()])
        .filter(Boolean)
        .map(icon =>
            `<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${icon}/${icon}-original.svg"
                  class="fc-lang-icon" alt="${icon}">`
        )
        .join('');
    return icons ? `<span class="fc-langs">${icons}</span>` : '';
}

function buildAvatarInner(username, avatar, size = 40) {
    const safeAvatar   = escHtml(avatar);
    const safeUsername = escHtml(username);
    if (avatar) {
        return `<img src="${safeAvatar}" alt="${safeUsername}">`;
    }
    return `<span>${(username || '?').charAt(0).toUpperCase()}</span>`;
}

/* ─── Friend card (left panel) ───────────────────────────── */

function createFriendCard(user) {
    const safeUsername = escHtml(user.username);
    const safeDesc     = escHtml(user.description);
    const safeLastSeen = escHtml(user.last_seen_text);
    const isOnline     = !!user.is_online;

    const metaParts = [];
    if (safeDesc) metaParts.push(`<span class="fc-desc">${safeDesc.toUpperCase()}</span>`);
    if (!isOnline && safeLastSeen) {
        metaParts.push(`<span class="fc-lastseen">${safeLastSeen}</span>`);
    }
    const metaHTML = metaParts.length
        ? `<div class="fc-meta">${metaParts.join('<span class="fc-sep"> · </span>')}</div>`
        : '';

    return `
        <div class="fc ${isOnline ? 'fc-online' : ''}">
            <div class="fc-av" style="cursor:pointer" onclick="window.location.href='/perfil?u=${safeUsername}'">
                ${buildAvatarInner(user.username, user.avatar)}
                <div class="fc-status ${isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="fc-info">
                <div class="fc-name" style="cursor:pointer" onclick="window.location.href='/perfil?u=${safeUsername}'">
                    ${safeUsername}
                    ${buildLangsHTML(user.languages)}
                </div>
                ${metaHTML}
            </div>
            <button class="fc-battle" onclick="handleSendBattleInvite('${safeUsername}', this)">Retar</button>
            <button class="fc-del" data-username="${safeUsername}" data-action="delete">
                Eliminar
            </button>
        </div>
    `;
}

/* ─── Request card (right panel) ────────────────────────── */

function createRequestCard(user, actionsHTML) {
    const safeUsername = escHtml(user.username);
    return `
        <div class="rc">
            <div class="rc-av">
                ${buildAvatarInner(user.username, user.avatar)}
            </div>
            <div class="rc-name">${safeUsername}</div>
            <div class="rc-actions">${actionsHTML}</div>
        </div>
    `;
}

/* ─── Render helpers ────────────────��────────────────────── */

function _updateFriendCounters() {
    const total  = _allFriends.length;
    const online = _allFriends.filter(u => u.is_online).length;
    document.getElementById('friendCount').textContent = total;
    document.getElementById('onlineCount').textContent = online;
}

function _renderFriendList() {
    const el   = document.getElementById('masterFriendsList');
    const list = _activeTab === 'online'
        ? _allFriends.filter(u => u.is_online)
        : [..._allFriends].sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0));

    if (list.length === 0) {
        el.innerHTML = _activeTab === 'online'
            ? `<div class="fl-empty">Ningún amigo conectado ahora mismo.</div>`
            : `<div class="fl-empty">Aún no tienes amigos.<br>¡Añade uno desde el panel derecho!</div>`;
        return;
    }

    // Section labels when showing all
    let html = '';
    if (_activeTab === 'all') {
        const onlineList  = list.filter(u => u.is_online);
        const offlineList = list.filter(u => !u.is_online);

        if (onlineList.length > 0) {
            html += `<div class="fc-section-label">En línea — ${onlineList.length}</div>`;
            html += onlineList.map(createFriendCard).join('');
        }
        if (offlineList.length > 0) {
            html += `<div class="fc-section-label" style="margin-top:${onlineList.length ? '10px' : '0'}">Desconectados — ${offlineList.length}</div>`;
            html += offlineList.map(createFriendCard).join('');
        }
    } else {
        html = list.map(createFriendCard).join('');
    }

    el.innerHTML = html;

    el.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteFriend(btn.dataset.username));
    });
}

function renderFriends(list) {
    _allFriends = list;
    _updateFriendCounters();
    _renderFriendList();
}

function renderSent(list) {
    const el    = document.getElementById('sentRequestsList');
    const badge = document.getElementById('sentBadge');
    badge.textContent = list.length;

    if (list.length === 0) {
        el.innerHTML = `<div class="req-empty">Sin solicitudes enviadas.</div>`;
        return;
    }

    el.innerHTML = list.map(u => createRequestCard(u, `
        <button class="rc-btn cancel"
                data-username="${escHtml(u.username)}"
                data-action="cancel">
            Cancelar
        </button>
    `)).join('');

    el.querySelectorAll('[data-action="cancel"]').forEach(btn => {
        btn.addEventListener('click', () => handleFriendAction('cancel', btn.dataset.username));
    });
}

function renderReceived(list) {
    const el    = document.getElementById('receivedRequestsList');
    const badge = document.getElementById('receivedBadge');
    badge.textContent = list.length;

    if (list.length === 0) {
        el.innerHTML = `<div class="req-empty">Sin solicitudes recibidas.</div>`;
        return;
    }

    el.innerHTML = list.map(u => createRequestCard(u, `
        <button class="rc-btn accept"
                data-username="${escHtml(u.username)}"
                data-action="accept">
            Aceptar
        </button>
        <button class="rc-btn reject"
                data-username="${escHtml(u.username)}"
                data-action="reject">
            Rechazar
        </button>
    `)).join('');

    el.querySelectorAll('[data-action="accept"]').forEach(btn => {
        btn.addEventListener('click', () => handleFriendAction('accept', btn.dataset.username));
    });
    el.querySelectorAll('[data-action="reject"]').forEach(btn => {
        btn.addEventListener('click', () => handleFriendAction('reject', btn.dataset.username));
    });
}

/* ─── Data loading ───────────────────────────────────────── */

async function loadFriendsData() {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            renderFriends(data.friends);
            renderSent(data.sent);
            renderReceived(data.received);
        }
    } catch (e) {
        console.error('Error loading friends data:', e);
    }
}

/* ─── Tab switching ──────────────────────────────────────── */

function setupTabs() {
    document.querySelectorAll('.fl-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fl-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _activeTab = btn.dataset.filter;
            _renderFriendList();
        });
    });
}

/* ─── Add friend ───────────────���─────────────────────────── */

function setupDirectAddListener() {
    const btn      = document.getElementById('addFriendBtn');
    const input    = document.getElementById('friendSearchInput');
    const feedback = document.getElementById('searchFeedback');

    const triggerAdd = async () => {
        const targetUser = input.value.trim();
        if (!targetUser) return;

        feedback.className = 'search-feedback';
        feedback.textContent = 'Buscando perfil...';

        const token = localStorage.getItem('access_token');
        try {
            const res  = await fetch(`${API_BASE}/friends/request/${encodeURIComponent(targetUser)}`, {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                feedback.className   = 'search-feedback success';
                feedback.textContent = '¡Solicitud enviada!';
                input.value = '';
                await loadFriendsData();
            } else {
                feedback.className   = 'search-feedback error';
                feedback.textContent = data.detail === 'Usuario objetivo no encontrado'
                    ? 'Este usuario no existe.'
                    : (data.detail || 'Error al enviar la solicitud.');
            }
        } catch {
            feedback.className   = 'search-feedback error';
            feedback.textContent = 'Error de conexión con el servidor.';
        }
    };

    btn.addEventListener('click', triggerAdd);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') triggerAdd(); });
}

/* ─── Global action handlers ─────────────────────────────── */

window.handleDeleteFriend = async function (targetUsername) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/friends/${encodeURIComponent(targetUsername)}`, {
            method:  'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) await loadFriendsData();
    } catch (err) {
        console.error('Delete friend error:', err);
    }
};

window.handleFriendAction = async function (action, targetUsername) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/friends/${action}/${encodeURIComponent(targetUsername)}`, {
            method:  'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) await loadFriendsData();
    } catch (err) {
        console.error('Friend action error:', err);
    }
};

/* ─── Heartbeat ──────────────────────────────────────────── */

function startHeartbeat() {
    const beat = async () => {
        const t = localStorage.getItem('access_token');
        if (!t) return;
        await fetch(`${API_BASE}/user/heartbeat`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${t}` }
        }).catch(() => {});
    };
    beat();
    setInterval(beat, 60_000);
}

/* ─── Friendly battle ────────────────────────────────────── */

window.handleSendBattleInvite = async function (username, btn) {
    btn.disabled = true;
    btn.textContent = '…';
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/friendly/invite/${encodeURIComponent(username)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
            btn.textContent = 'Retar';
            btn.disabled = false;
            return;
        }
        const { invite_id } = await res.json();
        btn.textContent = 'Esperando…';

        // Insert cancel button right after the battle button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'fc-cancel';
        cancelBtn.textContent = 'Cancelar';
        btn.insertAdjacentElement('afterend', cancelBtn);

        const cleanup = () => {
            clearInterval(iv);
            cancelBtn.remove();
            btn.textContent = 'Retar';
            btn.disabled = false;
        };

        cancelBtn.addEventListener('click', async () => {
            cancelBtn.disabled = true;
            try {
                await fetch(`${API_BASE}/friendly/cancel/${invite_id}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            } catch { /* silent */ }
            cleanup();
        });

        const iv = setInterval(async () => {
            try {
                const st = await fetch(`${API_BASE}/friendly/invite-status/${invite_id}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!st.ok) return;
                const { status, match_id } = await st.json();
                if (status === 'accepted') {
                    clearInterval(iv);
                    cancelBtn.remove();
                    window.location.href = `/friendly/batalla?match=${match_id}`;
                } else if (status === 'rejected') {
                    cleanup();
                    btn.textContent = 'Rechazado';
                    setTimeout(() => { btn.textContent = 'Retar'; btn.disabled = false; }, 2500);
                }
            } catch { /* silent */ }
        }, 3000);
    } catch {
        btn.textContent = 'Retar';
        btn.disabled = false;
    }
};

/* ─── Init ───────────────────────────���───────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        });
    }

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('auth');
        currentUser = await res.json();

        document.getElementById('navUsername').textContent = currentUser.username;
        const navAvatar = document.getElementById('navAvatar');
        if (currentUser.avatar) {
            navAvatar.style.backgroundImage   = `url(${currentUser.avatar})`;
            navAvatar.style.backgroundSize    = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border            = '1px solid var(--accent-cyan)';
            navAvatar.textContent             = '';
        } else {
            navAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        }

        setupTabs();
        setupDirectAddListener();
        startHeartbeat();
        await loadFriendsData();

    } catch (e) {
        console.error('Init failure:', e);
        localStorage.removeItem('access_token');
        window.location.href = '/login';
    }
});
