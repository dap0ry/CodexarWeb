/* tournamentDetail.js — Admin tournament configuration page */
const API = 'https://api.codexar.es/api';

const params = new URLSearchParams(window.location.search);
const TOURN_ID = params.get('id');

let _tournament    = null;
let _catalog       = [];
let _token         = () => localStorage.getItem('access_token') || '';
let _addOpen       = false;
let _clockInterval = null;
let _pollInterval  = null;
let _myEmail       = '';

function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
    if (!_token() || !TOURN_ID) { window.location.href = '/torneos'; return; }

    const meRes = await fetch(`${API}/user/me`, { headers: { Authorization: `Bearer ${_token()}` } });
    if (!meRes.ok) { window.location.href = '/login'; return; }
    const me = await meRes.json();
    if (me.role !== 'admin' && me.role !== 'superadmin') { window.location.href = '/torneos'; return; }
    _myEmail = me.email || '';

    // Navbar
    document.getElementById('navUsername').textContent = me.username;
    const navA = document.getElementById('navAvatar');
    if (navA) {
        if (me.avatar) { navA.style.backgroundImage = `url('${me.avatar}')`; navA.style.backgroundSize = 'cover'; navA.style.backgroundPosition = 'center'; }
        else navA.textContent = (me.username || '?').charAt(0).toUpperCase();
    }
    document.getElementById('logoutBtn')?.addEventListener('click', e => {
        e.preventDefault(); localStorage.removeItem('access_token'); window.location.href = '/';
    });

    // Fetch tournament + catalog in parallel
    const [tourRes, catRes] = await Promise.all([
        fetch(`${API}/tournaments/${TOURN_ID}`, { headers: { Authorization: `Bearer ${_token()}` } }),
        fetch(`${API}/exercises/catalog`,        { headers: { Authorization: `Bearer ${_token()}` } }),
    ]);

    if (!tourRes.ok) { window.location.href = '/torneos'; return; }
    _tournament = await tourRes.json();
    _catalog    = catRes.ok ? await catRes.json() : [];

    renderPage();
    bindCreateForm();
    bindLangTabs();
    buildTestCases();
    bindStubTabs();

    if (_tournament.status === 'active') {
        startLbClock();
        startLbPoll();
    }
}

// ── Render ─────────────────────────────────────────────────────────────────────

function renderLeaderboard() {
    const t = _tournament;
    const section = document.getElementById('tdLbSection');
    if (!section) return;

    if (t.status === 'upcoming') { section.style.display = 'none'; return; }
    section.style.display = '';

    const clockEl = document.getElementById('tdLbClock');
    if (t.status === 'active' && t.started_at) {
        clockEl.style.display = '';
    } else {
        clockEl.style.display = 'none';
    }

    const lb = (t.leaderboard || []).slice(0, 5);
    const wrap = document.getElementById('tdLbWrap');

    if (!lb.length) {
        wrap.innerHTML = '<div class="td-empty-hint">Sin participantes con puntuación aún.</div>';
        return;
    }

    const syms = ['🥇', '🥈', '🥉', '4º', '5º'];
    const rows = lb.map((row, i) => {
        const av = row.avatar
            ? `<img class="td-lb-av" src="${esc(row.avatar)}" alt="">`
            : `<div class="td-lb-av-ph">${esc((row.username || '?')[0]).toUpperCase()}</div>`;
        const mins = Math.floor((row.total_time || 0) / 60);
        const secs = (row.total_time || 0) % 60;
        const timeStr = row.total_time ? `${mins}:${String(secs).padStart(2, '0')}` : '—';
        const isMine = row.email === _myEmail;
        return `<tr class="${isMine ? 'td-lb-mine' : ''}">
            <td class="td-lb-rank">${syms[i] || (i + 1)}</td>
            <td class="td-lb-player-cell"><div class="td-lb-player">${av}<span>${esc(row.username)}</span></div></td>
            <td>${row.exercises_solved || 0}</td>
            <td>${timeStr}</td>
            <td class="td-lb-pts">${row.total_score || 0} pts</td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `<table class="td-lb-table">
        <thead><tr>
            <th>#</th><th>Jugador</th><th>Ej. entregados</th><th>Tiempo últ. entrega</th><th>Puntos</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

function startLbClock() {
    if (_clockInterval) return;
    _clockInterval = setInterval(() => {
        if (!_tournament?.started_at) return;
        const el = document.getElementById('tdLbClock');
        if (!el) return;
        const elapsed = Math.floor((Date.now() - new Date(_tournament.started_at).getTime()) / 1000);
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = elapsed % 60;
        el.textContent = (h > 0
            ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${m}:${String(s).padStart(2, '0')}`) + ' en curso';
    }, 1000);
}

function startLbPoll() {
    if (_pollInterval) return;
    _pollInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API}/tournaments/${TOURN_ID}`, { headers: { Authorization: `Bearer ${_token()}` } });
            if (!res.ok) return;
            _tournament = await res.json();
            renderLeaderboard();
            if (_tournament.status !== 'active') {
                clearInterval(_pollInterval); _pollInterval = null;
                clearInterval(_clockInterval); _clockInterval = null;
                renderPage();
            }
        } catch {}
    }, 10000);
}

function renderPage() {
    const t = _tournament;
    const status = t.status || 'upcoming';

    // Title + badge
    document.getElementById('tdTitle').textContent = t.name || '';
    const badge = document.getElementById('tdBadge');
    badge.textContent = { upcoming: 'PRÓXIMO', active: 'ACTIVO', finished: 'FINALIZADO' }[status] || status.toUpperCase();
    badge.className = 'td-badge ' + ({ upcoming: 'td-badge--upcoming', active: 'td-badge--active', finished: 'td-badge--finished' }[status] || '');

    // Start button (only upcoming)
    const startBtn = document.getElementById('tdStartBtn');
    if (status === 'upcoming') startBtn.style.display = '';
    else startBtn.style.display = 'none';

    // Info
    const durH = Math.round((t.duration_minutes || 240) / 60);
    const dateStr = status === 'upcoming' ? fmtDate(t.start_time) : status === 'active' ? fmtDate(t.started_at) : fmtDate(t.ended_at);
    document.getElementById('tdInfo').innerHTML = [
        `<span>👥 ${(t.participants || []).length} participantes</span>`,
        `<span>⏱ ${durH}h duración</span>`,
        dateStr ? `<span>📅 ${esc(dateStr)}</span>` : '',
    ].filter(Boolean).join('');

    renderExercises();
    renderLeaderboard();

    // Add button only for upcoming
    const addBtn = document.getElementById('tdAddBtn');
    if (status === 'upcoming') addBtn.style.display = '';
    else addBtn.style.display = 'none';
}

function renderExercises() {
    const t = _tournament;
    const exList = t.exercises_info || [];
    const grid = document.getElementById('tdExGrid');
    const count = document.getElementById('tdExCount');
    count.textContent = `${exList.length} / 6`;

    if (!exList.length) {
        grid.innerHTML = `<div class="td-empty-hint">${t.status === 'upcoming' ? 'Ningún ejercicio configurado. Añade al menos uno para poder iniciar.' : 'Sin ejercicios.'}</div>`;
        return;
    }

    const canRemove = t.status === 'upcoming';
    grid.innerHTML = exList.map(ex => {
        const c = diffColor(ex.difficulty || 800);
        const removeBtn = canRemove
            ? `<button class="td-ex-remove" title="Quitar" onclick="removeExercise('${esc(ex.id)}')">✕</button>`
            : '';
        return `<div class="td-ex-pill">
            <span class="td-ex-diff" style="color:${c}">${ex.difficulty || 800}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ex.title_i18n?.es || ex.title || '?')}</span>
            ${removeBtn}
        </div>`;
    }).join('');

    // Disable add button when at limit
    const addBtn = document.getElementById('tdAddBtn');
    if (addBtn) addBtn.disabled = exList.length >= 6;
}

// ── Add panel ─────────────────────────────────────────────────────────────────

window.toggleAddPanel = function() {
    _addOpen = !_addOpen;
    const panel = document.getElementById('tdAddPanel');
    panel.classList.toggle('open', _addOpen);
    if (_addOpen) renderCatalog();
    document.getElementById('tdAddBtn').textContent = _addOpen ? '✕ Cerrar' : '➕ Añadir ejercicio';
};

window.switchAddTab = function(tab, btn) {
    document.querySelectorAll('.td-add-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tabSelect').style.display = tab === 'select' ? '' : 'none';
    document.getElementById('tabCreate').style.display = tab === 'create' ? '' : 'none';
    if (tab === 'select') renderCatalog();
};

function renderCatalog() {
    const container = document.getElementById('tdCatalog');
    const search = document.getElementById('tdSearch').value.toLowerCase();
    const currentIds = new Set((_tournament.exercises_info || []).map(e => e.id));

    const filtered = _catalog.filter(ex => {
        const title = (ex.title_i18n?.es || ex.title || '').toLowerCase();
        return !search || title.includes(search) || (ex.category || '').toLowerCase().includes(search);
    });

    if (!filtered.length) {
        container.innerHTML = `<div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted);opacity:.5;grid-column:1/-1;padding:12px 0">Sin resultados.</div>`;
        return;
    }

    container.innerHTML = filtered.map(ex => {
        const already = currentIds.has(ex.id);
        const c = diffColor(ex.difficulty || 800);
        const title = esc(ex.title_i18n?.es || ex.title || '?');
        return `<button class="td-cat-item${already ? ' already' : ''}"
            onclick="${already ? '' : `addExercise('${ex.id}')`}"
            ${already ? 'disabled title="Ya está en el torneo"' : ''}>
            <span class="td-cat-name">${title}</span>
            <span class="td-cat-diff" style="color:${c}">${ex.difficulty}</span>
        </button>`;
    }).join('');
}

window.filterCatalog = function() { renderCatalog(); };

// ── Actions ───────────────────────────────────────────────────────────────────

window.removeExercise = async function(exId) {
    const current = (_tournament.exercises_info || []).map(e => e.id).filter(id => id !== exId);
    await putExercises(current);
};

window.addExercise = async function(exId) {
    const current = (_tournament.exercises_info || []).map(e => e.id);
    if (current.length >= 6) { alert('Máximo 6 ejercicios por torneo.'); return; }
    if (current.includes(exId)) return;
    await putExercises([...current, exId]);
};

async function putExercises(ids) {
    try {
        const res = await fetch(`${API}/tournaments/${TOURN_ID}/exercises`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${_token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ exercise_ids: ids }),
        });
        if (!res.ok) { const d = await res.json(); alert(d.detail || 'Error'); return; }
        await reloadTournament();
    } catch { alert('Error de conexión.'); }
}

async function reloadTournament() {
    const res = await fetch(`${API}/tournaments/${TOURN_ID}`, { headers: { Authorization: `Bearer ${_token()}` } });
    if (res.ok) {
        _tournament = await res.json();
        renderExercises();
        if (_addOpen) renderCatalog();
    }
}

window.startTournament = async function() {
    if (!confirm('¿Iniciar el torneo ahora? Los participantes podrán empezar a resolver ejercicios.')) return;
    const btn = document.getElementById('tdStartBtn');
    btn.disabled = true; btn.textContent = '...';
    try {
        const res = await fetch(`${API}/tournaments/${TOURN_ID}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${_token()}` },
        });
        const data = await res.json();
        if (res.ok) {
            await reloadTournament();
            renderPage();
            alert(`Torneo iniciado. ${data.participants} participantes.`);
        } else {
            alert(data.detail || 'Error');
            btn.disabled = false; btn.textContent = '▶ Iniciar Torneo';
        }
    } catch { btn.disabled = false; btn.textContent = '▶ Iniciar Torneo'; }
};

// ── Create exercise form ───────────────────────────────────────────────────────

function buildTestCases() {
    const list = document.getElementById('tdTcList');
    list.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        list.insertAdjacentHTML('beforeend', `
            <div class="ce-tc-card">
                <div class="ce-tc-header">Caso de prueba ${i}${i === 1 ? ' <span style="color:#ef4444">*</span>' : ' <span style="color:var(--text-muted);font-size:0.5rem">(opcional)</span>'}</div>
                <div class="ce-tc-fields">
                    <div class="ce-field">
                        <label class="ce-label">Entrada</label>
                        <input type="text" class="ce-input" id="tdTcIn${i}" placeholder='Ej: 3, [1,2,3]' ${i === 1 ? 'required' : ''}>
                    </div>
                    <div class="ce-field">
                        <label class="ce-label">Salida esperada</label>
                        <input type="text" class="ce-input" id="tdTcOut${i}" placeholder='Ej: 6' ${i === 1 ? 'required' : ''}>
                    </div>
                </div>
            </div>`);
    }
}

function bindLangTabs() {
    document.querySelectorAll('#tdLangTabs .ce-lang-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#tdLangTabs .ce-lang-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#tabCreate .ce-lang-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`#tabCreate .ce-lang-panel[data-lang="${tab.dataset.lang}"]`)?.classList.add('active');
        });
    });
}

function bindStubTabs() {
    document.querySelectorAll('#tdStubTabs .ce-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#tdStubTabs .ce-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#tabCreate .ce-stub-panels .ce-code').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tdStub-${tab.dataset.lang}`)?.classList.add('active');
        });
    });
}

function bindCreateForm() {
    document.getElementById('tdCreateForm').addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = document.getElementById('tdCreateError');
        const btn   = document.getElementById('tdCreateBtn');
        errEl.style.display = 'none';

        const test_cases = [];
        for (let i = 1; i <= 3; i++) {
            const inp = document.getElementById(`tdTcIn${i}`)?.value.trim();
            const out = document.getElementById(`tdTcOut${i}`)?.value.trim();
            if (inp && out) test_cases.push({ input: inp, expected_output: out });
        }
        if (!test_cases.length) { errEl.textContent = 'Añade al menos un caso de prueba completo.'; errEl.style.display = ''; return; }

        const title = document.getElementById('tdCeTitle').value.trim();
        const desc  = document.getElementById('tdCeDesc').value.trim();
        if (!title || !desc) { errEl.textContent = 'Título y descripción son obligatorios.'; errEl.style.display = ''; return; }

        const body = {
            title,
            description: desc,
            difficulty:  parseInt(document.getElementById('tdCeDiff').value, 10),
            category:    document.getElementById('tdCeCat').value,
            test_cases,
            stub_python: document.getElementById('tdStub-python').value,
            stub_cpp:    document.getElementById('tdStub-cpp').value,
            stub_java:   document.getElementById('tdStub-java').value,
            title_i18n:       { es: title, en: document.getElementById('tdCeTitle-en')?.value.trim() || '', zh: '' },
            description_i18n: { es: desc,  en: document.getElementById('tdCeDesc-en')?.value.trim() || '',  zh: '' },
        };

        btn.disabled = true; btn.textContent = 'Creando...';
        try {
            const res = await fetch(`${API}/tournaments/${TOURN_ID}/exercises/create`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${_token()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { errEl.textContent = data.detail || 'Error al crear el ejercicio.'; errEl.style.display = ''; }
            else {
                document.getElementById('tdCreateForm').reset();
                buildTestCases();
                document.querySelectorAll('#tabCreate .ce-code').forEach(c => c.value = '');
                await reloadTournament();
                // Switch back to select tab to show the new exercise
                document.querySelector('.td-add-tab').click();
            }
        } catch { errEl.textContent = 'Error de conexión.'; errEl.style.display = ''; }
        finally { btn.disabled = false; btn.textContent = 'Crear y añadir'; }
    });
}

window.addEventListener('DOMContentLoaded', init);
