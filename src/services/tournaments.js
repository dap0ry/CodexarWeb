/* tournaments.js — exercise-scoring tournaments */
const API_BASE = 'https://api.codexar.es/api';

function token() { return localStorage.getItem('token') || ''; }
function userEmail() { return localStorage.getItem('email') || ''; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

let _isAdmin = false;

function diffColor(d) {
    if (d <= 900)  return '#4ade80';
    if (d <= 1200) return '#86efac';
    if (d <= 1600) return '#fbbf24';
    if (d <= 2200) return '#f97316';
    if (d <= 2800) return '#ef4444';
    return '#a855f7';
}

function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function lbSymbol(i) { return ['🥇','🥈','🥉'][i] || (i + 1); }
function lbClass(i)  { return ['gold','silver','bronze'][i] || ''; }

function buildLeaderboard(lb, cardId) {
    if (!lb || !lb.length) return '';
    const rows = lb.map((row, i) => {
        const av = row.avatar
            ? `<img class="t-lb-av" src="${esc(row.avatar)}" alt="">`
            : `<span class="t-lb-av-ph">${esc((row.username||'?')[0]).toUpperCase()}</span>`;
        const mins = Math.floor((row.total_time || 0) / 60);
        const secs = (row.total_time || 0) % 60;
        return `<tr>
            <td class="t-lb-rank ${lbClass(i)}">${lbSymbol(i)}</td>
            <td class="t-lb-name">${av}${esc(row.username)}</td>
            <td>${row.exercises_solved || 0}</td>
            <td class="t-lb-score">${row.total_score || 0}</td>
            <td>${mins}:${String(secs).padStart(2,'0')}</td>
        </tr>`;
    }).join('');
    return `<button class="t-lb-toggle" onclick="toggleLb(event,'${cardId}')">📊 Ver clasificación (${lb.length}) ▾</button>
        <div class="t-lb-wrap" id="lb-${cardId}">
            <table class="t-lb-table">
                <thead><tr><th>#</th><th>Jugador</th><th>Ej</th><th>Pts</th><th>Tiempo</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function buildCard(t, myEmail) {
    const status   = t.status || 'upcoming';
    const id       = esc(t.id || '');
    const isJoined = (t.participants || []).includes(myEmail);

    const badgeClass = { upcoming: 't-badge--upcoming', active: 't-badge--active', finished: 't-badge--finished' }[status] || '';
    const badgeLabel = { upcoming: 'PRÓXIMO', active: 'ACTIVO', finished: 'FINALIZADO' }[status] || status.toUpperCase();

    const durH = Math.round((t.duration_minutes || 240) / 60);
    const dateStr = status === 'upcoming' ? fmtDate(t.start_time) : status === 'active' ? fmtDate(t.started_at) : fmtDate(t.ended_at);

    // Banner
    const banner = t.banner_url
        ? `<img class="t-card-banner" src="${esc(t.banner_url)}" alt="">`
        : `<div class="t-card-banner-placeholder"></div>`;

    // Winner
    let winner = '';
    if (status === 'finished' && t.winner) {
        const wAv = t.winner.avatar
            ? `<img class="t-card-winner-av" src="${esc(t.winner.avatar)}" alt="">`
            : `<div class="t-card-winner-av t-card-winner-av--initial">${esc((t.winner.username||'?')[0]).toUpperCase()}</div>`;
        winner = `<div class="t-card-winner">
            <span class="t-card-winner-label">Ganador</span>
            ${wAv}
            <span class="t-card-winner-name">${esc(t.winner.username)}</span>
        </div>`;
    }

    // Exercises
    const exercises = t.exercises_info || [];
    let exSection = '';
    if (exercises.length) {
        const pills = exercises.map(ex => {
            const c = diffColor(ex.difficulty || 800);
            return `<span class="t-ex-pill">${esc(ex.title_i18n?.es || ex.title || '?')}<span class="t-ex-pts" style="color:${c}">${ex.difficulty || 800}</span></span>`;
        }).join('');
        exSection = `<div class="t-card-exercises">${pills}</div>`;
    }

    // Leaderboard
    const lb = t.leaderboard || [];
    const lbSection = lb.length ? buildLeaderboard(lb, id) : '';

    // Footer buttons (right side)
    let rightBtns = '';
    if (status === 'upcoming') {
        if (isJoined) {
            rightBtns = `<button class="t-join-card-btn t-join-card-btn--leave" onclick="leaveTourn('${id}',this)">Abandonar</button>`;
        } else {
            rightBtns = `<button class="t-join-card-btn t-join-card-btn--join" onclick="joinTourn('${id}',this)">Inscribirse</button>`;
        }
    } else if (status === 'active' && isJoined) {
        rightBtns = `<a href="/torneos/ayuda" class="t-join-card-btn t-join-card-btn--view" style="text-decoration:none">Jugar →</a>`;
    }

    // Admin buttons
    let adminBtns = '';
    if (_isAdmin) {
        if (status === 'upcoming') {
            adminBtns = `<button class="t-join-card-btn t-join-card-btn--start" onclick="startTourn('${id}',this)">▶ Iniciar</button>`;
        }
        adminBtns += `<button class="t-join-card-btn t-join-card-btn--del" onclick="deleteTourn('${id}','${esc(t.name)}')">✕</button>`;
    }

    // Footer left info
    const count = (t.participants || []).length;
    const enrolled = isJoined && status !== 'finished' ? '<span style="color:var(--accent-cyan);font-family:var(--font-mono);font-size:0.58rem;font-weight:700">✓ Inscrito</span>' : '';

    return `<div class="t-card">
        ${banner}
        <div class="t-card-body">
            <div class="t-card-top">
                <div class="t-card-name">${esc(t.name)}</div>
                <span class="t-badge ${badgeClass}">${badgeLabel}</span>
            </div>
            ${t.description ? `<div class="t-card-desc">${esc(t.description)}</div>` : ''}
            <div class="t-card-meta">
                <span data-icon="👥">${count} jugadores</span>
                <span data-icon="⏱">${durH}h</span>
                ${dateStr ? `<span data-icon="📅">${dateStr}</span>` : ''}
            </div>
            ${exSection}
            ${winner}
            ${lbSection}
        </div>
        <div class="t-card-footer">
            <div class="t-card-footer-left">
                <span class="t-card-count">${enrolled}</span>
            </div>
            <div class="t-card-footer-right">
                ${adminBtns}
                ${rightBtns}
            </div>
        </div>
    </div>`;
}

window.toggleLb = function(e, id) {
    e.stopPropagation();
    const wrap = document.getElementById(`lb-${id}`);
    const btn = wrap?.previousElementSibling;
    if (!wrap) return;
    wrap.classList.toggle('open');
    if (btn) btn.textContent = wrap.classList.contains('open')
        ? btn.textContent.replace('▾','▴')
        : btn.textContent.replace('▴','▾');
};

let _allTournaments = [];
let _activeFilter = 'all';

async function loadTournaments() {
    const grid = document.getElementById('tournGrid');
    try {
        const res = await fetch(`${API_BASE}/tournaments`, {
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (!res.ok) throw new Error();
        _allTournaments = await res.json();
        renderGrid();
    } catch {
        grid.innerHTML = '<div class="t-empty">Error al cargar torneos.</div>';
    }
}

function renderGrid() {
    const grid = document.getElementById('tournGrid');
    const myEmail = userEmail();
    const list = _activeFilter === 'all'
        ? _allTournaments
        : _allTournaments.filter(t => t.status === _activeFilter);
    if (!list.length) { grid.innerHTML = '<div class="t-empty">No hay torneos en esta categoría.</div>'; return; }
    grid.innerHTML = list.map(t => buildCard(t, myEmail)).join('');
}

window.joinTourn = async function(id, btn) {
    btn.disabled = true; btn.textContent = '...';
    try {
        const res = await fetch(`${API_BASE}/tournaments/${id}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok) { await loadTournaments(); }
        else { alert(data.detail || 'Error'); btn.disabled = false; btn.textContent = 'Inscribirse'; }
    } catch { btn.disabled = false; btn.textContent = 'Inscribirse'; }
};

window.leaveTourn = async function(id, btn) {
    if (!confirm('¿Abandonar el torneo?')) return;
    btn.disabled = true; btn.textContent = '...';
    try {
        const res = await fetch(`${API_BASE}/tournaments/${id}/leave`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok) { await loadTournaments(); }
        else { alert(data.detail || 'Error'); btn.disabled = false; btn.textContent = 'Abandonar'; }
    } catch { btn.disabled = false; btn.textContent = 'Abandonar'; }
};

window.startTourn = async function(id, btn) {
    if (!confirm('¿Iniciar el torneo ahora? Los participantes podrán empezar a resolver ejercicios.')) return;
    btn.disabled = true; btn.textContent = '...';
    try {
        const res = await fetch(`${API_BASE}/tournaments/${id}/start`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok) { await loadTournaments(); }
        else { alert(data.detail || 'Error'); btn.disabled = false; btn.textContent = '▶ Iniciar'; }
    } catch { btn.disabled = false; btn.textContent = '▶ Iniciar'; }
};

window.deleteTourn = async function(id, name) {
    if (!confirm(`¿Eliminar el torneo "${name}"? No se puede deshacer.`)) return;
    try {
        const res = await fetch(`${API_BASE}/tournaments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok) { await loadTournaments(); }
        else alert(data.detail || 'Error');
    } catch { alert('Error de conexión.'); }
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!token()) { window.location.href = '/login'; return; }

    // Check admin role
    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (res.ok) {
            const me = await res.json();
            _isAdmin = (me.role === 'admin' || me.role === 'superadmin');
        }
    } catch {}

    await loadTournaments();

    document.querySelectorAll('.t-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            _activeFilter = tab.dataset.filter;
            renderGrid();
        });
    });
});
