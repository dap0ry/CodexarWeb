(function () {
    'use strict';
    const API_BASE = 'https://api.codexar.es/api';
    const shown = new Set();   // invite_ids ya mostrados (evita duplicados)
    const TOAST_TIMEOUT = 30000; // auto-cerrar en 30s

    // ── Inject global styles once ──────────────────────────────
    if (!document.getElementById('fn-styles')) {
        const style = document.createElement('style');
        style.id = 'fn-styles';
        style.textContent = `
            #fn-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: flex-end;
                pointer-events: none;
            }
            .fn-toast {
                pointer-events: all;
                background: rgba(8, 10, 20, 0.97);
                border: 1px solid var(--accent-cyan, #00d4ff);
                border-radius: 12px;
                padding: 14px 18px;
                min-width: 270px;
                max-width: 320px;
                box-shadow: 0 4px 28px rgba(0, 212, 255, 0.18), 0 2px 10px rgba(0,0,0,0.5);
                animation: fnSlideIn 0.3s cubic-bezier(.22,.68,0,1.2) both;
                font-family: 'JetBrains Mono', monospace;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .fn-toast.fn-hiding {
                animation: fnSlideOut 0.25s ease forwards;
            }
            @keyframes fnSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes fnSlideOut {
                from { transform: translateX(0);    opacity: 1; }
                to   { transform: translateX(120%); opacity: 0; }
            }
            .fn-toast-header {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .fn-toast-icon {
                font-size: 1.2rem;
                flex-shrink: 0;
            }
            .fn-toast-body {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }
            .fn-toast-title {
                font-size: 0.78rem;
                font-weight: 700;
                color: var(--accent-cyan, #00d4ff);
                letter-spacing: 0.3px;
            }
            .fn-toast-sub {
                font-size: 0.68rem;
                color: rgba(200, 210, 230, 0.65);
                letter-spacing: 0.2px;
            }
            .fn-toast-actions {
                display: flex;
                gap: 8px;
            }
            .fn-btn {
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
            .fn-btn-accept {
                background: rgba(0, 212, 255, 0.1);
                border-color: rgba(0, 212, 255, 0.35);
                color: var(--accent-cyan, #00d4ff);
            }
            .fn-btn-accept:hover {
                background: rgba(0, 212, 255, 0.22);
                border-color: rgba(0, 212, 255, 0.6);
            }
            .fn-btn-reject {
                background: transparent;
                border-color: rgba(255, 85, 85, 0.25);
                color: rgba(255, 100, 100, 0.7);
            }
            .fn-btn-reject:hover {
                background: rgba(255, 85, 85, 0.08);
                border-color: rgba(255, 85, 85, 0.5);
                color: #ff6b6b;
            }
            .fn-btn:disabled { opacity: 0.5; cursor: default; pointer-events: none; }
        `;
        document.head.appendChild(style);
    }

    // ── Container for toasts ───────────────────────────────────
    function getContainer() {
        let el = document.getElementById('fn-container');
        if (!el) {
            el = document.createElement('div');
            el.id = 'fn-container';
            document.body.appendChild(el);
        }
        return el;
    }

    function closeToast(toast) {
        toast.classList.add('fn-hiding');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }

    // ── Create and show one toast ──────────────────────────────
    function createToast(invite_id, from_username) {
        const container = getContainer();
        const toast = document.createElement('div');
        toast.className = 'fn-toast';
        toast.dataset.inviteId = invite_id;

        const safeUser = String(from_username).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        toast.innerHTML = `
            <div class="fn-toast-header">
                <span class="fn-toast-icon">⚔</span>
                <div class="fn-toast-body">
                    <span class="fn-toast-title">${safeUser} te reta</span>
                    <span class="fn-toast-sub">Batalla amistosa — sin ELO</span>
                </div>
            </div>
            <div class="fn-toast-actions">
                <button class="fn-btn fn-btn-accept" id="fn-accept-${invite_id}">Aceptar</button>
                <button class="fn-btn fn-btn-reject" id="fn-reject-${invite_id}">Rechazar</button>
            </div>
        `;

        container.appendChild(toast);

        const acceptBtn = toast.querySelector(`#fn-accept-${invite_id}`);
        const rejectBtn = toast.querySelector(`#fn-reject-${invite_id}`);

        acceptBtn.addEventListener('click', async () => {
            acceptBtn.disabled = true;
            rejectBtn.disabled = true;
            acceptBtn.textContent = '…';
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch(`${API_BASE}/friendly/accept/${invite_id}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const { match_id } = await res.json();
                    closeToast(toast);
                    window.location.href = `/friendly/batalla?match=${match_id}`;
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
                await fetch(`${API_BASE}/friendly/reject/${invite_id}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch { /* silent */ }
            closeToast(toast);
        });

        // Auto-close after TOAST_TIMEOUT
        setTimeout(() => {
            if (toast.isConnected) closeToast(toast);
        }, TOAST_TIMEOUT);
    }

    // ── Polling ────────────────────────────────────────────────
    async function checkInvites() {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/friendly/pending`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const invites = await res.json();
            for (const inv of invites) {
                if (!shown.has(inv.invite_id)) {
                    shown.add(inv.invite_id);
                    createToast(inv.invite_id, inv.from_username);
                }
            }
        } catch { /* silent */ }
    }

    // Start polling when DOM is ready (or immediately if already loaded)
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
