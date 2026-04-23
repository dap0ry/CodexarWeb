const PR_API = 'https://api.codexar.es/api';

let currentUser = null;
let toastTimer  = null;

function token() { return localStorage.getItem('access_token'); }

function showToast(msg, isErr = false) {
    const el = document.getElementById('prToast');
    el.textContent = msg;
    el.className = `pr-toast${isErr ? ' err' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function setBoostFeedback(msg, ok) {
    const el = document.getElementById('boostFeedback');
    if (!el) return;
    el.textContent = msg;
    el.className = `pr-boost-feedback ${ok ? 'ok' : 'err'}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function initPricing() {
    // Navbar
    const t = token();
    if (t) {
        const res = await fetch(`${PR_API}/user/me`, { headers: { 'Authorization': `Bearer ${t}` } });
        if (res.ok) {
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
        }
    }

    // Check success/cancel redirect from Stripe
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
        showToast('¡Suscripción activada! Bienvenido al plan premium.');
        window.history.replaceState({}, '', 'Pricing.html');
    } else if (params.get('cancel') === '1') {
        showToast('Proceso de pago cancelado.', true);
        window.history.replaceState({}, '', 'Pricing.html');
    }

    if (currentUser) {
        await loadSubscriptionStatus();
    }
}

// ── Load subscription status and update UI ────────────────────────────────────
async function loadSubscriptionStatus() {
    try {
        const res = await fetch(`${PR_API}/subscriptions/status`, {
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (!res.ok) return;
        const sub = await res.json();
        applyPlanUI(sub);
    } catch { /* silent */ }
}

function applyPlanUI(sub) {
    const plan = sub.plan;

    const planBanner = document.getElementById('prCurrentPlan');
    const plusBtn    = document.getElementById('plusBtn');
    const maxBtn     = document.getElementById('maxBtn');
    const boostSec   = document.getElementById('prBoostSection');

    if (plan && sub.status !== 'none') {
        const planLabel = plan === 'max' ? 'Max' : 'Plus';
        const expires = sub.expires_at
            ? new Date(sub.expires_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
            : '—';
        planBanner.innerHTML = `
            <span>Plan activo: <strong>${planLabel}</strong> · Renueva el ${expires}</span>
            <button class="pr-manage-btn" onclick="openPortal()">Gestionar suscripción</button>
        `;
        planBanner.classList.remove('hidden');

        if (plan === 'plus' || plan === 'plus_boosted') {
            plusBtn.textContent = 'Plan activo ✓';
            plusBtn.className   = 'pr-btn pr-btn-active';
            plusBtn.disabled    = true;
        } else if (plan === 'max') {
            maxBtn.textContent = 'Plan activo ✓';
            maxBtn.className   = 'pr-btn pr-btn-active';
            maxBtn.disabled    = true;
            plusBtn.textContent = 'Incluido en Max ✓';
            plusBtn.className   = 'pr-btn pr-btn-active';
            plusBtn.disabled    = true;
            boostSec.classList.remove('hidden');
            renderBoostStatus(sub.boosted_friend);
        }
    }
}

function renderBoostStatus(boostedFriend) {
    const statusEl = document.getElementById('prBoostStatus');
    const formEl   = document.getElementById('prBoostForm');
    if (!statusEl) return;

    if (boostedFriend) {
        statusEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;font-family:'JetBrains Mono',monospace;font-size:0.72rem;">
                <span style="color:rgba(255,196,0,0.8)">Boost activo para: <strong>${boostedFriend}</strong></span>
                <button class="pr-manage-btn" onclick="removeBoost()" style="border-color:rgba(255,85,102,0.3);color:rgba(255,85,102,0.7);">Retirar boost</button>
            </div>
        `;
        if (formEl) formEl.style.display = 'none';
    } else {
        statusEl.innerHTML = '';
        if (formEl) formEl.style.display = 'flex';
    }
}

// ── Subscribe ─────────────────────────────────────────────────────────────────
async function subscribe(plan) {
    if (!token()) { window.location.href = 'Login.html'; return; }

    const btn = document.getElementById(plan + 'Btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Redirigiendo...'; }

    const base = window.location.origin + '/src/pages/Pricing.html';
    try {
        const res = await fetch(`${PR_API}/subscriptions/create-checkout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan,
                success_url: base + '?success=1',
                cancel_url:  base + '?cancel=1',
            })
        });
        const data = await res.json();
        if (res.ok && data.url) {
            window.location.href = data.url;
        } else {
            showToast(data.detail || 'Error iniciando el pago.', true);
            if (btn) { btn.disabled = false; btn.textContent = plan === 'plus' ? 'Suscribirse por €0.99/mes' : 'Suscribirse por $9.99/mes'; }
        }
    } catch {
        showToast('Error de conexión.', true);
        if (btn) { btn.disabled = false; }
    }
}

// ── Open customer portal ──────────────────────────────────────────────────────
async function openPortal() {
    const base = window.location.origin + '/src/pages/Pricing.html';
    try {
        const res = await fetch(`${PR_API}/subscriptions/portal?return_url=${encodeURIComponent(base)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok && data.url) window.location.href = data.url;
        else showToast(data.detail || 'Error abriendo portal.', true);
    } catch { showToast('Error de conexión.', true); }
}

// ── Boost friend ──────────────────────────────────────────────────────────────
async function applyBoost() {
    const username = document.getElementById('boostInput').value.trim();
    if (!username) return;
    try {
        const res = await fetch(`${PR_API}/subscriptions/boost-friend`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ friend_username: username })
        });
        const data = await res.json();
        if (res.ok) {
            setBoostFeedback(data.message, true);
            document.getElementById('boostInput').value = '';
            renderBoostStatus(username);
        } else {
            setBoostFeedback(data.detail || 'Error.', false);
        }
    } catch { setBoostFeedback('Error de conexión.', false); }
}

async function removeBoost() {
    try {
        const res = await fetch(`${PR_API}/subscriptions/boost-friend`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok) {
            setBoostFeedback(data.message, true);
            renderBoostStatus(null);
        } else {
            setBoostFeedback(data.detail || 'Error.', false);
        }
    } catch { setBoostFeedback('Error de conexión.', false); }
}

window.addEventListener('DOMContentLoaded', initPricing);
