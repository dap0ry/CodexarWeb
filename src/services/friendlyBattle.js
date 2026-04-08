const API_BASE = 'https://codexarapi.onrender.com/api';
let matchData = null;
let matchActive = true;
let matchClockSeconds = 0;
let clockInterval = null;
let codeIsCorrect = false;

// --- Init ---
async function initFriendlyBattle() {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('match');
    if (!matchId) { window.location.href = 'Friends.html'; return; }

    try {
        const res = await fetch(`${API_BASE}/matchmaking/match/${matchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { window.location.href = 'Friends.html'; return; }

        matchData = await res.json();
        setupPlayers(matchData);
        renderExercise(matchData.exercise);

        clockInterval = setInterval(() => {
            matchClockSeconds++;
            const m = Math.floor(matchClockSeconds / 60);
            const s = matchClockSeconds % 60;
            document.getElementById('matchClock').textContent = `${m}:${s.toString().padStart(2, '0')}`;
        }, 1000);

        pollMatchState(matchId, token);

    } catch (err) {
        console.error(err);
        window.location.href = 'Friends.html';
    }

    document.getElementById('btnCheck').addEventListener('click', handleCheck);
    document.getElementById('btnSave').addEventListener('click', handleSave);

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = 'index.html';
    });
}

function setAvatar(el, avatarUrl, username) {
    if (avatarUrl) {
        el.style.backgroundImage = `url('${avatarUrl}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
    } else {
        el.textContent = username ? username.charAt(0).toUpperCase() : '?';
    }
}

function setupPlayers(data) {
    document.getElementById('myName').textContent = data.me.username;
    document.getElementById('navUsername').textContent = data.me.username;

    setAvatar(document.getElementById('myAvatar'), data.me.avatar, data.me.username);
    setAvatar(document.getElementById('navAvatar'), data.me.avatar, data.me.username);
    if (data.me.avatar) {
        document.getElementById('navAvatar').style.border = '1px solid var(--accent-cyan)';
    }

    document.getElementById('opName').textContent = data.opponent.username;
    setAvatar(document.getElementById('opAvatar'), data.opponent.avatar, data.opponent.username);

    document.getElementById('opProgressBar').style.width = `${data.op_progress || 0}%`;
}

function renderExercise(ex) {
    document.getElementById('exTitle').textContent = ex.title;

    let diffClass = 'badge-normal';
    if (ex.difficulty === 'Fácil') diffClass = 'badge-facil';
    if (ex.difficulty === 'Difícil') diffClass = 'badge-dificil';

    document.getElementById('exBadges').innerHTML = `
        <span class="ex-badge ${diffClass}">${ex.difficulty}</span>
        <span class="ex-badge badge-category">${ex.category}</span>
    `;
    document.getElementById('exDescription').textContent = ex.description;
    renderTestCases(ex.test_cases, null);

    const langSelect = document.getElementById('langSelect');
    loadStub(langSelect.value);
    langSelect.addEventListener('change', () => {
        loadStub(langSelect.value);
        codeIsCorrect = false;
        document.getElementById('btnSave').style.display = 'none';
    });
}

function loadStub(lang) {
    if (!matchData?.exercise?.stub) return;
    const stub = matchData.exercise.stub[lang];
    if (stub) document.getElementById('codeEditor').value = stub;
}

function renderTestCases(testCases, result) {
    const list = document.getElementById('testCasesList');
    if (!testCases || testCases.length === 0) return;
    list.innerHTML = '';
    testCases.forEach((tc, i) => {
        const card = document.createElement('div');
        card.className = 'testcase-card';
        if (result) {
            if (result.correct) card.classList.add('passing');
            else if (result.failed_case === i + 1) card.classList.add('failing');
            else if (result.failed_case > i + 1 || !result.failed_case) card.classList.add('passing');
        }
        const gotHtml = (result && result.failed_case === i + 1 && result.got !== undefined)
            ? `<div class="tc-row"><span class="tc-label">Obtenido</span><span class="tc-value got-wrong">${escHtml(result.got)}</span></div>` : '';
        card.innerHTML = `
            <div class="tc-row"><span class="tc-label">Caso ${i + 1}</span></div>
            <div class="tc-row"><span class="tc-label">Entrada</span><span class="tc-value">${escHtml(tc.input)}</span></div>
            <div class="tc-row"><span class="tc-label">Esperado</span><span class="tc-value expected">${escHtml(tc.expected_output)}</span></div>
            ${gotHtml}`;
        list.appendChild(card);
    });
}

async function handleCheck() {
    if (!matchActive) return;
    const token = localStorage.getItem('access_token');
    const code = document.getElementById('codeEditor').value.trim();
    const lang = document.getElementById('langSelect').value;
    const btnCheck = document.getElementById('btnCheck');
    const btnSave = document.getElementById('btnSave');
    const status = document.getElementById('editorStatus');

    if (!code) return;

    codeIsCorrect = false;
    btnSave.style.display = 'none';
    btnCheck.disabled = true;
    btnCheck.classList.add('loading');
    btnCheck.innerHTML = '<span class="btn-icon">⏳</span> Comprobando...';
    status.textContent = '';
    document.getElementById('editorOutput').style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/exercises/${matchData.exercise.id}/solve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, language: lang, save: false })
        });
        const evalData = await res.json();

        renderTestCases(matchData.exercise.test_cases, evalData);
        showOutput(evalData.correct ? 'success' : 'error', evalData);

        if (evalData.correct) {
            codeIsCorrect = true;
            status.textContent = '✓ Correcto — ya puedes guardar';
            status.style.color = 'var(--accent-green)';
            btnSave.style.display = 'flex';
            btnSave.disabled = false;
        } else {
            status.textContent = '✗ Fallaron algunos casos';
            status.style.color = '#ef4444';
        }

    } catch (err) {
        console.error(err);
        status.textContent = 'Error de conexión';
        status.style.color = '#ef4444';
    } finally {
        btnCheck.disabled = false;
        btnCheck.classList.remove('loading');
        btnCheck.innerHTML = '<span class="btn-icon">▶</span> Comprobar Código';
    }
}

async function handleSave() {
    if (!matchActive || !codeIsCorrect) return;
    const token = localStorage.getItem('access_token');
    const btnSave = document.getElementById('btnSave');

    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="btn-icon">⏳</span> Guardando...';

    try {
        const totalCases = matchData.exercise.test_cases.length;
        const mockResults = Array(totalCases).fill({ passed: true });

        const matchId = new URLSearchParams(window.location.search).get('match');
        const submitRes = await fetch(`${API_BASE}/matchmaking/match/${matchId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ results: mockResults })
        });
        const matchUpdate = await submitRes.json();

        if (matchUpdate.status === 'finished') {
            endMatch(matchUpdate.is_winner);
        }

    } catch (err) {
        console.error(err);
        btnSave.disabled = false;
        btnSave.innerHTML = '<span class="btn-icon">✓</span> Guardar Solución';
    }
}

async function pollMatchState(matchId, token) {
    while (matchActive) {
        try {
            const res = await fetch(`${API_BASE}/matchmaking/match/${matchId}/poll`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Poll error");
            const data = await res.json();

            if (data.status === 'updated' || data.status === 'finished') {
                if (data.op_progress !== undefined) {
                    document.getElementById('opProgressBar').style.width = `${data.op_progress}%`;
                }
                if (data.match_status === 'finished' || data.status === 'finished') {
                    const isMeWinner = data.winner === matchData.me.email;
                    endMatch(isMeWinner);
                    break;
                }
            }
        } catch (err) {
            console.error("Polling error:", err);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

function endMatch(isWinner) {
    matchActive = false;
    clearInterval(clockInterval);
    document.getElementById('btnCheck').disabled = true;
    document.getElementById('btnSave').disabled = true;

    const overlay = document.getElementById('resultOverlay');
    const title = document.getElementById('resultTitle');
    const desc = document.getElementById('resultDesc');
    overlay.classList.remove('hidden');

    if (isWinner) {
        title.textContent = "VICTORIA";
        title.className = "win";
        desc.textContent = "¡Ganaste la batalla amistosa! +10 monedas";
    } else {
        title.textContent = "DERROTA";
        title.className = "lose";
        document.getElementById('opProgressBar').style.width = '100%';
        desc.textContent = "Tu rival llegó primero. ¡Buen intento!";
    }
}

function showOutput(type, data) {
    const output = document.getElementById('editorOutput');
    const content = document.getElementById('outputContent');
    output.style.display = 'block';
    if (type === 'success') {
        content.innerHTML = `<div class="output-success"><span style="font-size:1.3rem;">✓</span><span>${escHtml(data.message)}</span></div>`;
    } else {
        let detailHtml = '';
        if (data.input !== undefined) {
            detailHtml = `<div class="output-error-detail">
                <span><span class="val-label">Entrada:</span> <span>${escHtml(data.input)}</span></span>
                <span><span class="val-label">Esperado:</span> <span class="val-expected">${escHtml(data.expected)}</span></span>
                ${data.got !== undefined ? `<span><span class="val-label">Obtenido:</span> <span class="val-got">${escHtml(data.got)}</span></span>` : ''}
            </div>`;
        }
        content.innerHTML = `<div class="output-error"><div class="output-error-title">✗ ${escHtml(data.message)}</div>${detailHtml}</div>`;
    }
}

function escHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', initFriendlyBattle);
