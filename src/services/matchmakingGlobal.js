/**
 * matchmakingGlobal.js
 * Persistent matchmaking state across page navigations.
 * Uses localStorage to track active search and WebSocket for server communication.
 * Exposes globals: startMatchmaking, cancelMatchmaking, isMatchmakingActive, showCancelConfirmModal
 */

const _MM_KEY = 'codexar_mm';
const _WS_BASE = 'wss://api.codexar.es/api';

let _ws = null;
let _barTimer = null;
let _barSeconds = 0;

function _getState() {
    try { return JSON.parse(localStorage.getItem(_MM_KEY) || 'null'); } catch { return null; }
}

function _setState(s) {
    if (s) localStorage.setItem(_MM_KEY, JSON.stringify(s));
    else localStorage.removeItem(_MM_KEY);
}

// ── Public API ────────────────────────────────────────────────────────────────

window.isMatchmakingActive = function () {
    const s = _getState();
    return !!(s && s.active);
};

window.startMatchmaking = function (mode) {
    _setState({ active: true, mode, startTime: Date.now() });
    _showBar();
    _connectWS(mode);
};

window.cancelMatchmaking = function () {
    _cleanupWS();
    _hideBar();
    _setState(null);
};

window.showCancelConfirmModal = function (onYes, onNo) {
    if (document.getElementById('mm-confirm-modal')) return;

    const el = document.createElement('div');
    el.id = 'mm-confirm-modal';
    el.innerHTML = `
        <div class="mm-modal-overlay">
            <div class="mm-modal-box">
                <p class="mm-modal-text">¿Estás seguro de cancelar el emparejamiento?</p>
                <div class="mm-modal-btns">
                    <button class="mm-modal-btn mm-btn-yes" id="mm-modal-yes">Sí</button>
                    <button class="mm-modal-btn mm-btn-no"  id="mm-modal-no">No</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    document.getElementById('mm-modal-yes').addEventListener('click', () => {
        el.remove();
        window.cancelMatchmaking();
        onYes();
    });
    document.getElementById('mm-modal-no').addEventListener('click', () => {
        el.remove();
        onNo();
    });
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function _connectWS(mode) {
    if (_ws && _ws.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    _ws = new WebSocket(`${_WS_BASE}/matchmaking/ws?token=${token}`);

    _ws.onopen = () => {
        _ws.send(JSON.stringify({ action: 'join' }));
    };

    _ws.onmessage = (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }

        if (data.status === 'matched') {
            _setState(null);

            // Flash "found" text in bar before navigating
            const textEl = document.querySelector('.mm-bar-text');
            if (textEl) textEl.textContent = '¡RIVAL ENCONTRADO!';

            _ws = null;
            setTimeout(() => {
                _hideBar();
                window.location.href = `RankedBattle.html?id=${data.match_id}`;
            }, 1000);
        }
    };

    _ws.onerror = () => { _ws = null; };
    _ws.onclose = () => { _ws = null; };
}

function _cleanupWS() {
    if (_ws) {
        try {
            if (_ws.readyState === WebSocket.OPEN) {
                _ws.send(JSON.stringify({ action: 'leave' }));
            }
            _ws.close();
        } catch { /* ignore */ }
        _ws = null;
    }
}

function _showBar() {
    if (document.getElementById('mm-global-bar')) return;

    const state = _getState();
    _barSeconds = state ? Math.max(0, Math.floor((Date.now() - state.startTime) / 1000)) : 0;

    const bar = document.createElement('div');
    bar.id = 'mm-global-bar';
    bar.innerHTML = `
        <div class="mm-bar-dots"><span></span><span></span><span></span></div>
        <span class="mm-bar-text">Buscando partida...</span>
        <span class="mm-bar-timer" id="mm-bar-timer">0:00</span>
        <button class="mm-bar-cancel" id="mm-bar-cancel-btn">Cancelar</button>`;

    // Inject inside the navbar, centered between brand and user pill
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.appendChild(bar);
    } else {
        document.body.appendChild(bar);
    }

    document.getElementById('mm-bar-cancel-btn').addEventListener('click', () => {
        window.cancelMatchmaking();
    });

    _updateBarTimer();
    _barTimer = setInterval(() => {
        _barSeconds++;
        _updateBarTimer();
    }, 1000);
}

function _updateBarTimer() {
    const el = document.getElementById('mm-bar-timer');
    if (!el) return;
    const m = Math.floor(_barSeconds / 60);
    const s = _barSeconds % 60;
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

function _hideBar() {
    if (_barTimer) { clearInterval(_barTimer); _barTimer = null; }
    const bar = document.getElementById('mm-global-bar');
    if (bar) bar.remove();
}

function _initGlobalMatchmaking() {
    const state = _getState();
    if (!state || !state.active) return;
    _showBar();
    _connectWS(state.mode);
}

// Auto-run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initGlobalMatchmaking);
} else {
    _initGlobalMatchmaking();
}
