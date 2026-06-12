/* tournaments.js — exercise-scoring tournament listing (web, read-only) */
const API_BASE = 'https://api.codexar.es/api';

function token() { return localStorage.getItem('token') || ''; }
function userEmail() { return localStorage.getItem('email') || ''; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function diffColor(d) {
    if (d <= 900)  return '#4ade80';
    if (d <= 1200) return '#86efac';
    if (d <= 1600) return '#fbbf24';
    if (d <= 2200) return '#f97316';
    if (d <= 2800) return '#ef4444';
    return '#a855f7';
}

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function lbRankSymbol(i) {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return String(i + 1);
}
function lbRankClass(i) {
    return ['gold','silver','bronze'][i] || '';
}

function buildLeaderboard(lb) {
    if (!lb || !lb.length) return '<p class="t-lb-empty">Aún no hay puntuaciones.</p>';
    return `<table class="t-lb-table">
        <thead><tr><th>#</th><th>Jugador</th><th>Resueltos</th><th>Puntos</th><th>Tiempo</th></tr></thead>
        <tbody>${lb.map((row, i) => {
            const av = row.avatar
                ? `<img class="t-lb-av" src="${esc(row.avatar)}" alt="">`
                : `<span class="t-lb-av-placeholder">${esc((row.username||'?')[0]).toUpperCase()}</span>`;
            const mins = Math.floor((row.total_time || 0) / 60);
            const secs = (row.total_time || 0) % 60;
            return `<tr>
                <td class="t-lb-rank ${lbRankClass(i)}">${lbRankSymbol(i)}</td>
                <td>${av}${esc(row.username)}</td>
                <td style="color:rgba(255,255,255,0.55)">${row.exercises_solved || 0}</td>
                <td class="t-lb-score">${row.total_score || 0}</td>
                <td style="color:rgba(255,255,255,0.4);font-size:12px">${mins}m ${String(secs).padStart(2,'0')}s</td>
            </tr>`;
        }).join('')}</tbody>
    </table>`;
}

function buildCard(t, myEmail) {
    const isJoined = (t.participants || []).includes(myEmail);
    const status   = t.status || 'upcoming';
    const statusLabels = { upcoming: 'Próximo', active: 'En curso', finished: 'Finalizado' };
    const statusLabel  = statusLabels[status] || status;

    const bannerHtml = t.banner_url
        ? `<img class="t-card-banner" src="${esc(t.banner_url)}" alt="">`
        : `<div class="t-card-banner-placeholder">🏆</div>`;

    const durH = Math.round((t.duration_minutes || 240) / 60);
    const metaInfo = status === 'upcoming'
        ? `Inicio: ${fmtDate(t.start_time)} · ${durH}h`
        : status === 'active'
            ? `${durH}h · Comenzó: ${fmtDate(t.started_at)}`
            : `Finalizado: ${fmtDate(t.ended_at || t.started_at)}`;

    let winnerHtml = '';
    if (status === 'finished' && t.winner) {
        const wav = t.winner.avatar
            ? `<img class="t-winner-av" src="${esc(t.winner.avatar)}" alt="">`
            : `<span class="t-winner-av-placeholder">🏆</span>`;
        winnerHtml = `<div class="t-winner-pill">
            ${wav}
            <div class="t-winner-info">
                <div class="t-winner-label">Ganador</div>
                <div class="t-winner-name">${esc(t.winner.username)}</div>
            </div>
        </div>`;
    }

    const exercises = t.exercises_info || [];
    let exHtml;
    if (exercises.length) {
        exHtml = exercises.map(ex => {
            const c = diffColor(ex.difficulty || 800);
            return `<div class="t-ex-badge">
                <span style="font-size:12px">${esc(ex.title_i18n?.es || ex.title || '?')}</span>
                <span class="t-ex-diff" style="color:${c}">${ex.difficulty || 800}</span>
            </div>`;
        }).join('');
    } else {
        exHtml = '<span class="t-ex-none">Sin ejercicios configurados</span>';
    }

    const lb = t.leaderboard || [];
    const lbHtml = lb.length
        ? `<button class="t-lb-toggle" onclick="toggleLb('${esc(t.id)}')">Ver clasificación (${lb.length}) ▾</button>
           <div class="t-lb-wrap" id="lb-${esc(t.id)}">${buildLeaderboard(lb)}</div>`
        : '';

    let actions = '';
    if (status === 'upcoming') {
        if (isJoined) {
            actions = `<span class="t-enrolled-badge">✓ Inscrito</span>
                <button class="t-btn t-btn-leave" onclick="leaveTourn('${t.id}',this)">Abandonar</button>`;
        } else {
            actions = `<button class="t-btn t-btn-join" onclick="joinTourn('${t.id}',this)">Inscribirse</button>`;
        }
    } else if (status === 'active' && isJoined) {
        actions = `<span class="t-enrolled-badge">✓ Inscrito</span>
            <a href="/torneos/ayuda" class="t-btn t-btn-play">Jugar con la app →</a>`;
    }

    return `<div class="t-card" data-status="${status}" data-id="${t.id}">
        ${bannerHtml}
        <div class="t-card-body">
            <div class="t-card-meta">
                <span class="t-card-status ${status}">${statusLabel}</span>
                <span class="t-card-duration">${metaInfo}</span>
            </div>
            <div class="t-card-name">${esc(t.name)}</div>
            ${t.description ? `<div class="t-card-desc">${esc(t.description)}</div>` : ''}
            ${winnerHtml}
            <div class="t-exercises-label">Ejercicios del torneo</div>
            <div class="t-exercises">${exHtml}</div>
            ${lbHtml}
            ${actions ? `<div class="t-card-actions" style="margin-top:16px">${actions}</div>` : ''}
        </div>
    </div>`;
}

window.toggleLb = function(id) {
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
    grid.innerHTML = '<div class="t-loading">Cargando torneos...</div>';
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

document.addEventListener('DOMContentLoaded', () => {
    if (!token()) { window.location.href = '/login'; return; }
    loadTournaments();
    document.querySelectorAll('.t-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            _activeFilter = tab.dataset.filter;
            renderGrid();
        });
    });
});
