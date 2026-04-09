const API_BASE = 'https://codexarapi.onrender.com/api';

// ── Config ────────────────────────────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
    normal:    { label: 'NORMAL'    },
    dificil:   { label: 'DIFÍCIL'  },
    demencial: { label: 'DEMENCIAL' },
};

// Timer matrix: exercise difficulty × game difficulty → seconds
const TIMER_MATRIX = {
    'Fácil':       { normal: 360,  dificil: 180,  demencial: 90  },
    'Normal':      { normal: 600,  dificil: 300,  demencial: 150 },
    'Difícil':     { normal: 900,  dificil: 480,  demencial: 240 },
    'Muy Difícil': { normal: 1200, dificil: 720,  demencial: 360 },
    'Insane':      { normal: 1800, dificil: 1080, demencial: 600 },
    'Abyssal':     { normal: 2700, dificil: 1500, demencial: 900 },
};

const MONACO_LANG = {
    'Python': 'python',
    'C++':    'cpp',
    'Java':   'java',
    'Go':     'go',
    'C#':     'csharp',
};

// ── State ─────────────────────────────────────────────────────────────────────
let exerciseData  = null;
let selectedLang  = 'Python';
let editor        = null;
let timerInterval = null;
let timeLeft      = 0;
let totalTime     = 0;
let battleEnded   = false;

const params     = new URLSearchParams(window.location.search);
const difficulty = (params.get('difficulty') || 'normal').toLowerCase();
const config     = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;

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

    editor = monaco.editor.create(document.getElementById('codeEditor'), {
        value: '', language: 'python', theme: 'codexar-dark',
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

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => { if (!document.getElementById('btnCheck').disabled) handleCheck(); }
    );

    initBattle();
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function initBattle() {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    document.getElementById('timerDiffLabel').textContent = config.label;
    // Show loading state in countdown until exercise loads
    document.getElementById('timerCountdown').textContent = '—:——';

    try {
        const [userRes, exRes] = await Promise.all([
            fetch(`${API_BASE}/user/me`,          { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE}/exercises/random`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!userRes.ok) throw new Error('auth');
        if (!exRes.ok)   throw new Error('exercise');

        const user = await userRes.json();
        exerciseData = await exRes.json();

        populateNavbar(user);
        renderExercise(exerciseData, user);

        // Compute timer based on exercise difficulty × game difficulty
        const exDiff   = exerciseData.difficulty || 'Normal';
        const row      = TIMER_MATRIX[exDiff] || TIMER_MATRIX['Normal'];
        const seconds  = row[difficulty] ?? 600;
        startTimer(seconds);

    } catch (err) {
        if (err.message === 'auth') { window.location.href = 'Login.html'; return; }
        document.getElementById('timerCountdown').textContent = 'ERROR';
    }
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function populateNavbar(user) {
    document.getElementById('navUsername').textContent = user.username;
    const navAvatar = document.getElementById('navAvatar');
    if (user.avatar) {
        navAvatar.style.cssText = `background-image:url(${user.avatar});background-size:cover;background-position:center;border:1px solid var(--accent-cyan);`;
        navAvatar.textContent = '';
    } else {
        navAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
}

// ── Render exercise ───────────────────────────────────────────────────────────
function renderExercise(ex, user) {
    document.title = `Codexar VS CPU — ${ex.title}`;
    document.getElementById('exTitle').textContent = ex.title;

    let diffClass = 'badge-normal';
    if (ex.difficulty === 'Fácil')   diffClass = 'badge-facil';
    if (ex.difficulty === 'Difícil')     diffClass = 'badge-dificil';
    if (ex.difficulty === 'Muy Difícil') diffClass = 'badge-muy-dificil';
    if (ex.difficulty === 'Insane')      diffClass = 'badge-insane';
    if (ex.difficulty === 'Abyssal')     diffClass = 'badge-abyssal';

    document.getElementById('exBadges').innerHTML = `
        <span class="ex-badge ${diffClass}">${ex.difficulty}</span>
        <span class="ex-badge badge-category">${ex.category}</span>
    `;

    document.getElementById('exDescription').textContent = ex.description;
    renderTestCases(ex.test_cases, null);

    const pills = document.querySelectorAll('.lang-pill');
    if (user?.languages?.length > 0) {
        const preferred = user.languages[0];
        const match = [...pills].find(p => p.dataset.lang === preferred);
        if (match) {
            pills.forEach(p => p.classList.remove('active'));
            match.classList.add('active');
            selectedLang = preferred;
        }
    }
    loadStub(selectedLang);

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            if (battleEnded) return;
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedLang = pill.dataset.lang;
            loadStub(selectedLang);
        });
    });

    document.getElementById('btnCheck').addEventListener('click', handleCheck);
}

function loadStub(lang) {
    if (!exerciseData?.stub) return;
    const stub = exerciseData.stub[lang] || '';
    const model = editor.getModel();
    monaco.editor.setModelLanguage(model, MONACO_LANG[lang] || 'plaintext');
    editor.setValue(stub);
    editor.setPosition({ lineNumber: editor.getModel().getLineCount(), column: 1 });
    editor.focus();
}

// ── Test Cases ────────────────────────────────────────────────────────────────
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

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer(seconds) {
    timeLeft  = seconds;
    totalTime = seconds;
    updateTimerUI();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            onTimeUp();
        }
    }, 1000);
}

function updateTimerUI() {
    const pct     = totalTime > 0 ? timeLeft / totalTime : 0;
    const fill    = document.getElementById('timerBarFill');
    const counter = document.getElementById('timerCountdown');
    const mins    = Math.floor(timeLeft / 60);
    const secs    = String(timeLeft % 60).padStart(2, '0');

    fill.style.width = `${pct * 100}%`;

    fill.classList.remove('warn', 'danger');
    counter.classList.remove('warn', 'danger');

    if (pct <= 0.3) {
        fill.classList.add('danger');
        counter.classList.add('danger');
    } else if (pct <= 0.6) {
        fill.classList.add('warn');
        counter.classList.add('warn');
    }

    counter.textContent = `${mins}:${secs}`;
}

function onTimeUp() {
    if (battleEnded) return;
    battleEnded = true;
    freezeEditor();
    document.getElementById('btnCheck').disabled = true;
    document.getElementById('defeatOverlay').classList.remove('hidden');
    const token = localStorage.getItem('access_token');
    fetch(`${API_BASE}/user/bot-result`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ won: false, difficulty }),
    }).catch(() => {});
}

function freezeEditor() {
    document.querySelector('.editor-wrapper')?.classList.add('frozen');
    if (editor) editor.updateOptions({ readOnly: true });
}

// ── Check ─────────────────────────────────────────────────────────────────────
async function handleCheck() {
    if (battleEnded) return;
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
            clearInterval(timerInterval);
            battleEnded = true;
            statusEl.textContent = '✓ Todos los casos superados';
            statusEl.style.color = 'var(--accent-green)';
            showOutput('success', data);
            renderTestCases(exerciseData.test_cases, { correct: true });
            showVictory();
        } else {
            statusEl.textContent = `✗ ${data.message}`;
            statusEl.style.color = 'var(--accent-red)';
            showOutput('error', data);
            renderTestCases(exerciseData.test_cases, data);
        }
    } catch {
        statusEl.textContent = 'Error de conexión con la API';
        statusEl.style.color = 'var(--accent-red)';
        showOutput('error', { message: 'No se pudo conectar con el servidor.' });
    } finally {
        if (!battleEnded) {
            btnCheck.disabled = false;
            btnCheck.classList.remove('loading');
            btnCheck.innerHTML = '<span class="btn-icon">▶</span> Comprobar Código';
        }
    }
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

// ── Win/Lose ──────────────────────────────────────────────────────────────────
function showVictory() {
    const elapsed = totalTime - timeLeft;
    const mins    = Math.floor(elapsed / 60);
    const secs    = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    document.getElementById('victorySubtitle').textContent = 'Resolviste el reto antes que la IA';
    document.getElementById('victoryTimeInfo').textContent = `Tiempo empleado: ${timeStr}`;
    document.getElementById('victoryOverlay').classList.remove('hidden');
    const token = localStorage.getItem('access_token');
    fetch(`${API_BASE}/user/bot-result`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ won: true, difficulty }),
    }).catch(() => {});
}

function replayBattle() {
    window.location.href = `VsCpuBattle.html?difficulty=${difficulty}`;
}

// ── Abandon modal ─────────────────────────────────────────────────────────────
window.confirmLeave = function () {
    if (battleEnded) {
        window.location.href = 'Home.html';
        return;
    }
    document.getElementById('abandonOverlay').classList.remove('hidden');
};

window.closeAbandonModal = function () {
    document.getElementById('abandonOverlay').classList.add('hidden');
};

window.doLeave = function () {
    window.location.href = 'Home.html';
};

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
