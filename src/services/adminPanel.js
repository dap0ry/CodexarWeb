const API_BASE = 'https://api.codexar.es/api';

function token() { return localStorage.getItem('access_token'); }

let allUsers = [];
let allExercises = [];

const DIFF_CLASS = {
    'Fácil':       'ap-diff-facil',
    'Normal':      'ap-diff-normal',
    'Difícil':     'ap-diff-dificil',
    'Muy Difícil': 'ap-diff-muydificil',
    'Insane':      'ap-diff-insane',
    'Abyssal':     'ap-diff-abyssal',
};

// ── Auth guard (admin only) ──────────────────────────────────────────────────
async function initPage() {
    const t = token();
    if (!t) { window.location.href = '/login'; return; }

    const res = await fetch(`${API_BASE}/user/me`, { headers: { 'Authorization': `Bearer ${t}` } });
    if (!res.ok) { window.location.href = '/login'; return; }
    const user = await res.json();

    if (user.role !== 'admin') { window.location.href = '/home'; return; }

    const nav = document.getElementById('navAvatar');
    document.getElementById('navUsername').textContent = user.username;
    if (nav) {
        if (user.avatar) {
            nav.style.backgroundImage = `url(${user.avatar})`;
            nav.style.backgroundSize = 'cover';
            nav.style.backgroundPosition = 'center';
        } else {
            nav.textContent = user.username.charAt(0).toUpperCase();
        }
    }

    document.getElementById('logoutBtn')?.addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = '/';
    });

    bindTabs();
    await loadUsers();
    await loadExercises();
    initNewsForm();
    initTournamentsForm();

    document.getElementById('userSearch').addEventListener('input', filterUsers);
    document.getElementById('exSearch').addEventListener('input', filterExercises);
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function bindTabs() {
    document.querySelectorAll('.ap-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ap-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.ap-section').forEach(s => s.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(`section-${tab.dataset.section}`)?.classList.remove('hidden');
            if (tab.dataset.section === 'news' && !allNews.length) loadNews();
            if (tab.dataset.section === 'tournaments') loadTournaments();
        });
    });
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
    const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) { showToast('Error al cargar usuarios', true); return; }
    allUsers = await res.json();
    renderUsers(allUsers);
}

function filterUsers() {
    const q = document.getElementById('userSearch').value.toLowerCase();
    renderUsers(allUsers.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    ));
}

function renderUsers(users) {
    document.getElementById('userCount').textContent = `${users.length} usuarios`;
    const tbody = document.getElementById('userTableBody');
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="ap-loading">No se encontraron usuarios</td></tr>';
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr data-username="${esc(u.username)}">
            <td><strong>${esc(u.username)}</strong></td>
            <td style="color:rgba(114,114,138,0.7)">${esc(u.email)}</td>
            <td><span class="ap-role ap-role-${u.role}">${u.role}</span></td>
            <td style="color:var(--accent-cyan)">${u.elo}</td>
            <td>${u.is_banned
                ? '<span class="ap-status-banned">BANEADO</span>'
                : '<span class="ap-status-active">Activo</span>'}</td>
            <td>
                <div class="ap-actions-cell">
                    ${u.is_banned
                        ? `<button class="ap-btn ap-btn-unban" onclick="unbanUser('${esc(u.username)}')">Desbanear</button>`
                        : `<button class="ap-btn ap-btn-ban"   onclick="banUser('${esc(u.username)}')">Banear</button>`
                    }
                    <select class="ap-role-select" onchange="setRole('${esc(u.username)}', this.value)">
                        <option value="user"      ${u.role === 'user'      ? 'selected' : ''}>User</option>
                        <option value="moderator" ${u.role === 'moderator' ? 'selected' : ''}>Moderador</option>
                        <option value="admin"     ${u.role === 'admin'     ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            </td>
        </tr>
    `).join('');
}

async function banUser(username) {
    if (!confirm(`¿Banear a ${username}?`)) return;
    const res = await fetch(`${API_BASE}/admin/ban/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    const data = await res.json();
    if (res.ok) { showToast(data.message); await loadUsers(); }
    else showToast(data.detail || 'Error', true);
}

async function unbanUser(username) {
    const res = await fetch(`${API_BASE}/admin/unban/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    const data = await res.json();
    if (res.ok) { showToast(data.message); await loadUsers(); }
    else showToast(data.detail || 'Error', true);
}

async function setRole(username, role) {
    const res = await fetch(`${API_BASE}/admin/set-role/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (res.ok) { showToast(data.message); await loadUsers(); }
    else showToast(data.detail || 'Error', true);
}

// ── Exercises ────────────────────────────────────────────────────────────────
async function loadExercises() {
    const res = await fetch(`${API_BASE}/exercises`, {
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) return;
    allExercises = await res.json();
    renderExercises(allExercises);
}

function filterExercises() {
    const q = document.getElementById('exSearch').value.toLowerCase();
    renderExercises(allExercises.filter(e =>
        (e.title || '').toLowerCase().includes(q)
    ));
}

function renderExercises(exercises) {
    document.getElementById('exCount').textContent = `${exercises.length} ejercicios`;
    const tbody = document.getElementById('exTableBody');
    if (!exercises.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="ap-loading">No se encontraron ejercicios</td></tr>';
        return;
    }
    tbody.innerHTML = exercises.map(ex => {
        const diffClass = DIFF_CLASS[ex.difficulty] || '';
        return `
            <tr>
                <td><strong>${esc(ex.title)}</strong></td>
                <td style="color:rgba(114,114,138,0.7)">${esc(ex.category || '—')}</td>
                <td><span class="ap-diff ${diffClass}">${esc(ex.difficulty || '—')}</span></td>
                <td style="color:rgba(0,255,204,0.6)">${esc(ex.created_by || 'sistema')}</td>
                <td>
                    <div class="ap-actions-cell">
                        <button class="ap-btn ap-btn-delete" onclick="deleteExercise('${esc(ex.id)}', '${esc(ex.title)}')">Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteExercise(id, title) {
    if (!confirm(`¿Eliminar el ejercicio "${title}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`${API_BASE}/admin/exercises/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    const data = await res.json();
    if (res.ok) { showToast(data.message); await loadExercises(); }
    else showToast(data.detail || 'Error', true);
}

// ── News ─────────────────────────────────────────────────────────────────────

let allNews = [];

function initNewsForm() {
    const bodyInput   = document.getElementById('newsBody');
    const mentionsPre = document.getElementById('newsMentionsPreview');
    const charCount   = document.getElementById('newsBodyCount');

    // Live mention detection + char counter
    bodyInput.addEventListener('input', () => {
        charCount.textContent = bodyInput.value.length;
        const mentions = [...new Set((bodyInput.value.match(/@(\w+)/g) || []))];
        mentionsPre.textContent = mentions.length
            ? 'Menciones: ' + mentions.join('  ')
            : '';
    });

    document.getElementById('newsSubmitBtn').addEventListener('click', submitNews);
}

async function submitNews() {
    const title    = document.getElementById('newsTitle').value.trim();
    const subtitle = document.getElementById('newsSubtitle').value.trim();
    const body     = document.getElementById('newsBody').value.trim();

    if (!title)  { showToast('El título es obligatorio.', true); return; }
    if (!body)   { showToast('El contenido es obligatorio.', true); return; }

    const btn = document.getElementById('newsSubmitBtn');
    btn.disabled    = true;
    btn.textContent = 'Publicando...';

    try {
        const res  = await fetch(`${API_BASE}/news/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, subtitle: subtitle || title, body }),
        });
        const data = await res.json();

        if (res.ok) {
            showToast('¡Noticia publicada!');
            document.getElementById('newsTitle').value    = '';
            document.getElementById('newsSubtitle').value = '';
            document.getElementById('newsBody').value     = '';
            document.getElementById('newsMentionsPreview').textContent = '';
            document.getElementById('newsBodyCount').textContent = '0';
            await loadNews();
        } else {
            showToast(data.detail || 'Error al publicar.', true);
        }
    } catch {
        showToast('Error de conexión.', true);
    }

    btn.disabled = false;
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Publicar noticia';
}

async function loadNews() {
    const res = await fetch(`${API_BASE}/news/`, {
        headers: { 'Authorization': `Bearer ${token()}` },
    });
    if (!res.ok) { showToast('Error al cargar noticias', true); return; }
    allNews = await res.json();
    renderNews(allNews);
}

function renderNews(items) {
    document.getElementById('newsCount').textContent = `${items.length} noticias`;
    const tbody = document.getElementById('newsTableBody');
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="ap-loading">No hay noticias publicadas</td></tr>';
        return;
    }
    tbody.innerHTML = items.map(n => {
        const date = n.created_at
            ? new Date(n.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
        const mentions = (n.mentions || []).map(m => `@${esc(m)}`).join(', ') || '—';
        return `
            <tr>
                <td><strong>${esc(n.title)}</strong><br><span style="color:rgba(114,114,138,0.55);font-size:0.65rem">${esc(n.subtitle || '')}</span></td>
                <td style="color:rgba(0,255,204,0.6)">${esc(n.creator)}</td>
                <td style="color:rgba(0,255,204,0.45);font-size:0.68rem">${mentions}</td>
                <td style="color:#e6e6f0">${n.like_count ?? 0}</td>
                <td style="color:rgba(114,114,138,0.55)">${date}</td>
                <td>
                    <div class="ap-actions-cell">
                        <button class="ap-btn ap-btn-delete" onclick="deleteNews('${esc(n.id)}')">Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteNews(id) {
    if (!confirm('¿Eliminar esta noticia? No se puede deshacer.')) return;
    const res  = await fetch(`${API_BASE}/admin/news/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` },
    });
    const data = await res.json();
    if (res.ok) { showToast(data.message); await loadNews(); }
    else showToast(data.detail || 'Error', true);
}

// ── Tournaments ───────────────────────────────────────────────────────────────

let allTournaments = [];

function initTournamentsForm() {
    document.getElementById('tCreateBtn').addEventListener('click', createTournament);
}

async function loadTournaments() {
    const res = await fetch(`${API_BASE}/tournaments`, {
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) { showToast('Error al cargar torneos', true); return; }
    allTournaments = await res.json();
    renderTournaments(allTournaments);
}

function renderTournaments(list) {
    document.getElementById('tCount').textContent = `${list.length} torneo${list.length !== 1 ? 's' : ''}`;
    const tbody = document.getElementById('tTableBody');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="ap-loading">No hay torneos creados</td></tr>';
        return;
    }

    const statusLabel = { upcoming: 'Próximo', active: 'En Curso', finished: 'Finalizado' };
    const statusColor = { upcoming: '#f59e0b', active: 'var(--accent-cyan)', finished: 'rgba(114,114,138,0.6)' };

    tbody.innerHTML = list.map(t => {
        const date = t.start_time
            ? new Date(t.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—';
        const count = (t.participants || []).length;
        const color = statusColor[t.status] || 'inherit';
        const label = statusLabel[t.status] || t.status;

        return `
            <tr>
                <td><strong>${esc(t.name)}</strong>${t.banner_url ? ' <span style="opacity:0.4;font-size:0.6rem">🖼</span>' : ''}</td>
                <td><span style="color:${color};font-family:var(--font-mono);font-size:0.7rem;font-weight:700">${label}</span></td>
                <td style="color:var(--accent-cyan)">${count}</td>
                <td style="color:rgba(114,114,138,0.6);font-size:0.72rem">${date}</td>
                <td>
                    <div class="ap-actions-cell">
                        ${t.status === 'upcoming' && count >= 2
                            ? `<button class="ap-btn" style="background:rgba(0,255,204,0.1);border-color:rgba(0,255,204,0.3);color:var(--accent-cyan)" onclick="startTournament('${esc(t.id)}', this)">▶ Iniciar</button>`
                            : ''}
                        <button class="ap-btn" style="background:transparent;border-color:rgba(255,255,255,0.1);color:var(--text-muted)" onclick="window.open('/torneos','_blank')">Ver bracket</button>
                        <button class="ap-btn ap-btn-delete" onclick="deleteTournament('${esc(t.id)}', '${esc(t.name)}')">Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function createTournament() {
    const name  = document.getElementById('tName').value.trim();
    const desc  = document.getElementById('tDesc').value.trim();
    const start = document.getElementById('tStart').value;
    const banner = document.getElementById('tBanner').files[0];

    if (!name)  { showToast('El nombre es obligatorio.', true); return; }
    if (!start) { showToast('La fecha de inicio es obligatoria.', true); return; }

    const btn = document.getElementById('tCreateBtn');
    btn.disabled = true;
    btn.textContent = 'Creando...';

    const form = new FormData();
    form.append('name', name);
    form.append('description', desc);
    form.append('start_time', new Date(start).toISOString());
    if (banner) form.append('banner', banner);

    try {
        const res  = await fetch(`${API_BASE}/tournaments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token()}` },
            body: form,
        });
        const data = await res.json();

        if (res.ok) {
            showToast(`Torneo "${name}" creado.`);
            document.getElementById('tName').value  = '';
            document.getElementById('tDesc').value  = '';
            document.getElementById('tStart').value = '';
            document.getElementById('tBanner').value = '';
            await loadTournaments();
        } else {
            showToast(data.detail || 'Error al crear el torneo.', true);
        }
    } catch {
        showToast('Error de conexión.', true);
    }

    btn.disabled = false;
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Crear torneo';
}

async function startTournament(id, btn) {
    if (!confirm('¿Iniciar el torneo ahora? Se generará el bracket y comenzará la primera ronda.')) return;
    btn.disabled = true;
    btn.textContent = '...';
    const res  = await fetch(`${API_BASE}/tournaments/${id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    const data = await res.json();
    if (res.ok) { showToast(data.message); await loadTournaments(); }
    else { showToast(data.detail || 'Error', true); btn.disabled = false; btn.textContent = '▶ Iniciar'; }
}

async function deleteTournament(id, name) {
    if (!confirm(`¿Eliminar el torneo "${name}"? No se puede deshacer.`)) return;
    const res  = await fetch(`${API_BASE}/tournaments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` }
    });
    const data = await res.json();
    if (res.ok) { showToast(data.message); await loadTournaments(); }
    else showToast(data.detail || 'Error', true);
}

// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, isError = false) {
    const el = document.getElementById('apToast');
    el.textContent = msg;
    el.className = `ap-toast${isError ? ' error' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.addEventListener('DOMContentLoaded', initPage);
