const API_BASE = 'https://api.codexar.es/api';

// ── State ─────────────────────────────────────────────────────────────────────
let roomId         = null;
let isRoomCreated  = false;
let creatingRoom   = false;
let pendingInvites = new Set();
let pollInterval   = null;
let myUser         = null;

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTime(seconds) {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Record ────────────────────────────────────────────────────────────────────

async function fetchRecord() {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/survival/my-record`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('survRecordTime').textContent =
            data.max_time_survived ? formatTime(data.max_time_survived) : '--:--';
        document.getElementById('survRecordEx').textContent =
            data.max_exercises || 0;
    } catch { /* silent */ }
}

// ── Room ──────────────────────────────────────────────────────────────────────

async function ensureRoom() {
    if (isRoomCreated && roomId) return;
    if (creatingRoom) return;
    creatingRoom = true;
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE}/survival/room`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('create room failed');
        const data    = await res.json();
        roomId        = data.room_id;
        isRoomCreated = true;
        pollInterval  = setInterval(pollRoom, 2000);
    } finally {
        creatingRoom = false;
    }
}

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
            clearInterval(pollInterval);
            window.location.href = `/supervivencia/batalla?room=${roomId}`;
            return;
        }
        renderSlots(data.players);
    } catch { /* silent */ }
}

// ── Render slots ──────────────────────────────────────────────────────────────

function renderSlots(players) {
    const container = document.getElementById('survLobbySlots');
    container.innerHTML = '';

    players.forEach((player) => {
        const slot = document.createElement('div');
        slot.className = 'surv-lobby-slot';

        const av = document.createElement('div');
        av.className = 'surv-lobby-avatar filled';
        if (player.avatar) {
            av.style.backgroundImage = `url('${player.avatar}')`;
            av.style.backgroundSize = 'cover';
            av.style.backgroundPosition = 'center';
        } else {
            av.textContent = (player.username || '?').charAt(0).toUpperCase();
        }

        const name = document.createElement('div');
        name.className = 'surv-lobby-slot-name';
        const isMe = myUser && player.username === myUser.username;
        name.textContent = isMe ? window.i18nT('survival.you') : player.username;

        slot.appendChild(av);
        slot.appendChild(name);
        container.appendChild(slot);
    });

    for (let i = players.length; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'surv-lobby-slot';

        const av = document.createElement('div');
        av.className = 'surv-lobby-avatar empty';
        av.innerHTML = '<span>+</span>';
        av.title = window.i18nT('survival.invite');
        av.addEventListener('click', openInviteModal);

        const name = document.createElement('div');
        name.className = 'surv-lobby-slot-name muted';
        name.textContent = window.i18nT('survival.addFriend');

        slot.appendChild(av);
        slot.appendChild(name);
        container.appendChild(slot);
    }
}

// ── Invite modal ──────────────────────────────────────────────────────────────

async function openInviteModal() {
    document.getElementById('survInviteModal').classList.remove('hidden');
    const list = document.getElementById('survFriendList');
    list.innerHTML = `<div class="surv-modal-empty">${window.i18nT('survival.loading')}</div>`;

    const token = localStorage.getItem('access_token');
    try {
        await ensureRoom();

        const res = await fetch(`${API_BASE}/friends`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data    = await res.json();
        const friends = data.friends || [];

        if (!friends.length) {
            list.innerHTML = `<div class="surv-modal-empty">${window.i18nT('survival.noFriends')}</div>`;
            return;
        }

        list.innerHTML = '';
        friends.forEach(friend => {
            const row = document.createElement('div');
            row.className = 'surv-fr-row';

            const av = document.createElement('div');
            av.className = 'surv-fr-av';
            if (friend.avatar) {
                const img = document.createElement('img');
                img.src = friend.avatar;
                av.appendChild(img);
            } else {
                av.textContent = (friend.username || '?').charAt(0).toUpperCase();
            }

            const info = document.createElement('div');
            info.className = 'surv-fr-info';

            const nm = document.createElement('div');
            nm.className = 'surv-fr-name';
            nm.textContent = friend.username;

            const st = document.createElement('div');
            st.className = 'surv-fr-status' + (friend.is_online ? ' online' : '');
            st.textContent = friend.is_online ? window.i18nT('survival.online') : (friend.last_seen_text || window.i18nT('survival.offline'));

            info.appendChild(nm);
            info.appendChild(st);

            const btn = document.createElement('button');
            btn.className = 'surv-fr-inv-btn';
            const sent = pendingInvites.has(friend.username);
            btn.textContent = sent ? window.i18nT('survival.sent') : window.i18nT('survival.inviteBtn');
            if (sent) btn.disabled = true;

            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = '...';
                await sendInvite(friend.username, btn);
            });

            row.appendChild(av);
            row.appendChild(info);
            row.appendChild(btn);
            list.appendChild(row);
        });
    } catch {
        list.innerHTML = `<div class="surv-modal-empty">${window.i18nT('survival.errorFriends')}</div>`;
    }
}

async function sendInvite(username, btn) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(
            `${API_BASE}/survival/invite/${roomId}/${encodeURIComponent(username)}`,
            { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
            pendingInvites.add(username);
            if (btn) { btn.textContent = window.i18nT('survival.sent'); btn.disabled = true; }
        } else {
            if (btn) { btn.textContent = 'Error'; btn.disabled = false; }
        }
    } catch {
        if (btn) { btn.textContent = 'Error'; btn.disabled = false; }
    }
}

// ── Start game ────────────────────────────────────────────────────────────────

async function startGame() {
    const btn = document.getElementById('survStartBtn');
    btn.disabled = true;
    btn.textContent = window.i18nT('survival.starting');
    try {
        await ensureRoom();
        const token = localStorage.getItem('access_token');
        const res   = await fetch(`${API_BASE}/survival/room/${roomId}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            clearInterval(pollInterval);
            window.location.href = `/supervivencia/batalla?room=${roomId}`;
        } else {
            btn.disabled = false;
            btn.textContent = window.i18nT('survival.start');
        }
    } catch {
        btn.disabled = false;
        btn.textContent = 'INICIAR PARTIDA →';
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

    document.getElementById('survCloseModal').addEventListener('click', () => {
        document.getElementById('survInviteModal').classList.add('hidden');
    });
    document.getElementById('survInviteModal').addEventListener('click', e => {
        if (e.target === document.getElementById('survInviteModal')) {
            document.getElementById('survInviteModal').classList.add('hidden');
        }
    });

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { window.location.href = '/login'; return; }
        myUser = await res.json();

        document.getElementById('navUsername').textContent = myUser.username;
        const navAv = document.getElementById('navAvatar');
        if (myUser.avatar) {
            navAv.style.cssText = `background-image:url(${myUser.avatar});background-size:cover;background-position:center;border:1px solid var(--accent-cyan);`;
            navAv.textContent = '';
        } else {
            navAv.textContent = myUser.username.charAt(0).toUpperCase();
        }

        fetchRecord();

        const urlParams  = new URLSearchParams(window.location.search);
        const guestRoom  = urlParams.get('room');
        const isGuest    = urlParams.get('guest') === '1';

        if (guestRoom && isGuest) {
            // Guest: skip room creation, join existing room
            roomId        = guestRoom;
            isRoomCreated = true;
            pollRoom();
            pollInterval = setInterval(pollRoom, 2000);
        } else {
            renderSlots([{ username: myUser.username, avatar: myUser.avatar }]);
            ensureRoom();
        }

    } catch {
        window.location.href = '/login';
    }
});
