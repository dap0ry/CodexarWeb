const API_BASE = 'https://api.codexar.es/api';

function token() { return localStorage.getItem('access_token'); }

// ── Auth + role guard ────────────────────────────────────────────────────────
async function initPage() {
    const t = token();
    if (!t) { window.location.href = '/login'; return; }

    const res = await fetch(`${API_BASE}/user/me`, { headers: { 'Authorization': `Bearer ${t}` } });
    if (!res.ok) { window.location.href = '/login'; return; }
    const user = await res.json();

    if (!['moderator', 'admin'].includes(user.role)) {
        window.location.href = '/home';
        return;
    }

    document.getElementById('navUsername').textContent = user.username;
    const nav = document.getElementById('navAvatar');
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

    buildTestCases();
    bindTabs();
    document.getElementById('ceForm').addEventListener('submit', handleSubmit);
}

// ── Build 3 test case cards ──────────────────────────────────────────────────
function buildTestCases() {
    const list = document.getElementById('tcList');
    list.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        list.insertAdjacentHTML('beforeend', `
            <div class="ce-tc-card">
                <div class="ce-tc-header">Caso de prueba ${i}</div>
                <div class="ce-tc-fields">
                    <div class="ce-field">
                        <label class="ce-label">Entrada (input)</label>
                        <input type="text" class="ce-input tc-input" id="tcIn${i}"
                            placeholder='Ej: 3, [1,2,3] o "hola"' ${i <= 3 ? 'required' : ''}>
                    </div>
                    <div class="ce-field">
                        <label class="ce-label">Salida esperada</label>
                        <input type="text" class="ce-input tc-output" id="tcOut${i}"
                            placeholder='Ej: 6 o "HOLA"' ${i <= 3 ? 'required' : ''}>
                    </div>
                </div>
            </div>
        `);
    }
}

// ── Stub language tabs ───────────────────────────────────────────────────────
function bindTabs() {
    document.querySelectorAll('.ce-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ce-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.ce-code').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`stub-${tab.dataset.lang}`)?.classList.add('active');
        });
    });
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit(e) {
    e.preventDefault();
    const errEl  = document.getElementById('ceError');
    const okEl   = document.getElementById('ceSuccess');
    const btn    = document.getElementById('ceSubmitBtn');
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');

    const test_cases = [];
    for (let i = 1; i <= 3; i++) {
        const inp = document.getElementById(`tcIn${i}`)?.value.trim();
        const out = document.getElementById(`tcOut${i}`)?.value.trim();
        if (inp && out) test_cases.push({ input: inp, expected_output: out });
    }
    if (test_cases.length < 1) {
        showError(errEl, 'Debes rellenar al menos un caso de prueba completo.');
        return;
    }

    const body = {
        title:       document.getElementById('ceTitle').value.trim(),
        description: document.getElementById('ceDesc').value.trim(),
        difficulty:  parseInt(document.getElementById('ceDiff').value, 10),
        category:    document.getElementById('ceCat').value,
        test_cases,
        stub_python: document.getElementById('stub-python').value,
        stub_cpp:    document.getElementById('stub-cpp').value,
        stub_java:   document.getElementById('stub-java').value,
        stub_go:     document.getElementById('stub-go').value,
        stub_csharp: document.getElementById('stub-csharp').value,
    };

    btn.disabled = true;
    btn.textContent = 'Publicando...';

    try {
        const res = await fetch(`${API_BASE}/exercises/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            showError(errEl, data.detail || 'Error al crear el ejercicio.');
        } else {
            okEl.textContent = `Ejercicio "${body.title}" publicado correctamente.`;
            okEl.classList.remove('hidden');
            document.getElementById('ceForm').reset();
            buildTestCases();
            document.querySelectorAll('.ce-code').forEach(c => c.value = '');
        }
    } catch (err) {
        showError(errEl, 'Error de conexión. Inténtalo de nuevo.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Publicar Ejercicio';
    }
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', initPage);
