const API_BASE = 'https://codexarapi.onrender.com/api';

const LANGUAGES_DB = [
    { id: 'C++',    label: 'C++',    icon: 'cplusplus' },
    { id: 'Python', label: 'Python', icon: 'python'    },
    { id: 'Java',   label: 'Java',   icon: 'java'      },
    { id: 'Go',     label: 'Go',     icon: 'go'        },
    { id: 'C#',     label: 'C#',     icon: 'csharp'    },
];

let userData       = {};
let selectedLangs  = [];
let bgFileChanged  = false;

// ── Helpers ───────────────────────────────────────────────────────────────

function setFeedback(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent  = msg;
    el.className    = 'cfg-feedback' + (type ? ' ' + type : '');
}

function setStatus(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className   = 'cfg-field-status' + (type ? ' ' + type : '');
}

function populateNavbar(user) {
    document.getElementById('navUsername').textContent = user.username;
    const navAvatar = document.getElementById('navAvatar');
    if (user.avatar) {
        navAvatar.style.cssText = `background-image:url(${user.avatar});background-size:cover;background-position:center;border:1px solid var(--accent-cyan);`;
        navAvatar.textContent = '';
    } else {
        navAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
    // Sidebar card
    const sideAvatar = document.getElementById('cfgSideAvatar');
    if (user.avatar) {
        sideAvatar.style.backgroundImage   = `url(${user.avatar})`;
        sideAvatar.style.backgroundSize    = 'cover';
        sideAvatar.style.backgroundPosition = 'center';
        sideAvatar.textContent = '';
    } else {
        sideAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
    document.getElementById('cfgSideName').textContent = user.username;
    document.getElementById('cfgSideRank').textContent = user.rank_name || '';
}

// ── Tab navigation ────────────────────────────────────────────────────────

function showSection(id) {
    document.querySelectorAll('.cfg-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.cfg-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('sec-' + id)?.classList.remove('hidden');
    document.querySelector(`.cfg-nav-btn[data-sec="${id}"]`)?.classList.add('active');
    location.hash = id;
}

// ── Perfil section ────────────────────────────────────────────────────────

function initPerfilSection(user) {
    // Avatar preview
    const img = document.getElementById('cfgAvatarImg');
    img.src = user.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

    // Banner preview
    if (user.profile_banner) {
        const bannerStrip = document.getElementById('cfgBannerStrip');
        bannerStrip.style.backgroundImage    = `url(${user.profile_banner})`;
        bannerStrip.style.backgroundSize     = 'cover';
        bannerStrip.style.backgroundPosition = 'center';
        document.getElementById('cfgBannerEmpty').style.display = 'none';
    }

    // Background preview
    if (user.profile_background) {
        const strip = document.getElementById('cfgBgStrip');
        strip.style.backgroundImage   = `url(${user.profile_background})`;
        strip.style.backgroundSize    = 'cover';
        strip.style.backgroundPosition = 'center';
        document.getElementById('cfgBgEmpty').style.display = 'none';
    }

    document.getElementById('cfgUsername').value = user.username || '';
    document.getElementById('cfgDesc').value     = user.description || '';

    // Avatar file picker
    document.getElementById('cfgAvatarInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => { document.getElementById('cfgAvatarImg').src = ev.target.result; };
        reader.readAsDataURL(file);
    });

    // Banner file picker (uploads to /upload-banner)
    document.getElementById('cfgBannerInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const bannerStrip = document.getElementById('cfgBannerStrip');
        const reader = new FileReader();
        reader.onload = ev => {
            bannerStrip.style.backgroundImage    = `url(${ev.target.result})`;
            bannerStrip.style.backgroundSize     = 'cover';
            bannerStrip.style.backgroundPosition = 'center';
            document.getElementById('cfgBannerEmpty').style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    // Background file picker (uploads to /upload-background)
    document.getElementById('cfgBgInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        bgFileChanged = true;
        const strip = document.getElementById('cfgBgStrip');
        const reader = new FileReader();
        reader.onload = ev => {
            strip.style.backgroundImage    = `url(${ev.target.result})`;
            strip.style.backgroundSize     = 'cover';
            strip.style.backgroundPosition = 'center';
            document.getElementById('cfgBgEmpty').style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    // Username availability check
    let debounce;
    document.getElementById('cfgUsername').addEventListener('input', () => {
        const val = document.getElementById('cfgUsername').value.trim();
        if (val === userData.username) { setStatus('cfgUsernameStatus', '', ''); return; }
        clearTimeout(debounce);
        debounce = setTimeout(async () => {
            if (val.length < 3) { setStatus('cfgUsernameStatus', 'Mínimo 3 caracteres', 'err'); return; }
            try {
                const res  = await fetch(`${API_BASE}/user/check-username/${encodeURIComponent(val)}`);
                const data = await res.json();
                if (data.available) setStatus('cfgUsernameStatus', '✓ Disponible', 'ok');
                else                setStatus('cfgUsernameStatus', '✗ Ya está en uso', 'err');
            } catch { setStatus('cfgUsernameStatus', '', ''); }
        }, 450);
    });

    // Save
    document.getElementById('cfgPerfilSaveBtn').addEventListener('click', savePerfilSection);
}

async function savePerfilSection() {
    const statusEl = document.getElementById('cfgUsernameStatus');
    if (statusEl.classList.contains('err')) return;

    const token = localStorage.getItem('access_token');
    const btn   = document.getElementById('cfgPerfilSaveBtn');
    btn.disabled    = true;
    btn.textContent = 'Guardando...';
    setFeedback('cfgPerfilFeedback', '', '');

    try {
        // Upload banner separately if changed
        const bannerFile = document.getElementById('cfgBannerInput').files[0];
        if (bannerFile) {
            const bannerForm = new FormData();
            bannerForm.append('banner', bannerFile);
            const bannerRes = await fetch(`${API_BASE}/user/upload-banner`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: bannerForm,
            });
            if (!bannerRes.ok) {
                const err = await bannerRes.json().catch(() => ({}));
                setFeedback('cfgPerfilFeedback', err.detail || 'Error subiendo el banner.', 'err');
                btn.disabled = false; btn.textContent = 'Guardar cambios'; return;
            }
        }

        // Upload background separately if changed
        const bgFile = document.getElementById('cfgBgInput').files[0];
        if (bgFile) {
            const bgForm = new FormData();
            bgForm.append('bg', bgFile);
            const bgRes = await fetch(`${API_BASE}/user/upload-background`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: bgForm,
            });
            if (!bgRes.ok) {
                const err = await bgRes.json().catch(() => ({}));
                setFeedback('cfgPerfilFeedback', err.detail || 'Error subiendo el fondo.', 'err');
                btn.disabled = false; btn.textContent = 'Guardar cambios'; return;
            }
        }

        // Profile update
        const form = new FormData();
        const username = document.getElementById('cfgUsername').value.trim();
        const desc     = document.getElementById('cfgDesc').value.trim();

        if (username !== userData.username) form.append('username', username);
        if (desc !== userData.description)  form.append('description', desc);

        const avatarFile = document.getElementById('cfgAvatarInput').files[0];
        if (avatarFile) form.append('pfp', avatarFile);

        // Always send languages so they're preserved
        selectedLangs.forEach(l => form.append('languages', l));

        const res  = await fetch(`${API_BASE}/user/profile/update`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        const data = await res.json();

        if (res.ok) {
            setFeedback('cfgPerfilFeedback', '¡Cambios guardados!', 'ok');
            userData.username    = username;
            userData.description = desc;
            document.getElementById('cfgSideName').textContent       = username;
            document.getElementById('navUsername').textContent        = username;
            setTimeout(() => setFeedback('cfgPerfilFeedback', '', ''), 3000);
        } else {
            setFeedback('cfgPerfilFeedback', data.detail || 'Error al guardar.', 'err');
        }
    } catch {
        setFeedback('cfgPerfilFeedback', 'Error de conexión.', 'err');
    }

    btn.disabled = false; btn.textContent = 'Guardar cambios';
}

// ── Socials section ───────────────────────────────────────────

function initSocialsSection(user) {
    const links = user.social_links || {};
    document.getElementById('cfgGithub').value     = links.github     || '';
    document.getElementById('cfgLinkedin').value   = links.linkedin   || '';
    document.getElementById('cfgCodeforces').value = links.codeforces || '';
    document.getElementById('cfgInstagram').value  = links.instagram  || '';
    document.getElementById('cfgTiktok').value     = links.tiktok     || '';

    document.getElementById('cfgSocialSaveBtn').addEventListener('click', async () => {
        const token = localStorage.getItem('access_token');
        const btn   = document.getElementById('cfgSocialSaveBtn');
        btn.disabled = true; btn.textContent = 'Guardando...';
        setFeedback('cfgSocialFeedback', '', '');

        const body = {
            github:     document.getElementById('cfgGithub').value.trim()     || null,
            linkedin:   document.getElementById('cfgLinkedin').value.trim()   || null,
            codeforces: document.getElementById('cfgCodeforces').value.trim() || null,
            instagram:  document.getElementById('cfgInstagram').value.trim()  || null,
            tiktok:     document.getElementById('cfgTiktok').value.trim()     || null,
        };

        try {
            const res  = await fetch(`${API_BASE}/user/update-socials`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                setFeedback('cfgSocialFeedback', '¡Redes guardadas!', 'ok');
                setTimeout(() => setFeedback('cfgSocialFeedback', '', ''), 3000);
            } else {
                setFeedback('cfgSocialFeedback', data.detail || 'Error al guardar.', 'err');
            }
        } catch {
            setFeedback('cfgSocialFeedback', 'Error de conexión.', 'err');
        }

        btn.disabled = false; btn.textContent = 'Guardar redes';
    });
}

// ── Apariencia section ────────────────────────────────────────────────────

function initAparienciaSection() {
    const currentTheme = getTheme?.() ?? (localStorage.getItem('codexar_theme') || 'dark');
    applyThemeActiveState(currentTheme);

    document.querySelectorAll('.tema-card').forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.theme;
            if (typeof setTheme === 'function') setTheme(theme);
            applyThemeActiveState(theme);
        });
    });
}

function applyThemeActiveState(theme) {
    if (theme === 'light') theme = 'zen';
    document.querySelectorAll('.tema-card').forEach(card => {
        const active = card.dataset.theme === theme;
        card.classList.toggle('active', active);
        const btn = card.querySelector('.tema-btn');
        if (btn) btn.textContent = active ? 'ACTIVO ✓' : 'SELECCIONAR';
    });
}

// ── Lenguajes section ─────────────────────────────────────────────────────

function initLenguajesSection() {
    const grid = document.getElementById('cfgLangGrid');
    grid.innerHTML = LANGUAGES_DB.map(lang => `
        <div class="cfg-lang-card ${selectedLangs.includes(lang.id) ? 'active' : ''}" data-lang="${lang.id}">
            <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${lang.icon}/${lang.icon}-original.svg" alt="${lang.label}">
            <span>${lang.label}</span>
        </div>
    `).join('');

    grid.querySelectorAll('.cfg-lang-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.lang;
            if (selectedLangs.includes(id)) {
                selectedLangs = selectedLangs.filter(l => l !== id);
                card.classList.remove('active');
            } else {
                selectedLangs.push(id);
                card.classList.add('active');
            }
        });
    });

    document.getElementById('cfgLangSaveBtn').addEventListener('click', saveLenguajesSection);
}

async function saveLenguajesSection() {
    const token = localStorage.getItem('access_token');
    const btn   = document.getElementById('cfgLangSaveBtn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    setFeedback('cfgLangFeedback', '', '');

    try {
        const form = new FormData();
        selectedLangs.forEach(l => form.append('languages', l));
        const res  = await fetch(`${API_BASE}/user/profile/update`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });
        const data = await res.json();
        if (res.ok) {
            userData.languages = [...selectedLangs];
            setFeedback('cfgLangFeedback', '¡Lenguajes actualizados!', 'ok');
            setTimeout(() => setFeedback('cfgLangFeedback', '', ''), 3000);
        } else {
            setFeedback('cfgLangFeedback', data.detail || 'Error al guardar.', 'err');
        }
    } catch {
        setFeedback('cfgLangFeedback', 'Error de conexión.', 'err');
    }

    btn.disabled = false; btn.textContent = 'Guardar selección';
}

// ── Seguridad section ─────────────────────────────────────────────────────

function initSeguridadSection(user) {
    document.getElementById('cfgEmail').value = user.email || '';

    const oldPwdInput = document.getElementById('cfgOldPwd');
    const newPwdInput = document.getElementById('cfgNewPwd');
    const verifyBtn   = document.getElementById('cfgVerifyBtn');
    const saveBtn     = document.getElementById('cfgSecSaveBtn');

    verifyBtn.addEventListener('click', async () => {
        const val = oldPwdInput.value;
        if (!val) { setStatus('cfgPwdStatus', 'Escribe tu contraseña primero.', 'err'); return; }

        verifyBtn.disabled    = true;
        verifyBtn.textContent = '⏳';
        setStatus('cfgPwdStatus', '', '');

        const token = localStorage.getItem('access_token');
        try {
            const fd  = new FormData();
            fd.append('password', val);
            const res  = await fetch(`${API_BASE}/user/verify-password`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            const data = await res.json();
            if (data.valid) {
                setStatus('cfgPwdStatus', '✓ Contraseña verificada — escribe la nueva clave.', 'ok');
                newPwdInput.disabled    = false;
                newPwdInput.placeholder = 'Escribe tu nueva contraseña...';
                saveBtn.disabled        = false;
                verifyBtn.textContent   = '✅';
            } else {
                setStatus('cfgPwdStatus', '✗ Contraseña incorrecta.', 'err');
                verifyBtn.disabled    = false;
                verifyBtn.textContent = 'Verificar';
            }
        } catch {
            setStatus('cfgPwdStatus', 'Error de conexión.', 'err');
            verifyBtn.disabled    = false;
            verifyBtn.textContent = 'Verificar';
        }
    });

    // Reset if user types again after verifying
    oldPwdInput.addEventListener('input', () => {
        if (verifyBtn.textContent === '✅') {
            verifyBtn.disabled    = false;
            verifyBtn.textContent = 'Verificar';
            newPwdInput.disabled  = true;
            newPwdInput.placeholder = 'Bloqueado — verifica tu contraseña primero';
            newPwdInput.value     = '';
            saveBtn.disabled      = true;
            setStatus('cfgPwdStatus', '', '');
        }
    });

    saveBtn.addEventListener('click', async () => {
        const oldp = oldPwdInput.value;
        const newp = newPwdInput.value;
        if (!newp) { setFeedback('cfgSecFeedback', 'Escribe la nueva contraseña.', 'err'); return; }
        if (newp.length < 6) { setFeedback('cfgSecFeedback', 'La contraseña debe tener al menos 6 caracteres.', 'err'); return; }

        const token = localStorage.getItem('access_token');
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Guardando...';
        setFeedback('cfgSecFeedback', '', '');

        try {
            const form = new FormData();
            form.append('old_password', oldp);
            form.append('new_password', newp);
            const res  = await fetch(`${API_BASE}/user/profile/update`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            const data = await res.json();
            if (res.ok) {
                setFeedback('cfgSecFeedback', '¡Contraseña actualizada!', 'ok');
                oldPwdInput.value       = '';
                newPwdInput.value       = '';
                newPwdInput.disabled    = true;
                newPwdInput.placeholder = 'Bloqueado — verifica tu contraseña primero';
                verifyBtn.textContent   = 'Verificar';
                saveBtn.disabled        = true;
                setStatus('cfgPwdStatus', '', '');
                setTimeout(() => setFeedback('cfgSecFeedback', '', ''), 4000);
            } else {
                setFeedback('cfgSecFeedback', data.detail || 'Error al cambiar contraseña.', 'err');
                saveBtn.disabled    = false;
                saveBtn.textContent = 'Cambiar contraseña';
            }
        } catch {
            setFeedback('cfgSecFeedback', 'Error de conexión.', 'err');
            saveBtn.disabled    = false;
            saveBtn.textContent = 'Cambiar contraseña';
        }
    });
}

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = 'Login.html';
    });

    // Nav buttons
    document.querySelectorAll('.cfg-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => showSection(btn.dataset.sec));
    });

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { window.location.href = 'Login.html'; return; }
        userData      = await res.json();
        selectedLangs = [...(userData.languages || [])];
    } catch {
        window.location.href = 'Login.html';
        return;
    }

    populateNavbar(userData);
    initPerfilSection(userData);
    initSocialsSection(userData);
    initAparienciaSection();
    initLenguajesSection();
    initSeguridadSection(userData);

    // Open section from URL hash or default to perfil
    const hash = location.hash.replace('#', '');
    const validSections = ['perfil', 'apariencia', 'lenguajes', 'seguridad'];
    showSection(validSections.includes(hash) ? hash : 'perfil');
});
