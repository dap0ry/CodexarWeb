(function () {
    'use strict';
    const API_BASE = 'https://api.codexar.es/api';
    const shown = new Set();      // invite_ids ya mostrados (evita duplicados)
    const TOAST_TIMEOUT = 30000;  // auto-cerrar en 30s

    const DIFF_LABELS = {
        normal:    'Normal',
        dificil:   'Difícil',
        demencial: 'Demencial',
    };

    // ── Inject global styles once (reuses fn-* classes from friendlyNotifications) ──
    if (!document.getElementById('sn-styles')) {
        const style = document.createElement('style');
        style.id = 'sn-styles';
        style.textContent = `
            #sn-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9998;
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: flex-end;
                pointer-events: none;
            }
            .sn-toast {
                pointer-events: all;
                background: rgba(8, 10, 20, 0.97);
                border: 1px solid rgba(57, 255, 20, 0.45);
                border-radius: 12px;
                padding: 14px 18px;
                min-width: 270px;
                max-width: 320px;
                box-shadow: 0 4px 28px rgba(57, 255, 20, 0.12), 0 2px 10px rgba(0,0,0,0.5);
                animation: snSlideIn 0.3s cubic-bezier(.22,.68,0,1.2) both;
                font-family: 'JetBrains Mono', monospace;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .sn-toast.sn-hiding {
                animation: snSlideOut 0.25s ease forwards;
            }
            @keyframes snSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes snSlideOut {
                from { transform: translateX(0);    opacity: 1; }
                to   { transform: translateX(120%); opacity: 0; }
            }
            .sn-toast-header {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .sn-toast-icon { font-size: 1.2rem; flex-shrink: 0; }
            .sn-toast-body {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }
            .sn-toast-title {
                font-size: 0.78rem;
                font-weight: 700;
                color: #39ff14;
                letter-spacing: 0.3px;
            }
            .sn-toast-sub {
                font-size: 0.68rem;
                color: rgba(200, 210, 230, 0.65);
                letter-spacing: 0.2px;
            }
            .sn-toast-actions { display: flex; gap: 8px; }
            .sn-btn {
                flex: 1;
                padding: 7px 0;
                border-radius: 7px;
                border: 1px solid;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.65rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                cursor: pointer;
                transition: all 0.15s;
            }
            .sn-btn-accept {
                background: rgba(57, 255, 20, 0.1);
                border-color: rgba(57, 255, 20, 0.35);
                color: #39ff14;
            }
            .sn-btn-accept:hover {
                background: rgba(57, 255, 20, 0.22);
                border-color: rgba(57, 255, 20, 0.6);
            }
            .sn-btn-reject {
                background: transparent;
                border-color: rgba(255, 85, 85, 0.25);
                color: rgba(255, 100, 100, 0.7);
            }
            .sn-btn-reject:hover {
                background: rgba(255, 85, 85, 0.08);
                border-color: rgba(255, 85, 85, 0.5);
                color: #ff6b6b;
            }
            .sn-btn:disabled { opacity: 0.5; cursor: default; pointer-events: none; }
        `;
        document.head.appendChild(style);
    }

    // ── Container ──────────────────────────────────────────────
    function getContainer() {
        let el = document.getElementById('sn-container');
        if (!el) {
            el = document.createElement('div');
            el.id = 'sn-container';
            document.body.appendChild(el);
        }
        return el;
    }

    function closeToast(toast) {
        toast.classList.add('sn-hiding');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }

    // ── Create and show one toast ──────────────────────────────
    function createToast(invite) {
        const container = getContainer();
        const toast = document.createElement('div');
        toast.className = 'sn-toast';
        toast.dataset.inviteId = invite.invite_id;

        const safeUser = String(invite.from_username).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const diffLabel = DIFF_LABELS[invite.difficulty] || invite.difficulty || '';

        toast.innerHTML = `
            <div class="sn-toast-header">
                <span class="sn-toast-icon">⚡</span>
                <div class="sn-toast-body">
                    <span class="sn-toast-title">${safeUser} te invita a Supervivencia</span>
                    <span class="sn-toast-sub">Dificultad: ${diffLabel}</span>
                </div>
            </div>
            <div class="sn-toast-actions">
                <button class="sn-btn sn-btn-accept" id="sn-accept-${invite.invite_id}">Unirse</button>
                <button class="sn-btn sn-btn-reject" id="sn-reject-${invite.invite_id}">Rechazar</button>
            </div>
        `;

        container.appendChild(toast);

        const acceptBtn = toast.querySelector(`#sn-accept-${invite.invite_id}`);
        const rejectBtn = toast.querySelector(`#sn-reject-${invite.invite_id}`);

        acceptBtn.addEventListener('click', async () => {
            acceptBtn.disabled = true;
            rejectBtn.disabled = true;
            acceptBtn.textContent = '…';
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch(`${API_BASE}/survival/accept/${invite.invite_id}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    closeToast(toast);
                    window.location.href = `/supervivencia/lobby?room=${data.room_id}&difficulty=${data.difficulty}&guest=1`;
                } else {
                    closeToast(toast);
                }
            } catch {
                closeToast(toast);
            }
        });

        rejectBtn.addEventListener('click', async () => {
            acceptBtn.disabled = true;
            rejectBtn.disabled = true;
            const token = localStorage.getItem('access_token');
            try {
                await fetch(`${API_BASE}/survival/reject/${invite.invite_id}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch { /* silent */ }
            closeToast(toast);
        });

        setTimeout(() => {
            if (toast.isConnected) closeToast(toast);
        }, TOAST_TIMEOUT);
    }

    // ── Polling ────────────────────────────────────────────────
    async function checkInvites() {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/survival/pending-invites`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const invites = await res.json();
            for (const inv of invites) {
                if (!shown.has(inv.invite_id)) {
                    shown.add(inv.invite_id);
                    createToast(inv);
                }
            }
        } catch { /* silent */ }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            checkInvites();
            setInterval(checkInvites, 3000);
        });
    } else {
        checkInvites();
        setInterval(checkInvites, 3000);
    }
})();
