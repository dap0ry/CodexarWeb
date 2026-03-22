const API_BASE = 'https://codexarapi.onrender.com/api';
let exerciseData = null;
let checkPassed = false;

// --- Init ---
async function initSolvePage() {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    // Get exercise ID from URL
    const params = new URLSearchParams(window.location.search);
    const exerciseId = params.get('id');
    if (!exerciseId) { window.location.href = 'Exercises.html'; return; }

    try {
        // Load user for navbar
        const userRes = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userRes.ok) throw new Error('Auth Fault');
        const user = await userRes.json();
        populateNavbar(user);

        // Load exercise
        const exRes = await fetch(`${API_BASE}/exercises/${exerciseId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!exRes.ok) throw new Error('Exercise Fault');
        exerciseData = await exRes.json();

        renderExercise(exerciseData, user);
    } catch (err) {
        console.error('Init error:', err);
        if (err.message === 'Auth Fault') window.location.href = 'Login.html';
    }
}

// --- Navbar ---
function populateNavbar(user) {
    document.getElementById('navUsername').textContent = user.username;
    const navAvatar = document.getElementById('navAvatar');
    if (user.avatar) {
        navAvatar.style.backgroundImage = `url(${user.avatar})`;
        navAvatar.style.backgroundSize = 'cover';
        navAvatar.style.backgroundPosition = 'center';
        navAvatar.style.border = '1px solid var(--accent-cyan)';
        navAvatar.textContent = '';
    } else {
        navAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
}

// --- Render Exercise ---
function renderExercise(ex, user) {
    // Breadcrumb
    document.getElementById('breadcrumbTitle').textContent = ex.title;
    document.title = `Codexar - ${ex.title}`;

    // Title & badges
    document.getElementById('exTitle').textContent = ex.title;

    let diffClass = 'badge-normal';
    if (ex.difficulty === 'Fácil') diffClass = 'badge-facil';
    if (ex.difficulty === 'Difícil') diffClass = 'badge-dificil';

    const badgesEl = document.getElementById('exBadges');
    badgesEl.innerHTML = `
        <span class="ex-badge ${diffClass}">${ex.difficulty}</span>
        <span class="ex-badge badge-category">${ex.category}</span>
        ${ex.solved ? '<span class="ex-badge badge-solved-ex">✓ Resuelto</span>' : ''}
    `;

    // Description
    document.getElementById('exDescription').textContent = ex.description;

    // Test cases
    renderTestCases(ex.test_cases, null);

    // Load stub based on selected language
    const langSelect = document.getElementById('langSelect');

    // Pre-select user's first language if available
    if (user && user.languages && user.languages.length > 0) {
        const preferred = user.languages[0];
        const options = langSelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === preferred) {
                langSelect.selectedIndex = i;
                break;
            }
        }
    }

    loadStub(langSelect.value);

    langSelect.addEventListener('change', () => {
        loadStub(langSelect.value);
        resetCheck();
    });

    // If already solved, show info
    if (ex.solved) {
        showAlreadySolved();
    }

    // Buttons
    document.getElementById('btnCheck').addEventListener('click', handleCheck);
    document.getElementById('btnSave').addEventListener('click', handleSave);
}

function loadStub(lang) {
    if (!exerciseData || !exerciseData.stub) return;
    const stub = exerciseData.stub[lang];
    if (stub) {
        document.getElementById('codeEditor').value = stub;
    }
}

function renderTestCases(testCases, result) {
    const list = document.getElementById('testCasesList');
    if (!testCases || testCases.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted); font-size:0.82rem;">No hay casos de prueba disponibles.</div>';
        return;
    }

    list.innerHTML = '';
    testCases.forEach((tc, i) => {
        const card = document.createElement('div');
        card.className = 'testcase-card';
        card.id = `tc-${i}`;

        // Determine pass/fail state
        if (result) {
            if (result.correct) {
                card.classList.add('passing');
            } else if (result.failed_case === i + 1) {
                card.classList.add('failing');
            } else if (result.failed_case > i + 1 || (result.failed_case === undefined && !result.correct)) {
                // cases before the failed one passed
            }
        }

        const gotHtml = (result && result.failed_case === i + 1 && result.got !== undefined)
            ? `<div class="tc-row"><span class="tc-label">Obtenido</span><span class="tc-value got-wrong">${escHtml(result.got)}</span></div>`
            : '';

        card.innerHTML = `
            <div class="tc-row">
                <span class="tc-label">Caso ${i + 1}</span>
                <span class="tc-value" style="color:var(--text-muted); font-size:0.72rem; padding-top:2px;">
                    ${result && result.correct ? '✓ Superado' : result && result.failed_case === i + 1 ? '✗ Fallido' : ''}
                </span>
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

// --- Check Handler ---
async function handleCheck() {
    const token = localStorage.getItem('access_token');
    const code = document.getElementById('codeEditor').value.trim();
    const lang = document.getElementById('langSelect').value;
    const btnCheck = document.getElementById('btnCheck');
    const output = document.getElementById('editorOutput');
    const statusEl = document.getElementById('editorStatus');

    if (!code) {
        showOutput('error', { message: 'Escribe tu solución antes de comprobar.' });
        return;
    }

    // Loading state
    btnCheck.disabled = true;
    btnCheck.classList.add('loading');
    btnCheck.innerHTML = '<span class="btn-icon">⏳</span> Comprobando...';
    statusEl.textContent = 'Ejecutando casos de prueba...';
    statusEl.style.color = 'var(--text-muted)';
    output.style.display = 'none';
    resetCheck();

    try {
        const res = await fetch(`${API_BASE}/exercises/${exerciseData.id}/solve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, language: lang, save: false })
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
    } catch (err) {
        statusEl.textContent = 'Error de conexión con la API';
        statusEl.style.color = 'var(--accent-red)';
        showOutput('error', { message: 'No se pudo conectar con el servidor.' });
    } finally {
        btnCheck.disabled = false;
        btnCheck.classList.remove('loading');
        btnCheck.innerHTML = '<span class="btn-icon">▶</span> Comprobar Código';
    }
}

// --- Save Handler ---
async function handleSave() {
    if (!checkPassed) return;
    const token = localStorage.getItem('access_token');
    const code = document.getElementById('codeEditor').value.trim();
    const lang = document.getElementById('langSelect').value;
    const btnSave = document.getElementById('btnSave');

    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="btn-icon">⏳</span> Guardando...';

    try {
        const res = await fetch(`${API_BASE}/exercises/${exerciseData.id}/solve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, language: lang, save: true })
        });
        const data = await res.json();

        if (data.correct) {
            showAlreadySolved();
            btnSave.style.display = 'none';
            document.getElementById('editorStatus').textContent = '✓ Ejercicio guardado';
            document.getElementById('editorStatus').style.color = 'var(--accent-green)';
            // Update badge
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

// --- Output Display ---
function showOutput(type, data) {
    const output = document.getElementById('editorOutput');
    const content = document.getElementById('outputContent');
    output.style.display = 'block';

    if (type === 'success') {
        content.innerHTML = `
            <div class="output-success">
                <span style="font-size:1.3rem;">✓</span>
                <span>${escHtml(data.message)}</span>
            </div>
        `;
    } else {
        let detailHtml = '';
        if (data.input !== undefined) {
            detailHtml = `
                <div class="output-error-detail">
                    <span><span class="val-label">Entrada:</span> <span>${escHtml(data.input)}</span></span>
                    <span><span class="val-label">Esperado:</span> <span class="val-expected">${escHtml(data.expected)}</span></span>
                    ${data.got !== undefined ? `<span><span class="val-label">Obtenido:</span> <span class="val-got">${escHtml(data.got)}</span></span>` : ''}
                </div>
            `;
        }
        content.innerHTML = `
            <div class="output-error">
                <div class="output-error-title">✗ ${escHtml(data.message)}</div>
                ${detailHtml}
            </div>
        `;
    }
}

function showAlreadySolved() {
    const right = document.querySelector('.solve-right');
    const existing = right.querySelector('.solved-overlay');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.className = 'solved-overlay';
    overlay.innerHTML = `
        <div style="font-size:1.8rem;">✓</div>
        <div style="font-weight:700; font-size:0.95rem;">¡Ejercicio completado!</div>
        <div style="color:var(--text-muted); font-size:0.8rem;">Este ejercicio ya está guardado en tu perfil.</div>
        <button onclick="window.location.href='Exercises.html'" style="margin-top:8px; padding:8px 20px; background:transparent; border:1px solid var(--accent-green); color:var(--accent-green); border-radius:6px; cursor:pointer; font-family:var(--font-heading); font-size:0.8rem;">Volver a Ejercicios</button>
    `;
    // Insert before editor-actions
    const actions = right.querySelector('.editor-actions');
    right.insertBefore(overlay, actions);
}

function resetCheck() {
    checkPassed = false;
    document.getElementById('btnSave').style.display = 'none';
    document.getElementById('editorOutput').style.display = 'none';
    document.getElementById('editorStatus').textContent = '';
    renderTestCases(exerciseData ? exerciseData.test_cases : [], null);
}

function escHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Tab key support in editor
document.getElementById('codeEditor').addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
});

document.addEventListener('DOMContentLoaded', initSolvePage);
