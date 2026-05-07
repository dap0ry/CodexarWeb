/* tournamentLobby.js — Tournament match lobby */

const API    = 'https://api.codexar.es/api';
const WS_API = 'wss://api.codexar.es/api';

const params       = new URLSearchParams(window.location.search);
const tournamentId = params.get('t');
const slotId       = params.get('s');

let ws            = null;
let timerInterval = null;
let done          = false;   // set when redirecting so WS close doesn't reconnect
let currentUser   = null;

function token() { return localStorage.getItem('access_token'); }

// ── Boot ───────────────────────────────────────────────────────────────────────

async function init() {
    if (!token() || !tournamentId || !slotId) {
        window.location.href = '/torneos';
        return;
    }

    const res = await fetch(`${API}/user/me`, {
        headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) { window.location.href = '/login'; return; }
    currentUser = await res.json();

    // Navbar
    const navU = document.getElementById('navUsername');
    const navA = document.getElementById('navAvatar');
    if (navU) navU.textContent = currentUser.username;
    if (navA) {
        if (currentUser.avatar) {
            navA.style.backgroundImage = `url('${currentUser.avatar}')`;
            navA.style.backgroundSize  = 'cover';
            navA.style.backgroundPosition = 'center';
        } else {
            navA.textContent = (currentUser.username || '?').charAt(0).toUpperCase();
        }
    }

    document.getElementById('logoutBtn')?.addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = '/';
    });

    document.getElementById('backBtn')?.addEventListener('click', () => {
        done = true;
        ws?.close(1000, 'user_left');
        window.location.href = '/torneos';
    });

    // Fill my slot
    const meAv   = document.getElementById('meAvatar');
    const meName = document.getElementById('meName');
    if (meName) meName.textContent = currentUser.username;
    if (meAv) {
        if (currentUser.avatar) {
            meAv.style.backgroundImage    = `url('${currentUser.avatar}')`;
            meAv.style.backgroundSize     = 'cover';
            meAv.style.backgroundPosition = 'center';
            meAv.textContent = '';
        } else {
            meAv.textContent = (currentUser.username || '?').charAt(0).toUpperCase();
        }
    }

    connectWS();
}

// ── WebSocket ──────────────────────────────────────────────────────────────────

function connectWS() {
    setStatus('Conectando al servidor...');
    const url = `${WS_API}/tournaments/${tournamentId}/${slotId}/ws?token=${encodeURIComponent(token())}`;
    ws = new WebSocket(url);

    ws.onopen  = () => setStatus('Conectado. Esperando rival...');
    ws.onmessage = e => handleMessage(JSON.parse(e.data));
    ws.onerror = () => setStatus('Error de conexión. Reintentando...');
    ws.onclose = e => {
        clearInterval(timerInterval);
        if (!done && e.code !== 1000) {
            setTimeout(connectWS, 2000);
        }
    };
}

// ── Message handler ────────────────────────────────────────────────────────────

function handleMessage(msg) {
    switch (msg.type) {

        case 'init': {
            setTournamentInfo(msg.tournament_name, msg.tournament_desc);
            setOpponent(msg.opponent);
            startCountdown(msg.remaining_seconds);
            setStatus('Esperando a que tu rival entre a la sala...');
            break;
        }

        case 'pending': {
            setTournamentInfo(msg.tournament_name, msg.tournament_desc);
            setStatus('Tu rival aún está en partida. Esperando que termine...');
            const badge = document.getElementById('opponentBadge');
            if (badge) {
                badge.textContent = 'En partida';
                badge.className = 'tl-player-badge tl-badge--pending';
            }
            document.getElementById('tournTag').textContent = '⌛ ESPERANDO';
            break;
        }

        case 'waiting':
            // Server keepalive during pending — no UI change needed
            break;

        case 'opponent_joined': {
            const avEl   = document.getElementById('opponentAvatar');
            const badge  = document.getElementById('opponentBadge');
            if (avEl) {
                avEl.classList.remove('tl-avatar--ghost');
                avEl.classList.add('tl-avatar--present');
            }
            if (badge) {
                badge.textContent  = '✓ En sala';
                badge.className = 'tl-player-badge tl-badge--present';
            }
            setStatus('¡Tu rival ha entrado! Iniciando partida...');
            break;
        }

        case 'tick':
            updateTimer(msg.remaining_seconds);
            break;

        case 'match_ready': {
            done = true;
            clearInterval(timerInterval);
            setStatus('¡Partida encontrada! Entrando al campo de batalla...');
            document.getElementById('lobbyBox')?.classList.add('tl-box--found');
            document.getElementById('statusMsg')?.classList.add('tl-status--found');
            document.getElementById('lobbyTimer').textContent = '';
            // Redirect after brief delay so the user sees the "found" state
            setTimeout(() => {
                window.location.href = `/ranked/batalla?match=${encodeURIComponent(msg.match_id)}`;
            }, 1000);
            break;
        }

        case 'forfeit': {
            done = true;
            clearInterval(timerInterval);
            setStatus(msg.message || 'Tiempo agotado. Avanzando en el bracket...');
            updateTimer(0);
            setTimeout(() => { window.location.href = '/torneos'; }, 3500);
            break;
        }

        case 'error': {
            done = true;
            clearInterval(timerInterval);
            setStatus(msg.message || 'Ha ocurrido un error. Volviendo al bracket...');
            setTimeout(() => { window.location.href = '/torneos'; }, 2500);
            break;
        }
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function setTournamentInfo(name, desc) {
    const nameEl = document.getElementById('tournName');
    const descEl = document.getElementById('tournDesc');
    if (nameEl) nameEl.textContent = name || '';
    if (descEl) descEl.textContent = desc || '';
}

function setOpponent(opp) {
    if (!opp) return;
    const avEl   = document.getElementById('opponentAvatar');
    const nameEl = document.getElementById('opponentName');
    if (nameEl) nameEl.textContent = opp.username || '—';
    if (avEl) {
        if (opp.avatar) {
            avEl.style.backgroundImage    = `url('${opp.avatar}')`;
            avEl.style.backgroundSize     = 'cover';
            avEl.style.backgroundPosition = 'center';
            avEl.textContent = '';
        } else if (opp.username) {
            avEl.textContent = opp.username.charAt(0).toUpperCase();
        }
    }
}

function startCountdown(seconds) {
    clearInterval(timerInterval);
    updateTimer(seconds);
    timerInterval = setInterval(() => {
        seconds = Math.max(0, seconds - 1);
        updateTimer(seconds);
        if (seconds <= 0) clearInterval(timerInterval);
    }, 1000);
}

function updateTimer(seconds) {
    const el = document.getElementById('lobbyTimer');
    if (!el) return;
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    el.textContent = `${m}:${s}`;
    el.classList.toggle('urgent', seconds < 30);
}

function setStatus(text) {
    const el = document.getElementById('statusMsg');
    if (el) el.textContent = text;
}

// ── Init ───────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', () => { ws?.close(1000, 'page_unload'); });
