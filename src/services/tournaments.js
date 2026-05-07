/* tournaments.js — Codexar Tournaments */

const API = 'https://api.codexar.es/api';

let currentUser   = null;
let currentFilter = 'all';
let activeTournId = null;   // bracket view
let activeTournData = null;
let matchAlertInterval = null;
let bracketPollInterval = null;

function token()       { return localStorage.getItem('access_token'); }
function authH()       { return { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' }; }
function authHForm()   { return { 'Authorization': `Bearer ${token()}` }; }

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function initTournaments() {
    if (!token()) { window.location.href = '/login'; return; }

    const res = await fetch(`${API}/user/me`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if (!res.ok) { window.location.href = '/login'; return; }
    currentUser = await res.json();

    // Navbar
    const navU = document.getElementById('navUsername');
    const navA = document.getElementById('navAvatar');
    if (navU) navU.textContent = currentUser.username;
    if (navA) {
        if (currentUser.avatar) {
            navA.style.backgroundImage = `url('${currentUser.avatar}')`;
            navA.style.backgroundSize = 'cover';
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

    // Admin button
    if (currentUser.role === 'admin') {
        const btn = document.getElementById('createTournBtn');
        if (btn) btn.style.display = '';
    }

    // Tabs
    document.querySelectorAll('.t-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            loadList();
        });
    });

    // Back button
    document.getElementById('backBtn')?.addEventListener('click', showList);

    // Drag-to-pan on bracket
    initBracketPan();

    // Create modal
    document.getElementById('createTournBtn')?.addEventListener('click', () => {
        document.getElementById('createModal').style.display = 'flex';
    });
    document.getElementById('createModalClose')?.addEventListener('click', () => {
        document.getElementById('createModal').style.display = 'none';
    });
    document.getElementById('createModal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('createModal'))
            document.getElementById('createModal').style.display = 'none';
    });

    // Banner preview
    document.getElementById('cBanner')?.addEventListener('change', e => {
        const file = e.target.files[0];
        const preview = document.getElementById('bannerPreview');
        if (file) {
            preview.style.display = 'block';
            preview.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
        } else {
            preview.style.display = 'none';
        }
    });

    // Create form submit
    document.getElementById('createForm')?.addEventListener('submit', submitCreateTournament);

    await loadList();
}

// ── List ──────────────────────────────────────────────────────────────────────

async function loadList() {
    const grid = document.getElementById('tournGrid');
    grid.innerHTML = '<div class="t-loading">Cargando torneos...</div>';

    try {
        const res = await fetch(`${API}/tournaments`, { headers: { 'Authorization': `Bearer ${token()}` } });
        if (!res.ok) throw new Error();
        let tournaments = await res.json();

        if (currentFilter !== 'all') {
            tournaments = tournaments.filter(t => t.status === currentFilter);
        }

        grid.innerHTML = '';
        if (!tournaments.length) {
            grid.innerHTML = '<div class="t-empty">No hay torneos en esta categoría.</div>';
            return;
        }
        tournaments.forEach(t => grid.appendChild(buildCard(t)));
    } catch {
        grid.innerHTML = '<div class="t-empty">Error al cargar los torneos.</div>';
    }
}

function buildCard(t) {
    const card = document.createElement('div');
    card.className = 't-card';

    const isJoined  = (t.participants || []).includes(currentUser.email);
    const statusLabel = { upcoming: 'Próximo', active: 'En Curso', finished: 'Finalizado' }[t.status] || t.status;
    const count = (t.participants || []).length;

    let footerBtn = '';
    if (t.status === 'upcoming') {
        if (isJoined) {
            footerBtn = `<button class="t-join-card-btn t-join-card-btn--leave" data-action="leave" data-id="${esc(t.id)}">Abandonar</button>`;
        } else {
            footerBtn = `<button class="t-join-card-btn t-join-card-btn--join" data-action="join" data-id="${esc(t.id)}">Inscribirse</button>`;
        }
    }
    footerBtn += `<button class="t-join-card-btn t-join-card-btn--view" data-action="view" data-id="${esc(t.id)}">Ver bracket →</button>`;

    card.innerHTML = `
        ${t.banner_url
            ? `<img class="t-card-banner" src="${esc(t.banner_url)}" alt="${esc(t.name)}">`
            : '<div class="t-card-banner-placeholder"></div>'
        }
        <div class="t-card-body">
            <div class="t-card-top">
                <div class="t-card-name">${esc(t.name)}</div>
                <span class="t-badge t-badge--${t.status}">${esc(statusLabel)}</span>
            </div>
            ${t.description ? `<div class="t-card-desc">${esc(t.description)}</div>` : ''}
            <div class="t-card-meta">
                <span data-icon="📅">${fmtDate(t.start_time)}</span>
                <span data-icon="👤">${count} jugador${count !== 1 ? 'es' : ''}</span>
            </div>
        </div>
        <div class="t-card-footer">
            <span class="t-card-count">${isJoined ? '✓ Inscrito' : ''}</span>
            <div style="display:flex;gap:6px">${footerBtn}</div>
        </div>
    `;

    card.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const id     = btn.dataset.id;
            if (action === 'join')  handleJoinTournament(id, btn);
            if (action === 'leave') handleLeaveTournament(id, btn);
            if (action === 'view')  openBracket(id);
        });
    });

    card.addEventListener('click', () => openBracket(t.id));
    return card;
}

async function handleJoinTournament(id, btn) {
    btn.disabled = true;
    btn.textContent = '...';
    const r = await fetch(`${API}/tournaments/${id}/join`, { method: 'POST', headers: authH() });
    const d = await r.json();
    if (r.ok) { await loadList(); }
    else { alert(d.detail || 'Error'); btn.disabled = false; btn.textContent = 'Inscribirse'; }
}

async function handleLeaveTournament(id, btn) {
    btn.disabled = true;
    btn.textContent = '...';
    const r = await fetch(`${API}/tournaments/${id}/leave`, { method: 'POST', headers: authH() });
    const d = await r.json();
    if (r.ok) { await loadList(); }
    else { alert(d.detail || 'Error'); btn.disabled = false; btn.textContent = 'Abandonar'; }
}

// ── Bracket view ──────────────────────────────────────────────────────────────

function showList() {
    document.getElementById('listPanel').classList.remove('t-page--hidden');
    document.getElementById('bracketPanel').classList.add('t-page--hidden');
    clearInterval(bracketPollInterval);
    bracketPollInterval = null;
    myActiveSlot = null;
    hideMatchAlert();
    activeTournId = null;
    activeTournData = null;
}

async function openBracket(id) {
    activeTournId = id;
    document.getElementById('listPanel').classList.add('t-page--hidden');
    document.getElementById('bracketPanel').classList.remove('t-page--hidden');

    document.getElementById('bracketName').textContent = 'Cargando...';
    document.getElementById('bracketMeta').textContent = '';
    document.getElementById('bracketActions').innerHTML = '';
    document.getElementById('bracketStage').innerHTML = '';

    await refreshBracket();

    // Poll every 5 seconds while active
    clearInterval(bracketPollInterval);
    bracketPollInterval = setInterval(refreshBracket, 5000);
}

async function refreshBracket() {
    if (!activeTournId) return;
    try {
        const res = await fetch(`${API}/tournaments/${activeTournId}`, {
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (!res.ok) return;
        activeTournData = await res.json();
        renderBracketPanel(activeTournData);
        checkMyMatch(activeTournData);
    } catch { /* silent */ }
}

function renderBracketPanel(t) {
    // Header
    document.getElementById('bracketName').textContent = t.name;
    const statusLabel = { upcoming: 'Próximo', active: 'En Curso', finished: 'Finalizado' }[t.status] || t.status;
    const count = (t.participants || []).length;
    document.getElementById('bracketMeta').textContent =
        `${statusLabel} · ${count} jugador${count !== 1 ? 'es' : ''}` +
        (t.winner ? ` · 🏆 ${t.winner.username}` : '');

    // Actions
    const actionsEl = document.getElementById('bracketActions');
    actionsEl.innerHTML = '';
    const isJoined = (t.participants || []).includes(currentUser.email);

    if (currentUser.role === 'admin') {
        if (t.status === 'upcoming' && count >= 2) {
            const startBtn = document.createElement('button');
            startBtn.className = 't-btn-start';
            startBtn.textContent = '▶ Iniciar Torneo';
            startBtn.addEventListener('click', () => handleStartTournament(t.id));
            actionsEl.appendChild(startBtn);
        }
        const delBtn = document.createElement('button');
        delBtn.className = 't-btn-delete';
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', () => handleDeleteTournament(t.id));
        actionsEl.appendChild(delBtn);
    }

    if (t.status === 'upcoming') {
        if (isJoined) {
            const leaveBtn = document.createElement('button');
            leaveBtn.className = 't-btn-leave-tourn';
            leaveBtn.textContent = 'Abandonar';
            leaveBtn.addEventListener('click', async () => {
                leaveBtn.disabled = true;
                await handleLeaveTournament(t.id, leaveBtn);
                await refreshBracket();
            });
            actionsEl.appendChild(leaveBtn);
        } else {
            const joinBtn = document.createElement('button');
            joinBtn.className = 't-btn-join-tourn';
            joinBtn.textContent = '+ Unirse';
            joinBtn.addEventListener('click', async () => {
                joinBtn.disabled = true;
                await handleJoinTournament(t.id, joinBtn);
                await refreshBracket();
            });
            actionsEl.appendChild(joinBtn);
        }
    }

    // Participants pills (if upcoming)
    if (t.status === 'upcoming' && (t.participants_info || []).length) {
        const pillsWrap = document.createElement('div');
        pillsWrap.className = 't-participant-list';
        pillsWrap.style.cssText = 'padding: 0 5% 12px; flex-shrink:0;';
        document.getElementById('bracketWrap').style.paddingTop = '8px';
        (t.participants_info || []).forEach(p => {
            const pill = document.createElement('div');
            pill.className = 't-participant-pill';
            pill.style.cursor = 'pointer';
            pill.title = `Ver perfil de ${p.username}`;
            pill.addEventListener('click', () => {
                window.location.href = `/perfil?u=${encodeURIComponent(p.username)}`;
            });
            if (p.avatar) {
                pill.innerHTML = `<img src="${esc(p.avatar)}" alt="${esc(p.username)}"><span>${esc(p.username)}</span>`;
            } else {
                pill.innerHTML = `<div class="t-pill-av">${esc(p.username.charAt(0).toUpperCase())}</div><span>${esc(p.username)}</span>`;
            }
            pillsWrap.appendChild(pill);
        });
        // Insert before bracketWrap (replace if exists)
        const existing = document.getElementById('participantPills');
        if (existing) existing.remove();
        pillsWrap.id = 'participantPills';
        document.getElementById('bracketWrap').parentElement.insertBefore(pillsWrap, document.getElementById('bracketWrap'));
    } else {
        document.getElementById('participantPills')?.remove();
    }

    // Bracket
    const bracket = t.bracket || [];
    if (!bracket.length) {
        document.getElementById('bracketStage').innerHTML =
            '<div style="padding:40px;font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);opacity:0.5;text-align:center;">El torneo aún no ha comenzado.</div>';
        return;
    }

    renderBracket(bracket, t.slot_states || {}, t.id);
}

// ── Bracket render ─────────────────────────────────────────────────────────────

function renderBracket(bracket, slotStates, tournId) {
    const stage = document.getElementById('bracketStage');
    stage.innerHTML = '';

    const MATCH_W  = 230;
    const MATCH_H  = 150;  // tall enough for 2 slots + badge + action button
    const COL_GAP  = 64;
    const ROW_GAP  = 28;   // visible gap between match boxes

    const numRounds = bracket.length;
    if (!numRounds) return;

    // Compute absolute positions (each round doubles the stride)
    const positions = [];
    for (let r = 0; r < numRounds; r++) {
        positions[r] = [];
        const stride = Math.pow(2, r) * (MATCH_H + ROW_GAP);
        for (let m = 0; m < bracket[r].length; m++) {
            const x = r * (MATCH_W + COL_GAP);
            const y = m * stride + (stride - MATCH_H) / 2;
            positions[r][m] = { x, y };
        }
    }

    const lastR   = numRounds - 1;
    const totalW  = lastR * (MATCH_W + COL_GAP) + MATCH_W + 40;
    const lastPos0 = positions[0][positions[0].length - 1];
    const totalH  = lastPos0.y + MATCH_H + 40;

    stage.style.width  = totalW + 'px';
    stage.style.height = totalH + 'px';

    // SVG connector lines
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', totalW);
    svg.setAttribute('height', totalH);
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;';
    stage.appendChild(svg);

    for (let r = 0; r < numRounds - 1; r++) {
        for (let m = 0; m < bracket[r].length; m++) {
            const pos     = positions[r][m];
            const nextM   = Math.floor(m / 2);
            const nextPos = positions[r + 1][nextM];

            const x1   = pos.x + MATCH_W;
            const y1   = pos.y + MATCH_H / 2;
            const x2   = nextPos.x;
            const y2   = nextPos.y + MATCH_H / 2;
            const midX = x1 + COL_GAP / 2;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`);
            path.setAttribute('stroke', 'rgba(0,255,204,0.12)');
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('fill', 'none');
            svg.appendChild(path);
        }
    }

    // Round header labels
    for (let r = 0; r < numRounds; r++) {
        const label = document.createElement('div');
        label.className = 't-round-header-item';
        label.style.cssText = `position:absolute;left:${positions[r][0].x}px;top:-24px;width:${MATCH_W}px;`;
        label.textContent = r === numRounds - 1 ? 'FINAL' : r === numRounds - 2 ? 'SEMIFINAL' : `RONDA ${r + 1}`;
        stage.appendChild(label);
    }

    // Match boxes
    for (let r = 0; r < numRounds; r++) {
        for (let m = 0; m < bracket[r].length; m++) {
            const match   = bracket[r][m];
            const pos     = positions[r][m];
            const isFinal = (r === numRounds - 1);
            const isMyMatch = currentUser && (
                match.p1?.email === currentUser.email ||
                match.p2?.email === currentUser.email
            );

            const slotState = slotStates[match.id] || null;
            const el = buildMatchBox(match, isMyMatch, isFinal, tournId, slotState);
            el.style.left = pos.x + 'px';
            el.style.top  = pos.y + 'px';
            el.style.width = MATCH_W + 'px';
            stage.appendChild(el);
        }
    }
}

// ── Drag-to-pan bracket ────────────────────────────────────────────────────────

function initBracketPan() {
    const wrap = document.getElementById('bracketWrap');
    let isPanning = false, startX = 0, startY = 0, scrollL = 0, scrollT = 0, moved = false;

    wrap.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        isPanning = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
        scrollL = wrap.scrollLeft;
        scrollT = wrap.scrollTop;
        // No setPointerCapture: without it, click events fire on the actual
        // child element (not redirected to wrap), so onclick on slots works.
        // We use document-level listeners to track the pointer outside the wrap.
    });

    document.addEventListener('pointermove', e => {
        if (!isPanning) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            moved = true;
            wrap.scrollLeft = scrollL - dx;
            wrap.scrollTop  = scrollT - dy;
            wrap.style.cursor = 'grabbing';
        }
    });

    const endPan = () => {
        if (!isPanning) return;
        isPanning = false;
        wrap.style.cursor = 'grab';
    };
    document.addEventListener('pointerup',     endPan);
    document.addEventListener('pointercancel', endPan);

    // Block clicks that followed a drag (capture phase so it runs before onclick)
    wrap.addEventListener('click', e => {
        if (moved) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);
}

function buildMatchBox(match, isMyMatch, isFinal, tournId, slotState) {
    const div = document.createElement('div');
    div.className = `tm-match${isMyMatch ? ' tm-match--mine' : ''}${isFinal ? ' tm-match--final' : ''}`;
    div.dataset.slotId = match.id;

    const p1 = match.p1 || null;
    const p2 = match.p2 || null;
    const winnerEmail = match.winner_email;

    const slotHtml = (player, side) => {
        if (!player) {
            const isEmpty = ['skip', 'pending'].includes(match.status);
            return `<div class="tm-slot tm-slot--empty">${isEmpty ? '?' : '—'}</div>`;
        }
        const isW = player.email === winnerEmail;
        const isL = (match.status === 'done' || match.status === 'forfeit') && !isW;
        const avatarHtml = player.avatar
            ? `<div class="tm-avatar" style="background-image:url('${esc(player.avatar)}')" title="${esc(player.username)}"></div>`
            : `<div class="tm-avatar tm-avatar--initial">${esc((player.username || '?').charAt(0).toUpperCase())}</div>`;
        return `
            <div class="tm-slot${isW ? ' tm-slot--winner' : isL ? ' tm-slot--loser' : ''} tm-slot--link"
                 onclick="window.location.href='/perfil?u=${encodeURIComponent(player.username)}'">
                ${avatarHtml}
                <span class="tm-name">${esc(player.username)}</span>
                ${isW ? '<span class="tm-win-icon">▶</span>' : ''}
            </div>`;
    };

    const badgeMap = {
        ready:   '<div class="tm-badge tm-badge--ready">LISTO</div>',
        ongoing: '<div class="tm-badge tm-badge--live">EN CURSO</div>',
        done:    '<div class="tm-badge tm-badge--done">COMPLETADO</div>',
        forfeit: '<div class="tm-badge tm-badge--forfeit">FORFEIT</div>',
        bye:     '<div class="tm-badge tm-badge--bye">BYE</div>',
        skip:    '<div class="tm-badge tm-badge--skip">—</div>',
        pending: '<div class="tm-badge tm-badge--pending">PENDIENTE</div>',
    };
    const badge = badgeMap[match.status] || '';

    // Action button
    let actionHtml = '';
    if (isMyMatch) {
        if (match.status === 'ready') {
            if (slotState?.match_id) {
                // Match already created — go straight to battle
                actionHtml = `<button class="tm-action-btn tm-action-btn--play"
                    onclick="window.location.href='/ranked/batalla?match=${esc(slotState.match_id)}'">
                    ▶ Jugar
                </button>`;
            } else {
                actionHtml = `<button class="tm-action-btn"
                    onclick="window.location.href='/torneos/sala?t=${esc(tournId)}&s=${esc(match.id)}'">
                    ⚔ Entrar al lobby
                </button>`;
            }
        } else if (match.status === 'ongoing' && match.match_id) {
            actionHtml = `<button class="tm-action-btn tm-action-btn--play"
                onclick="window.location.href='/ranked/batalla?match=${esc(match.match_id)}'">
                ▶ Jugar
            </button>`;
        } else if (match.status === 'pending') {
            // Player already assigned to this slot (won previous round), opponent still playing
            actionHtml = `<button class="tm-action-btn tm-action-btn--pending"
                onclick="window.location.href='/torneos/sala?t=${esc(tournId)}&s=${esc(match.id)}'">
                ⌛ Sala de espera
            </button>`;
        }
    }

    div.innerHTML = `
        <div class="tm-players">
            ${slotHtml(p1, 'p1')}
            ${slotHtml(p2, 'p2')}
        </div>
        ${badge}
        ${actionHtml}
    `;

    return div;
}


// ── Match alert (shown when it's your turn) ───────────────────────────────────

function checkMyMatch(t) {
    if (!currentUser || t.status !== 'active') { hideMatchAlert(); return; }

    const bracket    = t.bracket || [];
    const slotStates = t.slot_states || {};

    for (const round of bracket) {
        for (const match of round) {
            const isMyMatch = match.p1?.email === currentUser.email || match.p2?.email === currentUser.email;
            if (!isMyMatch) continue;

            if (match.status === 'ready') {
                const state = slotStates[match.id];
                if (state?.match_id) {
                    showMatchAlertPlay(state.match_id);
                } else {
                    showMatchAlertLobby(t.id, match.id, state?.ready_at);
                }
                return;
            }

            if (match.status === 'ongoing' && match.match_id) {
                showMatchAlertPlay(match.match_id);
                return;
            }

            if (match.status === 'pending') {
                showMatchAlertPending(t.id, match.id);
                return;
            }
        }
    }

    hideMatchAlert();
}

function showMatchAlertLobby(tid, slotId, readyAt) {
    const alertEl = document.getElementById('matchAlert');
    alertEl.style.display = 'flex';
    document.getElementById('matchAlertSub').textContent = '¡Es tu turno! Entra al lobby antes de que expire el tiempo.';
    const joinBtn = document.getElementById('matchJoinBtn');
    joinBtn.disabled = false;
    joinBtn.textContent = '⚔ Entrar al lobby';
    joinBtn.onclick = () => { window.location.href = `/torneos/sala?t=${tid}&s=${slotId}`; };
    startAlertCountdown(readyAt);
}

function showMatchAlertPending(tid, slotId) {
    const alertEl = document.getElementById('matchAlert');
    alertEl.style.display = 'flex';
    clearInterval(matchAlertInterval);
    document.getElementById('matchAlertTimer').textContent = '⌛';
    document.getElementById('matchAlertSub').textContent = 'Tu rival aún está en su partida anterior.';
    const joinBtn = document.getElementById('matchJoinBtn');
    joinBtn.disabled = false;
    joinBtn.textContent = 'Sala de espera';
    joinBtn.onclick = () => { window.location.href = `/torneos/sala?t=${tid}&s=${slotId}`; };
}

function showMatchAlertPlay(matchId) {
    const alertEl = document.getElementById('matchAlert');
    alertEl.style.display = 'flex';
    document.getElementById('matchAlertSub').textContent = 'La partida está en marcha.';
    clearInterval(matchAlertInterval);
    document.getElementById('matchAlertTimer').textContent = '';
    const joinBtn = document.getElementById('matchJoinBtn');
    joinBtn.disabled = false;
    joinBtn.textContent = '▶ Ir a la partida';
    joinBtn.onclick = () => { window.location.href = `/ranked/batalla?match=${matchId}`; };
}

function startAlertCountdown(readyAtIso) {
    clearInterval(matchAlertInterval);
    const timerEl = document.getElementById('matchAlertTimer');
    const readyAt = readyAtIso ? new Date(readyAtIso) : new Date();

    function tick() {
        const elapsed = (Date.now() - readyAt.getTime()) / 1000;
        const remaining = Math.max(0, 120 - elapsed);
        const m = Math.floor(remaining / 60);
        const s = Math.floor(remaining % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
        timerEl.className = `t-match-alert-timer${remaining < 30 ? ' urgent' : ''}`;
        if (remaining === 0) clearInterval(matchAlertInterval);
    }
    tick();
    matchAlertInterval = setInterval(tick, 1000);
}

function hideMatchAlert() {
    document.getElementById('matchAlert').style.display = 'none';
    clearInterval(matchAlertInterval);
    matchAlertInterval = null;
}

// ── Start tournament ───────────────────────────────────────────────────────────

async function handleStartTournament(id) {
    if (!confirm('¿Iniciar el torneo ahora? Todos los participantes recibirán su bracket.')) return;
    const btn = document.querySelector('.t-btn-start');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    const res = await fetch(`${API}/tournaments/${id}/start`, { method: 'POST', headers: authH() });
    const d   = await res.json();
    if (res.ok) {
        await refreshBracket();
    } else {
        alert(d.detail || 'Error al iniciar el torneo');
        if (btn) { btn.disabled = false; btn.textContent = '▶ Iniciar Torneo'; }
    }
}

// ── Delete tournament ─────────────────────────────────────────────────────────

async function handleDeleteTournament(id) {
    if (!confirm('¿Eliminar este torneo permanentemente?')) return;
    const res = await fetch(`${API}/tournaments/${id}`, { method: 'DELETE', headers: authH() });
    if (res.ok) { showList(); await loadList(); }
    else { const d = await res.json(); alert(d.detail || 'Error'); }
}

// ── Create tournament ─────────────────────────────────────────────────────────

async function submitCreateTournament(e) {
    e.preventDefault();
    const feedbackEl = document.getElementById('createFeedback');
    const submitBtn  = document.querySelector('.t-modal-submit');
    feedbackEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando...';

    const form     = new FormData();
    const name     = document.getElementById('cName').value.trim();
    const desc     = document.getElementById('cDesc').value.trim();
    const start    = document.getElementById('cStart').value;
    const banner   = document.getElementById('cBanner').files[0];

    if (!name) { feedbackEl.textContent = 'El nombre es obligatorio.'; submitBtn.disabled = false; submitBtn.textContent = 'Crear torneo'; return; }
    if (!start) { feedbackEl.textContent = 'La fecha de inicio es obligatoria.'; submitBtn.disabled = false; submitBtn.textContent = 'Crear torneo'; return; }

    form.append('name', name);
    form.append('description', desc);
    form.append('start_time', new Date(start).toISOString());
    if (banner) form.append('banner', banner);

    try {
        const res = await fetch(`${API}/tournaments`, { method: 'POST', headers: authHForm(), body: form });
        const d   = await res.json();
        if (!res.ok) {
            feedbackEl.textContent = d.detail || 'Error al crear el torneo';
        } else {
            document.getElementById('createModal').style.display = 'none';
            document.getElementById('createForm').reset();
            document.getElementById('bannerPreview').style.display = 'none';
            await loadList();
            openBracket(d.id);
        }
    } catch {
        feedbackEl.textContent = 'Error de conexión';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear torneo';
}

// ── Boot ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', initTournaments);
