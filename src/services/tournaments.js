const API = 'https://api.codexar.es/api';

let currentUser = null;
let currentFilter = 'active';

function token() { return localStorage.getItem('access_token'); }
function authHeaders() { return { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' }; }

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function initTournaments() {
    if (!token()) { window.location.href = 'Login.html'; return; }

    const res = await fetch(`${API}/user/me`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if (!res.ok) { window.location.href = 'Login.html'; return; }
    currentUser = await res.json();

    const navUser = document.getElementById('navUsername');
    const navAvatar = document.getElementById('navAvatar');
    if (navUser) navUser.textContent = currentUser.username;
    if (navAvatar) {
        if (currentUser.avatar) {
            navAvatar.style.backgroundImage = `url(${currentUser.avatar})`;
            navAvatar.style.backgroundSize = 'cover'; navAvatar.style.backgroundPosition = 'center';
        } else navAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', e => {
        e.preventDefault(); localStorage.removeItem('access_token'); window.location.href = 'index.html';
    });

    // Tabs
    document.querySelectorAll('.tourn-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tourn-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            loadTournaments();
        });
    });

    await loadTournaments();
}

// ── Load Tournaments ──────────────────────────────────────────────────────────
async function loadTournaments() {
    const content = document.getElementById('tournContent');
    content.innerHTML = '<div class="tourn-loading">Cargando torneos...</div>';

    try {
        const endpoint = currentFilter === 'active' ? '/tournaments/active' : '/tournaments';
        const res = await fetch(`${API}${endpoint}`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) throw new Error();
        const tournaments = await res.json();

        content.innerHTML = '';
        if (!tournaments || tournaments.length === 0) {
            content.innerHTML = '<div class="tourn-empty">No hay torneos disponibles en este momento.</div>';
            return;
        }
        tournaments.forEach(t => content.appendChild(buildTournamentCard(t)));
    } catch (e) {
        content.innerHTML = '<div class="tourn-empty">No se pudieron cargar los torneos.</div>';
    }
}

// ── Build Card ────────────────────────────────────────────────────────────────
function buildTournamentCard(t) {
    const card = document.createElement('div');
    card.className = `tourn-card status-${t.status}`;

    const statusLabel = { upcoming: 'Próximo', active: 'En Curso', finished: 'Finalizado' }[t.status] || t.status;
    const participantCount = (t.participants || []).length;
    const exerciseCount    = (t.exercise_ids || []).length;

    let footerHtml = `<span class="tourn-teams-count">👥 ${participantCount} equipo${participantCount !== 1 ? 's' : ''} · ${exerciseCount} ejercicio${exerciseCount !== 1 ? 's' : ''}</span>`;

    if (t.status === 'upcoming' || t.status === 'active') {
        footerHtml += `<button class="btn-register-team" data-id="${t.id}">Inscribirse</button>`;
    } else if (t.status === 'finished' && t.winner_team) {
        footerHtml += `<span style="font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:#ffd700;font-weight:700;">🏆 Ganador registrado</span>`;
    }

    card.innerHTML = `
        <div class="tourn-card-top">
            <div class="tourn-card-name">${esc(t.name)}</div>
            <span class="tourn-status-badge ${t.status}">${statusLabel}</span>
        </div>
        ${t.description ? `<div class="tourn-card-desc">${esc(t.description)}</div>` : ''}
        <div class="tourn-card-meta">
            <div class="tourn-meta-item">
                <div class="tourn-meta-label">Inicio</div>
                <div class="tourn-meta-val">${formatDate(t.start_time)}</div>
            </div>
            <div class="tourn-meta-item">
                <div class="tourn-meta-label">Premio</div>
                <div class="tourn-meta-val prize-val">${t.prize ? esc(t.prize) : '—'}</div>
            </div>
        </div>
        <div class="tourn-card-footer">${footerHtml}</div>
    `;

    // Register button handler
    const regBtn = card.querySelector('.btn-register-team');
    if (regBtn) {
        regBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            regBtn.disabled = true;
            regBtn.textContent = '...';
            const r = await fetch(`${API}/tournaments/${t.id}/register`, {
                method: 'POST', headers: authHeaders()
            });
            const d = await r.json();
            if (r.ok) {
                regBtn.textContent = '✓ Inscrito';
                regBtn.style.color = 'var(--accent-green)';
            } else {
                alert(d.detail || 'Error al inscribirse');
                regBtn.disabled = false;
                regBtn.textContent = 'Inscribirse';
            }
        });
    }

    return card;
}

window.addEventListener('DOMContentLoaded', initTournaments);
