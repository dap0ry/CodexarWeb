const API_BASE = 'https://api.codexar.es/api';

const BOSS_DATA = {
    boss1: {
        apiDifficulty: 'normal',
        tier:          'BOSS 1 · NORMAL',
        name:          'El Guardián',
        indexTag:      'BOSS_01',
        desc:          'El primero de los tres. Metódico y predecible. Domina los fundamentos y cae a tus pies.',
        timeBadge:     '⏱  60s · +10s por ejercicio',
        placeholderIcon: '◈',
    },
    boss2: {
        apiDifficulty: 'dificil',
        tier:          'BOSS 2 · DIFÍCIL',
        name:          'La Sombra',
        indexTag:      'BOSS_02',
        desc:          'Aprendió de los errores del Guardián. Más rápido, menos misericordioso. Exige precisión extrema.',
        timeBadge:     '⚡  45s · +7s por ejercicio',
        placeholderIcon: '◬',
    },
    boss3: {
        apiDifficulty: 'demencial',
        tier:          'BOSS 3 · DEMENCIAL',
        name:          'El Abismo',
        indexTag:      'BOSS_03',
        desc:          'Sin piedad. Sin margen de error. Solo los equipos más élite lo han visto caer.',
        timeBadge:     '☠  30s · +5s por ejercicio',
        placeholderIcon: '☠',
    },
};

/* ── State ── */
let selectedBoss   = 'boss1';
let roomId         = null;
let isRoomCreated  = false;
let creatingRoom   = false;
let pendingInvites = new Set();
let pollInterval   = null;
let myUser         = null;

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Boss selection ── */

function selectBoss(bossKey) {
    if (selectedBoss === bossKey) return;
    if (isRoomCreated && pendingInvites.size === 0 && !creatingRoom) {
        clearInterval(pollInterval);
        roomId        = null;
        isRoomCreated = false;
    }
    selectedBoss = bossKey;
    updateBossUI();
    fetchRecord();
    if (!isRoomCreated && !creatingRoom) ensureRoom();
}

function updateBossUI() {
    const boss = BOSS_DATA[selectedBoss];

    document.body.dataset.boss = selectedBoss;

    document.getElementById('sv3BossTier').textContent          = boss.tier;
    document.getElementById('sv3BossTitleC').textContent        = boss.name;
    document.getElementById('sv3BossDesc').textContent          = boss.desc;
    document.getElementById('sv3TimeBadge').textContent         = boss.timeBadge;
    document.getElementById('sv3BossIndexTag').textContent      = boss.indexTag;
    document.getElementById('sv3BossNameBig').textContent       = boss.name;
    document.getElementById('sv3BossPlaceholderIcon').textContent = boss.placeholderIcon;

    document.querySelectorAll('.sv3-boss-icon-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.boss === selectedBoss);
    });
}

/* ── Record ── */

async function fetchRecord() {
    const token = localStorage.getItem('access_token');
    const el    = document.getElementById('sv3RecordVal');
    el.textContent = '—';
    try {
        const boss = BOSS_DATA[selectedBoss];
        const res  = await fetch(
            `${API_BASE}/survival/my-record?difficulty=${boss.apiDifficulty}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        el.textContent = data.exercises_survived ?? '—';
    } catch { /* muestra — */ }
}

/* ── Room ── */

async function ensureRoom() {
    if (isRoomCreated && roomId) return;
    if (creatingRoom) return;
    creatingRoom = true;
    try {
        const token = localStorage.getItem('access_token');
        const boss  = BOSS_DATA[selectedBoss];
        const res   = await fetch(
            `${API_BASE}/survival/room?difficulty=${boss.apiDifficulty}`,
            { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        );
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
            const boss = BOSS_DATA[selectedBoss];
            window.location.href = `/supervivencia/batalla?room=${roomId}&difficulty=${boss.apiDifficulty}`;
            return;
        }
        renderSlots(data.players);
    } catch { /* silent */ }
}

/* ── Slots ── */

function renderSlots(players) {
    const container = document.getElementById('sv3Slots');
    container.innerHTML = '';

    players.forEach((player, idx) => {
        const slot = document.createElement('div');
        slot.className = 'sv3-slot';

        const av = document.createElement('div');
        av.className = 'sv3-slot-avatar filled';
        if (player.avatar) {
            const img = document.createElement('img');
            img.src   = player.avatar;
            img.alt   = escHtml(player.username);
            av.appendChild(img);
        } else {
            av.textContent = (player.username || '?').charAt(0).toUpperCase();
        }

        const name = document.createElement('div');
        name.className = 'sv3-slot-name' + (idx === 0 ? ' you' : '');
        name.textContent = idx === 0 ? 'TÚ' : player.username;

        slot.appendChild(av);
        slot.appendChild(name);
        container.appendChild(slot);
    });

    for (let i = players.length; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'sv3-slot';

        const av = document.createElement('div');
        av.className = 'sv3-slot-avatar empty';
        av.innerHTML = '<span class="sv3-slot-plus">+</span>';
        av.addEventListener('click', openInviteModal);

        const name = document.createElement('div');
        name.className = 'sv3-slot-name';
        name.textContent = 'VACÍO';

        slot.appendChild(av);
        slot.appendChild(name);
        container.appendChild(slot);
    }
}

/* ── Invite modal ── */

async function openInviteModal() {
    document.getElementById('sv3InviteModal').classList.remove('hidden');
    const list = document.getElementById('sv3FriendList');
    list.innerHTML = '<div class="sv3-modal-empty">Cargando...</div>';

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
            list.innerHTML = '<div class="sv3-modal-empty">No tienes amigos aún.</div>';
            return;
        }

        list.innerHTML = '';
        friends.forEach(friend => {
            const row = document.createElement('div');
            row.className = 'sv3-fr-row';

            const av = document.createElement('div');
            av.className = 'sv3-fr-av';
            if (friend.avatar) {
                const img = document.createElement('img');
                img.src   = friend.avatar;
                av.appendChild(img);
            } else {
                av.textContent = (friend.username || '?').charAt(0).toUpperCase();
            }

            const info   = document.createElement('div');
            info.className = 'sv3-fr-info';

            const nm = document.createElement('div');
            nm.className = 'sv3-fr-name';
            nm.textContent = friend.username;

            const st = document.createElement('div');
            st.className = 'sv3-fr-status' + (friend.is_online ? ' online' : '');
            st.textContent = friend.is_online ? '● En línea' : (friend.last_seen_text || 'Desconectado');

            info.appendChild(nm);
            info.appendChild(st);

            const btn  = document.createElement('button');
            btn.className = 'sv3-fr-inv-btn';
            const sent = pendingInvites.has(friend.username);
            btn.textContent = sent ? 'Enviado' : 'Invitar';
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
        list.innerHTML = '<div class="sv3-modal-empty">Error cargando amigos.</div>';
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
            if (btn) { btn.textContent = 'Enviado'; btn.disabled = true; }
        } else {
            if (btn) { btn.textContent = 'Error'; btn.disabled = false; }
        }
    } catch {
        if (btn) { btn.textContent = 'Error'; btn.disabled = false; }
    }
}

/* ── Start game ── */

async function startGame() {
    const btn = document.getElementById('sv3StartBtn');
    btn.disabled = true;
    btn.textContent = 'INICIANDO...';
    try {
        await ensureRoom();
        const token = localStorage.getItem('access_token');
        const res   = await fetch(`${API_BASE}/survival/room/${roomId}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            clearInterval(pollInterval);
            const boss = BOSS_DATA[selectedBoss];
            window.location.href = `/supervivencia/batalla?room=${roomId}&difficulty=${boss.apiDifficulty}`;
        } else {
            btn.disabled = false;
            btn.textContent = 'INICIAR PARTIDA →';
        }
    } catch {
        btn.disabled = false;
        btn.textContent = 'INICIAR PARTIDA →';
    }
}

/* ── Init ── */

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }

    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = '/login';
    });

    document.getElementById('sv3InviteBtn').addEventListener('click', openInviteModal);

    document.getElementById('sv3CloseModal').addEventListener('click', () => {
        document.getElementById('sv3InviteModal').classList.add('hidden');
    });
    document.getElementById('sv3InviteModal').addEventListener('click', e => {
        if (e.target === document.getElementById('sv3InviteModal')) {
            document.getElementById('sv3InviteModal').classList.add('hidden');
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

        updateBossUI();
        renderSlots([{ username: myUser.username, avatar: myUser.avatar }]);
        fetchRecord();
        ensureRoom();

    } catch {
        window.location.href = '/login';
    }
});
