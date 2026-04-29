const API_BASE = 'https://api.codexar.es/api';
const WS_BASE  = 'wss://api.codexar.es/api';

const DIFF_LABELS = {
    normal:    'NORMAL',
    dificil:   'DIFÍCIL',
    demencial: 'DEMENCIAL',
};

const MONACO_LANG = {
    'Python': 'python',
    'C++':    'cpp',
    'Java':   'java',
    'Go':     'go',
    'C#':     'csharp',
};

// ── State ─────────────────────────────────────────────────────────────────────
let exerciseData      = null;
let selectedLang      = 'Python';
let editor            = null;
let battleEnded       = false;
let ws                = null;
let timeLeft          = 60;
let timerInterval     = null;
let myUsername        = null;
let pendingNavHref    = '/home';

// Shared editor sync
let syncingFromRemote = false;
let syncTimer         = null;

// Players map: username → avatar element
let playerSlots = {};

const params     = new URLSearchParams(window.location.search);
const roomId     = params.get('room');
const difficulty = (params.get('difficulty') || 'normal').toLowerCase();

// ── Monaco bootstrap ──────────────────────────────────────────────────────────
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
    monaco.editor.defineTheme('codexar-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
            { token: 'comment',   foreground: '555577', fontStyle: 'italic' },
            { token: 'keyword',   foreground: '00ffcc' },
            { token: 'string',    foreground: 'a8ff78' },
            { token: 'number',    foreground: 'f89820' },
            { token: 'type',      foreground: '79b8ff' },
            { token: 'delimiter', foreground: 'cccccc' },
        ],
        colors: {
            'editor.background':              '#08080e',
            'editor.foreground':              '#e0e0e0',
            'editor.lineHighlightBackground': '#0f0f1a',
            'editor.selectionBackground':     '#00ffcc22',
            'editorCursor.foreground':        '#00ffcc',
            'editorLineNumber.foreground':    '#333355',
            'editorLineNumber.activeForeground': '#00ffcc88',
            'editorIndentGuide.background':   '#1a1a2e',
            'editorWidget.background':        '#0d0d18',
            'editorSuggestWidget.background': '#0d0d18',
            'editorSuggestWidget.border':     '#1e1e3a',
            'editorSuggestWidget.selectedBackground': '#00ffcc18',
            'scrollbarSlider.background':     '#00ffcc18',
            'scrollbarSlider.hoverBackground':'#00ffcc30',
        }
    });

    monaco.editor.defineTheme('codexar-light', {
        base: 'vs', inherit: true,
        rules: [
            { token: 'comment',   foreground: '7777aa', fontStyle: 'italic' },
            { token: 'keyword',   foreground: '0077bb' },
            { token: 'string',    foreground: '559900' },
            { token: 'number',    foreground: 'aa6600' },
            { token: 'type',      foreground: '005599' },
            { token: 'delimiter', foreground: '333355' },
        ],
        colors: {
            'editor.background':              '#f8f9fc',
            'editor.foreground':              '#1a1a2e',
            'editor.lineHighlightBackground': '#eef0f8',
            'editor.selectionBackground':     '#00a88430',
            'editorCursor.foreground':        '#00a884',
            'editorLineNumber.foreground':    '#8888aa',
            'editorLineNumber.activeForeground': '#00a884',
            'editorIndentGuide.background':   '#d0d4e8',
            'editorWidget.background':        '#ffffff',
            'editorSuggestWidget.background': '#ffffff',
            'editorSuggestWidget.border':     '#c0c4d8',
            'editorSuggestWidget.selectedBackground': '#00a88420',
            'scrollbarSlider.background':     '#00a88420',
            'scrollbarSlider.hoverBackground':'#00a88440',
        }
    });

    const _monacoTheme = (typeof getTheme === 'function' && getTheme() === 'light') ? 'codexar-light' : 'codexar-dark';

    editor = monaco.editor.create(document.getElementById('codeEditor'), {
        value: '', language: 'python', theme: _monacoTheme,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 14, lineHeight: 24,
        minimap: { enabled: false }, scrollBeyondLastLine: false,
        lineNumbers: 'on', renderLineHighlight: 'gutter', roundedSelection: true,
        automaticLayout: true, tabSize: 4, insertSpaces: true, wordWrap: 'off',
        folding: true, bracketPairColorization: { enabled: true },
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        acceptSuggestionOnEnter: 'on', padding: { top: 16, bottom: 16 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    });

    // Shared real-time editor sync — debounced 250ms
    editor.onDidChangeModelContent(() => {
        if (syncingFromRemote || battleEnded || !exerciseData) return;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(sendCodeSync, 250);
    });

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => { if (!document.getElementById('btnCheck').disabled) handleCheck(); }
    );

    initBattle();
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function initBattle() {
    if (!roomId) { window.location.href = '/home'; return; }

    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }

    document.getElementById('survDiffLabel').textContent = DIFF_LABELS[difficulty] || 'NORMAL';
    document.title = `Codexar — Supervivencia ${DIFF_LABELS[difficulty] || ''}`;

    try {
        const userRes = await fetch(`${API_BASE}/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) { window.location.href = '/login'; return; }
        const user = await userRes.json();
        myUsername = user.username;

        document.getElementById('navUsername').textContent = user.username;
        const navAvatar = document.getElementById('navAvatar');
        if (user.avatar) {
            navAvatar.style.cssText = `background-image:url(${user.avatar});background-size:cover;background-position:center;border:1px solid var(--accent-cyan);`;
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
    } catch {
        window.location.href = '/login';
        return;
    }

    // Setup lang pills
    const pills = document.querySelectorAll('.lang-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            if (battleEnded || !exerciseData) return;
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedLang = pill.dataset.lang;
            loadStub(selectedLang);
            // Broadcast language change to teammates
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'lang_sync', lang: selectedLang }));
            }
        });
    });

    document.getElementById('btnCheck').addEventListener('click', handleCheck);
    document.getElementById('btnSave').addEventListener('click', handleSave);
    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        battleEnded = true;
        window.location.href = '/login';
    });

    // Connect WebSocket
    connectWebSocket(token);

    // Intercept browser close / reload
    window.addEventListener('beforeunload', e => {
        if (!battleEnded) {
            e.preventDefault();
            e.returnValue = '';
            // Best-effort abandon signal
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'abandon' }));
            }
        }
    });
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function connectWebSocket(token) {
    ws = new WebSocket(`${WS_BASE}/survival/ws/${roomId}?token=${encodeURIComponent(token)}`);

    ws.addEventListener('open', () => {
        // Connection established — clear any error state
        const titleEl = document.getElementById('exTitle');
        if (titleEl.textContent === 'Error de conexión') {
            titleEl.textContent = 'Conectando...';
        }
    });

    ws.addEventListener('message', e => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        handleWsMessage(msg);
    });

    ws.addEventListener('error', () => {
        document.getElementById('exTitle').textContent = 'Error de conexión';
        document.getElementById('exDescription').textContent =
            'No se pudo conectar al servidor de la partida. Recarga la página para reintentar.';
    });

    ws.addEventListener('close', () => {
        if (!battleEnded) {
            // Attempt reconnect after 2s
            setTimeout(() => {
                const t = localStorage.getItem('access_token');
                if (t && !battleEnded) connectWebSocket(t);
            }, 2000);
        }
    });
}

// ── WS message dispatcher ─────────────────────────────────────────────────────
function handleWsMessage(msg) {
    switch (msg.type) {
        case 'game_started':
            renderExercise(msg.exercise);
            updateTimerDisplay(msg.time_left);
            document.getElementById('survExNum').textContent = `#${msg.exercise_num}`;
            startClientTimer();
            // Apply shared code if reconnecting mid-game
            if (msg.current_code && msg.current_code.trim()) {
                syncingFromRemote = true;
                editor.setValue(msg.current_code);
                syncingFromRemote = false;
            }
            break;

        case 'exercise_solved':
            flashPlayerSolved(msg.solved_by);
            renderExercise(msg.next_exercise);
            updateTimerDisplay(msg.time_left);
            document.getElementById('survExNum').textContent = `#${msg.exercise_num}`;
            flashTimerBonus();
            resetCheckState();
            // Clear shared editor for new exercise
            syncingFromRemote = true;
            editor.setValue('');
            syncingFromRemote = false;
            break;

        case 'time_sync':
            updateTimerDisplay(msg.time_left);
            break;

        case 'code_sync':
            if (msg.username !== myUsername) {
                syncingFromRemote = true;
                const pos = editor.getPosition();
                editor.setValue(msg.code);
                editor.setPosition(pos || { lineNumber: 1, column: 1 });
                syncingFromRemote = false;
                // Sync language if it changed
                if (msg.lang && msg.lang !== selectedLang) {
                    updateSelectedLang(msg.lang, /* remoteOnly */ true);
                }
            }
            break;

        case 'lang_sync':
            if (msg.username !== myUsername) {
                updateSelectedLang(msg.lang, /* remoteOnly */ true);
            }
            break;

        case 'player_joined':
        case 'player_left':
            renderPlayersBar(msg.players);
            break;

        case 'wrong_answer':
            showWrongAnswerToast(msg.details);
            break;

        case 'game_over':
            showGameOver(msg.exercises_solved, msg.new_record, msg.abandoned_by);
            break;
    }
}

// ── Shared code sync ──────────────────────────────────────────────────────────
function sendCodeSync() {
    if (!ws || ws.readyState !== WebSocket.OPEN || battleEnded) return;
    ws.send(JSON.stringify({ action: 'code_sync', code: editor.getValue(), lang: selectedLang }));
}

// ── Language update ───────────────────────────────────────────────────────────
function updateSelectedLang(lang, remoteOnly = false) {
    selectedLang = lang;
    const pills = document.querySelectorAll('.lang-pill');
    pills.forEach(p => {
        if (p.dataset.lang === lang) p.classList.add('active');
        else p.classList.remove('active');
    });
    // Update Monaco language
    if (editor && exerciseData) {
        const model = editor.getModel();
        monaco.editor.setModelLanguage(model, MONACO_LANG[lang] || 'plaintext');
        // Only load stub if we're the one changing (not a remote sync)
        if (!remoteOnly) loadStub(lang);
    }
}

// ── Players Bar ───────────────────────────────────────────────────────────────
function renderPlayersBar(players) {
    const bar = document.getElementById('survPlayersBar');
    bar.innerHTML = '';
    playerSlots = {};

    players.forEach((player, idx) => {
        if (idx > 0) {
            const sep = document.createElement('div');
            sep.className = 'surv-player-sep';
            bar.appendChild(sep);
        }

        const slot = document.createElement('div');
        slot.className = 'surv-player-slot';

        const avatarEl = document.createElement('div');
        avatarEl.className = 'surv-player-avatar';
        if (player.avatar) {
            avatarEl.style.backgroundImage = `url(${player.avatar})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
        } else {
            avatarEl.textContent = (player.username || '?').charAt(0).toUpperCase();
        }

        const nameEl = document.createElement('div');
        nameEl.className = 'surv-player-name';
        nameEl.textContent = player.username;

        slot.appendChild(avatarEl);
        slot.appendChild(nameEl);
        bar.appendChild(slot);
        playerSlots[player.username] = avatarEl;
    });
}

function flashPlayerSolved(username) {
    const avatarEl = playerSlots[username];
    if (!avatarEl) return;
    avatarEl.classList.add('solved');
    setTimeout(() => avatarEl.classList.remove('solved'), 2500);
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function updateTimerDisplay(seconds) {
    timeLeft = seconds;
    renderTimer();
}

function renderTimer() {
    const el = document.getElementById('survTimer');
    if (!el) return;
    const t = Math.max(0, Math.ceil(timeLeft));
    const mins = Math.floor(t / 60);
    const secs = String(t % 60).padStart(2, '0');
    el.textContent = `${String(mins).padStart(2, '0')}:${secs}`;

    el.classList.remove('warning', 'danger');
    if (timeLeft <= 10)      el.classList.add('danger');
    else if (timeLeft <= 15) el.classList.add('warning');
}

function startClientTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (battleEnded) { clearInterval(timerInterval); return; }
        timeLeft = Math.max(0, timeLeft - 1);
        renderTimer();
    }, 1000);
}

function flashTimerBonus() {
    const el = document.getElementById('survTimer');
    if (!el) return;
    el.classList.remove('bonus-flash');
    void el.offsetWidth;
    el.classList.add('bonus-flash');
    setTimeout(() => el.classList.remove('bonus-flash'), 600);
}

// ── Exercise rendering ────────────────────────────────────────────────────────
function renderExercise(ex) {
    exerciseData = ex;
    document.title = `Codexar Supervivencia — ${ex.title}`;
    document.getElementById('exTitle').textContent = ex.title;

    let diffClass = 'badge-normal';
    if (ex.difficulty === 'Fácil')       diffClass = 'badge-facil';
    if (ex.difficulty === 'Difícil')     diffClass = 'badge-dificil';
    if (ex.difficulty === 'Muy Difícil') diffClass = 'badge-muy-dificil';
    if (ex.difficulty === 'Insane')      diffClass = 'badge-insane';
    if (ex.difficulty === 'Abyssal')     diffClass = 'badge-abyssal';

    document.getElementById('exBadges').innerHTML = `
        <span class="ex-badge ${diffClass}">${escHtml(ex.difficulty)}</span>
        <span class="ex-badge badge-category">${escHtml(ex.category)}</span>
    `;
    document.getElementById('exDescription').textContent = ex.description;
    renderTestCases(ex.test_cases, null);
    loadStub(selectedLang);
}

function loadStub(lang) {
    if (!exerciseData?.stub) return;
    const stub = exerciseData.stub[lang] || '';
    const model = editor.getModel();
    monaco.editor.setModelLanguage(model, MONACO_LANG[lang] || 'plaintext');
    // Use setValue without triggering our sync (stub load is intentional)
    syncingFromRemote = true;
    editor.setValue(stub);
    syncingFromRemote = false;
    editor.setPosition({ lineNumber: editor.getModel().getLineCount(), column: 1 });
    editor.focus();
}

function renderTestCases(testCases, result) {
    const list = document.getElementById('testCasesList');
    if (!testCases?.length) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem;">No hay casos de prueba disponibles.</div>';
        return;
    }
    list.innerHTML = '';
    testCases.forEach((tc, i) => {
        const card = document.createElement('div');
        card.className = 'testcase-card';
        if (result?.correct)                    card.classList.add('passing');
        else if (result?.failed_case === i + 1) card.classList.add('failing');

        const stateText = result?.correct
            ? '✓ Superado'
            : result?.failed_case === i + 1 ? '✗ Fallido' : '';
        const gotHtml = (result?.failed_case === i + 1 && result.got !== undefined)
            ? `<div class="tc-row"><span class="tc-label">Obtenido</span><span class="tc-value got-wrong">${escHtml(result.got)}</span></div>`
            : '';

        card.innerHTML = `
            <div class="tc-row">
                <span class="tc-label">Caso ${i + 1}</span>
                <span class="tc-value" style="color:var(--text-muted);font-size:0.72rem;padding-top:2px;">${stateText}</span>
            </div>
            <div class="tc-row">
                <span class="tc-label">Entrada</span>
                <span class="tc-value">${escHtml(tc.input)}</span>
            </div>
            <div class="tc-row">
                <span class="tc-label">Esperado</span>
                <span class="tc-value expected">${escHtml(tc.expected_output)}</span>
            </div>
            ${gotHtml}`;
        list.appendChild(card);
    });
}

// ── Check ─────────────────────────────────────────────────────────────────────
async function handleCheck() {
    if (battleEnded || !exerciseData) return;
    const token    = localStorage.getItem('access_token');
    const code     = editor.getValue().trim();
    const btnCheck = document.getElementById('btnCheck');
    const statusEl = document.getElementById('editorStatus');

    if (!code) {
        showOutput('error', { message: 'Escribe tu solución antes de comprobar.' });
        return;
    }

    btnCheck.disabled = true;
    btnCheck.classList.add('loading');
    btnCheck.innerHTML = '<span class="btn-icon">⏳</span> Comprobando...';
    statusEl.textContent = 'Ejecutando casos de prueba...';
    statusEl.style.color = 'var(--text-muted)';
    document.getElementById('editorOutput').style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/exercises/${exerciseData.id}/solve`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language: selectedLang, save: false }),
        });
        const data = await res.json();

        if (data.correct) {
            statusEl.textContent = '✓ Todos los casos superados — Guarda para avanzar';
            statusEl.style.color = 'var(--accent-green)';
            showOutput('success', data);
            renderTestCases(exerciseData.test_cases, { correct: true });
            document.getElementById('btnSave').classList.remove('hidden');
            btnCheck.classList.add('hidden');
        } else {
            statusEl.textContent = `✗ ${data.message}`;
            statusEl.style.color = 'var(--accent-red)';
            showOutput('error', data);
            renderTestCases(exerciseData.test_cases, data);
            btnCheck.disabled = false;
            btnCheck.classList.remove('loading');
            btnCheck.innerHTML = '<span class="btn-icon">▶</span> Comprobar Código';
        }
    } catch {
        statusEl.textContent = 'Error de conexión con la API';
        statusEl.style.color = 'var(--accent-red)';
        showOutput('error', { message: 'No se pudo conectar con el servidor.' });
        btnCheck.disabled = false;
        btnCheck.classList.remove('loading');
        btnCheck.innerHTML = '<span class="btn-icon">▶</span> Comprobar Código';
    }
}

// ── Save (submit via WebSocket) ───────────────────────────────────────────────
function handleSave() {
    if (battleEnded || !ws || ws.readyState !== WebSocket.OPEN) return;
    const btnSave = document.getElementById('btnSave');
    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="btn-icon">⏳</span> Enviando...';
    ws.send(JSON.stringify({ action: 'submit' }));
}

function resetCheckState() {
    const btnCheck = document.getElementById('btnCheck');
    const btnSave  = document.getElementById('btnSave');
    btnCheck.disabled = false;
    btnCheck.classList.remove('loading', 'hidden');
    btnCheck.innerHTML = '<span class="btn-icon">▶</span> Comprobar Código';
    btnSave.classList.add('hidden');
    btnSave.disabled = false;
    btnSave.innerHTML = '<span class="btn-icon">✓</span> Guardar Solución';
    document.getElementById('editorStatus').textContent = '';
    document.getElementById('editorOutput').style.display = 'none';
}

// ── Output ────────────────────────────────────────────────────────────────────
function showOutput(type, data) {
    const output  = document.getElementById('editorOutput');
    const content = document.getElementById('outputContent');
    output.style.display = 'block';

    if (type === 'success') {
        content.innerHTML = `
            <div class="output-success">
                <span style="font-size:1.3rem;">✓</span>
                <span>${escHtml(data.message)}</span>
            </div>`;
    } else {
        const detailHtml = data.input !== undefined ? `
            <div class="output-error-detail">
                <span><span class="val-label">Entrada:</span> <span>${escHtml(data.input)}</span></span>
                <span><span class="val-label">Esperado:</span> <span class="val-expected">${escHtml(data.expected)}</span></span>
                ${data.got !== undefined ? `<span><span class="val-label">Obtenido:</span> <span class="val-got">${escHtml(data.got)}</span></span>` : ''}
            </div>` : '';
        content.innerHTML = `
            <div class="output-error">
                <div class="output-error-title">✗ ${escHtml(data.message)}</div>
                ${detailHtml}
            </div>`;
    }
}

// ── Wrong answer toast ────────────────────────────────────────────────────────
function showWrongAnswerToast(details) {
    const existing = document.getElementById('survWrongToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'survWrongToast';
    toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.35);
        color: rgba(239,68,68,0.9); padding: 10px 20px; border-radius: 8px;
        font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 700;
        z-index: 400;
    `;
    toast.textContent = `✗ ${details || 'Solución incorrecta'}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ── Game Over ─────────────────────────────────────────────────────────────────
function showGameOver(exercisesSolved, newRecord, abandonedBy) {
    battleEnded = true;
    clearInterval(timerInterval);
    clearTimeout(syncTimer);

    if (editor) editor.updateOptions({ readOnly: true });
    document.getElementById('btnCheck').disabled = true;
    document.getElementById('btnSave').disabled  = true;

    document.getElementById('goExercisesNum').textContent = exercisesSolved;

    const iconEl   = document.getElementById('goIcon');
    const titleEl  = document.getElementById('goTitle');
    const abandonEl = document.getElementById('goAbandonMsg');

    if (abandonedBy) {
        iconEl.textContent  = '🚪';
        titleEl.textContent = 'Partida Terminada';
        abandonEl.textContent = abandonedBy === myUsername
            ? 'Abandonaste la partida'
            : `${abandonedBy} salió de la partida`;
        abandonEl.classList.remove('hidden');
    } else {
        iconEl.textContent  = '⏱';
        titleEl.textContent = 'Tiempo Agotado';
    }

    if (newRecord) {
        document.getElementById('goNewRecord').classList.remove('hidden');
    }
    document.getElementById('gameOverOverlay').classList.remove('hidden');
}

// ── Leave / Abandon flow ──────────────────────────────────────────────────────
window.confirmLeave = function (href) {
    if (battleEnded) {
        window.location.href = href || '/home';
        return;
    }
    pendingNavHref = href || '/home';
    document.getElementById('abandonOverlay').classList.remove('hidden');
};

window.closeAbandonModal = function () {
    document.getElementById('abandonOverlay').classList.add('hidden');
};

window.doLeave = function () {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'abandon' }));
    }
    battleEnded = true;
    window.location.href = pendingNavHref || '/home';
};

window.replaySurvival = function () {
    battleEnded = true;
    window.location.href = `/supervivencia/lobby?difficulty=${difficulty}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
