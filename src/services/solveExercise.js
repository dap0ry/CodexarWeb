const API_BASE = 'https://codexarapi.onrender.com/api';
let exerciseData = null;
let checkPassed   = false;
let selectedLang  = 'Python';
let editor        = null;   // Monaco instance

const MONACO_LANG = {
    'Python': 'python',
    'C++':    'cpp',
    'Java':   'java',
    'Go':     'go',
    'C#':     'csharp',
};

// ─── Monaco bootstrap ────────────────────────────────────────────
require.config({
    paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }
});

require(['vs/editor/editor.main'], function () {
    // Custom dark theme matching Codexar palette
    monaco.editor.defineTheme('codexar-dark', {
        base: 'vs-dark',
        inherit: true,
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
        base: 'vs',
        inherit: true,
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
        value:                '',
        language:             'python',
        theme:                _monacoTheme,
        fontFamily:           "'JetBrains Mono', monospace",
        fontSize:             14,
        lineHeight:           24,
        minimap:              { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers:          'on',
        renderLineHighlight:  'gutter',
        roundedSelection:     true,
        automaticLayout:      true,
        tabSize:              4,
        insertSpaces:         true,
        wordWrap:             'off',
        folding:              true,
        bracketPairColorization: { enabled: true },
        renderWhitespace:     'selection',
        suggestOnTriggerCharacters: true,
        quickSuggestions:     { other: true, comments: false, strings: false },
        acceptSuggestionOnEnter: 'on',
        padding:              { top: 16, bottom: 16 },
        scrollbar: {
            verticalScrollbarSize:   8,
            horizontalScrollbarSize: 8,
        },
    });

    // Ctrl+Enter → comprobar código
    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => { if (!document.getElementById('btnCheck').disabled) handleCheck(); }
    );

    initSolvePage();
});

// ─── Init ────────────────────────────────────────────────────────
async function initSolvePage() {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    const params     = new URLSearchParams(window.location.search);
    const exerciseId = params.get('id');
    if (!exerciseId) { window.location.href = 'Exercises.html'; return; }

    try {
        const [userRes, exRes] = await Promise.all([
            fetch(`${API_BASE}/user/me`,             { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE}/exercises/${exerciseId}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!userRes.ok) throw new Error('Auth Fault');
        if (!exRes.ok)   throw new Error('Exercise Fault');

        const user = await userRes.json();
        exerciseData  = await exRes.json();

        populateNavbar(user);
        renderExercise(exerciseData, user);
    } catch (err) {
        console.error('Init error:', err);
        if (err.message === 'Auth Fault') window.location.href = 'Login.html';
    }
}

// ─── Navbar ──────────────────────────────────────────────────────
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

// ─── Render Exercise ─────────────────────────────────────────────
function renderExercise(ex, user) {
    document.getElementById('breadcrumbTitle').textContent = ex.title;
    document.title = `Codexar - ${ex.title}`;
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
        ${ex.solved ? '<span class="ex-badge badge-solved-ex">✓ Resuelto</span>' : ''}
    `;

    document.getElementById('exDescription').textContent = ex.description;
    renderTestCases(ex.test_cases, null);

    // Language pills
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
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedLang = pill.dataset.lang;
            loadStub(selectedLang);
            resetCheck();
        });
    });

    if (ex.solved) showAlreadySolved();

    document.getElementById('btnCheck').addEventListener('click', handleCheck);
    document.getElementById('btnSave').addEventListener('click', handleSave);
}

function loadStub(lang) {
    if (!exerciseData?.stub) return;
    const stub = exerciseData.stub[lang] || '';

    // Set Monaco language
    const model = editor.getModel();
    monaco.editor.setModelLanguage(model, MONACO_LANG[lang] || 'plaintext');

    // Set content and move cursor to end of stub
    editor.setValue(stub);
    editor.setPosition({ lineNumber: editor.getModel().getLineCount(), column: 1 });
    editor.focus();
}

// ─── Test Cases ──────────────────────────────────────────────────
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
        card.id = `tc-${i}`;

        if (result?.correct) {
            card.classList.add('passing');
        } else if (result?.failed_case === i + 1) {
            card.classList.add('failing');
        }

        const stateText = result?.correct
            ? '✓ Superado'
            : result?.failed_case === i + 1
                ? '✗ Fallido'
                : '';

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
            ${gotHtml}
        `;
        list.appendChild(card);
    });
}

// ─── Check ───────────────────────────────────────────────────────
async function handleCheck() {
    const token   = localStorage.getItem('access_token');
    const code    = editor.getValue().trim();
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
    resetCheck(false); // don't re-render test cases yet

    try {
        const res = await fetch(`${API_BASE}/exercises/${exerciseData.id}/solve`, {
            method: 'POST',
            headers: {
                Authorization:  `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, language: selectedLang, save: false }),
        });
        const data = await res.json();

        if (data.correct) {
            checkPassed = true;
            statusEl.textContent = '✓ Todos los casos superados';
            statusEl.style.color = 'var(--accent-green)';
            showOutput('success', data);
            renderTestCases(exerciseData.test_cases, { correct: true });
            document.getElementById('btnSave').style.display = 'flex';
        } else {
            checkPassed = false;
            statusEl.textContent = `✗ ${data.message}`;
            statusEl.style.color = 'var(--accent-red)';
            showOutput('error', data);
            renderTestCases(exerciseData.test_cases, data);
            document.getElementById('btnSave').style.display = 'none';
        }
    } catch {
        statusEl.textContent = 'Error de conexión con la API';
        statusEl.style.color = 'var(--accent-red)';
        showOutput('error', { message: 'No se pudo conectar con el servidor.' });
    } finally {
        btnCheck.disabled = false;
        btnCheck.classList.remove('loading');
        btnCheck.innerHTML = '<span class="btn-icon">▶</span> Comprobar Código';
    }
}

// ─── Save ────────────────────────────────────────────────────────
async function handleSave() {
    if (!checkPassed) return;
    const token   = localStorage.getItem('access_token');
    const code    = editor.getValue().trim();
    const btnSave = document.getElementById('btnSave');

    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="btn-icon">⏳</span> Guardando...';

    try {
        const res = await fetch(`${API_BASE}/exercises/${exerciseData.id}/solve`, {
            method: 'POST',
            headers: {
                Authorization:  `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, language: selectedLang, save: true }),
        });
        const data = await res.json();

        if (data.correct) {
            showAlreadySolved();
            btnSave.style.display = 'none';
            const statusEl = document.getElementById('editorStatus');
            statusEl.textContent = '✓ Ejercicio guardado';
            statusEl.style.color = 'var(--accent-green)';
            const badges = document.getElementById('exBadges');
            if (!badges.querySelector('.badge-solved-ex')) {
                badges.innerHTML += '<span class="ex-badge badge-solved-ex">✓ Resuelto</span>';
            }
        }
    } catch (err) {
        console.error('Save error:', err);
        btnSave.disabled = false;
        btnSave.innerHTML = '<span class="btn-icon">✓</span> Guardar Solución';
    }
}

// ─── Output Display ──────────────────────────────────────────────
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

function showAlreadySolved() {
    const right = document.querySelector('.solve-right');
    if (right.querySelector('.solved-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'solved-overlay';
    overlay.innerHTML = `
        <div style="font-size:1.8rem;">✓</div>
        <div style="font-weight:700;font-size:0.95rem;">¡Ejercicio completado!</div>
        <div style="color:var(--text-muted);font-size:0.8rem;">Este ejercicio ya está guardado en tu perfil.</div>
        <button onclick="window.location.href='Exercises.html'"
            style="margin-top:8px;padding:8px 20px;background:transparent;border:1px solid var(--accent-green);
                   color:var(--accent-green);border-radius:6px;cursor:pointer;
                   font-family:var(--font-heading);font-size:0.8rem;">
            Volver a Ejercicios
        </button>`;
    right.insertBefore(overlay, right.querySelector('.editor-actions'));
}

function resetCheck(rerenderCases = true) {
    checkPassed = false;
    document.getElementById('btnSave').style.display = 'none';
    document.getElementById('editorOutput').style.display = 'none';
    document.getElementById('editorStatus').textContent = '';
    if (rerenderCases && exerciseData) {
        renderTestCases(exerciseData.test_cases, null);
    }
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
});
