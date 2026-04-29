const API_BASE = 'https://api.codexar.es/api';

const DIFF_META = {
    normal:    { label: 'NORMAL',    meta: '60s de inicio · +10s por ejercicio' },
    dificil:   { label: 'DIFÍCIL',   meta: '45s de inicio · +7s por ejercicio'  },
    demencial: { label: 'DEMENCIAL', meta: '30s de inicio · +5s por ejercicio'  },
};

// ── State ─────────────────────────────────────────────────────────────────────
let roomId       = null;
let isHost       = false;
let myEmail      = null;
let difficulty   = 'normal';
let pollInterval = null;
let pendingInvites = new Set(); // emails we've already sent invites to

const params = new URLSearchParams(window.location.search);

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderSlots(players) {
    const container = document.getElementById('lobbySlots');
    container.innerHTML = '';

    // Render filled player slots
    players.forEach((player, idx) => {
        const slot = document.createElement('div');
        slot.className = 'lobby-slot';

        const avatarEl = document.createElement('div');
        avatarEl.className = 'lobby-slot-avatar';
        if (player.avatar) {
            avatarEl.style.backgroundImage = `url(${player.avatar})`;
            avatarEl.textContent = '';
        } else {
            avatarEl.textContent = (player.username || '?').charAt(0).toUpperCase();
        }

        const nameEl = document.createElement('div');
        nameEl.className = 'lobby-slot-name';
        nameEl.textContent = player.username;

        slot.appendChild(avatarEl);
        slot.appendChild(nameEl);

        if (idx === 0 && isHost) {
            const badge = document.createElement('div');
            badge.className = 'lobby-slot-badge';
            badge.textContent = 'HOST';
            slot.appendChild(badge);
        }

        container.appendChild(slot);
    });

    // Render empty slots (up to 4 total)
    const emptyCount = 4 - players.length;
    for (let i = 0; i < emptyCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'lobby-slot';

        const emptyAvatar = document.createElement('div');
        emptyAvatar.className = 'lobby-slot-empty-avatar';
        emptyAvatar.innerHTML = '<span class="lobby-slot-plus">+</span>';

        if (isHost) {
            emptyAvatar.title = 'Invitar amigo';
            emptyAvatar.addEventListener('click', openInviteModal);
        }

        slot.appendChild(emptyAvatar);
        container.appendChild(slot);
    }
}

function renderActions() {
    const container = document.getElementById('lobbyActions');
    container.innerHTML = '';

    if (isHost) {
        const btn = document.createElement('button');
        btn.className = 'btn-start';
        btn.id = 'btnStart';
        btn.textContent = 'INICIAR PARTIDA →';
        btn.addEventListener('click', startGame);
        container.appendChild(btn);

        const hint = document.createElement('div');
        hint.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:0.6rem;color:rgba(230,230,240,0.25);letter-spacing:1px;';
        hint.textContent = 'Puedes iniciar solo o esperar hasta 3 amigos más';
        container.appendChild(hint);
    } else {
        const waiting = document.createElement('div');
        waiting.className = 'lobby-waiting-text';
        waiting.textContent = 'Esperando al anfitrión...';
        container.appendChild(waiting);
    }
}

// ── Poll room state ───────────────────────────────────────────────────────────

async function pollRoom() {
    const token = localStorage.getItem('access_token');
    if (!token || !roomId) return;

    try {
        const res = await fetch(`${API_BASE}/survival/room/${roomId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'in_game') {
            // Game started (host pressed start while we were polling)
            clearInterval(pollInterval);
            window.location.href = `/supervivencia/batalla?room=${roomId}&difficulty=${difficulty}`;
            return;
        }

        renderSlots(data.players);
    } catch { /* silent */ }
}

// ── Start game ────────────────────────────────────────────────────────────────

async function startGame() {
    const token = localStorage.getItem('access_token');
    const btn   = document.getElementById('btnStart');
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/survival/room/${roomId}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            clearInterval(pollInterval);
            window.location.href = `/supervivencia/batalla?room=${roomId}&difficulty=${difficulty}`;
        } else {
            if (btn) btn.disabled = false;
        }
    } catch {
        if (btn) btn.disabled = false;
    }
}

// ── Friend invite modal ───────────────────────────────────────────────────────

async function openInviteModal() {
    document.getElementById('inviteModal').classList.remove('hidden');
    const list = document.getElementById('friendList');
    list.innerHTML = '<div class="surv-modal-empty">Cargando amigos...</div>';

    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/friends`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const friends = data.friends || [];

        if (!friends.length) {
            list.innerHTML = '<div class="surv-modal-empty">No tienes amigos aún.</div>';
            return;
        }

        list.innerHTML = '';
        friends.forEach(friend => {
            const row = document.createElement('div');
            row.className = 'surv-friend-row';
            if (pendingInvites.has(friend.email || friend.username)) {
                row.classList.add('disabled');
            }

            const avatarEl = document.createElement('div');
            avatarEl.className = 'surv-friend-avatar';
            if (friend.avatar) {
                avatarEl.style.backgroundImage = `url(${friend.avatar})`;
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
                avatarEl.textContent = '';
            } else {
                avatarEl.textContent = (friend.username || '?').charAt(0).toUpperCase();
            }

            const info = document.createElement('div');
            info.className = 'surv-friend-info';

            const name = document.createElement('div');
            name.className = 'surv-friend-name';
            name.textContent = friend.username;

            const status = document.createElement('div');
            status.className = `surv-friend-status${friend.is_online ? ' online' : ''}`;
            status.textContent = friend.is_online ? '● En línea' : friend.last_seen_text || 'Desconectado';

            info.appendChild(name);
            info.appendChild(status);

            const invBtn = document.createElement('button');
            invBtn.className = 'surv-friend-invite-btn';
            invBtn.textContent = pendingInvites.has(friend.username) ? 'Enviado' : 'Invitar';
            if (pendingInvites.has(friend.username)) invBtn.disabled = true;

            invBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                invBtn.disabled = true;
                invBtn.textContent = '...';
                await sendInvite(friend.username, invBtn);
            });

            row.appendChild(avatarEl);
            row.appendChild(info);
            row.appendChild(invBtn);
            list.appendChild(row);
        });
    } catch {
        list.innerHTML = '<div class="surv-modal-empty">Error cargando amigos.</div>';
    }
}

async function sendInvite(username, btn) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/survival/invite/${roomId}/${encodeURIComponent(username)}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            pendingInvites.add(username);
            if (btn) { btn.textContent = 'Enviado'; btn.disabled = true; }
        } else {
            if (btn) { btn.textContent = 'Error'; btn.disabled = false; }
        }
    } catch {
        if (btn) { btn.textContent = 'Error'; btn.disabled = false; }
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }

    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = '/login';
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('inviteModal').classList.add('hidden');
    });
    document.getElementById('inviteModal').addEventListener('click', e => {
        if (e.target === document.getElementById('inviteModal')) {
            document.getElementById('inviteModal').classList.add('hidden');
        }
    });

    difficulty = (params.get('difficulty') || 'normal').toLowerCase();
    const roomFromUrl = params.get('room');
    const isGuest     = params.get('guest') === '1';

    // Set header labels
    const diffMeta = DIFF_META[difficulty] || DIFF_META.normal;
    document.getElementById('lobbyTitle').textContent = `SUPERVIVENCIA · ${diffMeta.label}`;
    document.getElementById('lobbyMeta').textContent  = diffMeta.meta;
    document.title = `Codexar — Supervivencia ${diffMeta.label}`;

    try {
        const userRes = await fetch(`${API_BASE}/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) { window.location.href = '/login'; return; }
        const user = await userRes.json();
        myEmail = user.email;

        document.getElementById('navUsername').textContent = user.username;
        const navAvatar = document.getElementById('navAvatar');
        if (user.avatar) {
            navAvatar.style.cssText = `background-image:url(${user.avatar});background-size:cover;background-position:center;border:1px solid var(--accent-cyan);`;
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = user.username.charAt(0).toUpperCase();
        }

        if (roomFromUrl && isGuest) {
            // Joining existing room as guest
            roomId = roomFromUrl;
            isHost = false;
        } else {
            // Creating new room as host
            isHost = true;
            const createRes = await fetch(`${API_BASE}/survival/room?difficulty=${difficulty}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!createRes.ok) throw new Error('create failed');
            const { room_id } = await createRes.json();
            roomId = room_id;
        }

        renderActions();

        // Initial room state fetch
        await pollRoom();

        // Start polling every 2s
        pollInterval = setInterval(pollRoom, 2000);

    } catch {
        window.location.href = '/supervivencia';
    }
});
