const API_BASE = 'https://api.codexar.es/api';

const LANGUAGES_DB = [
    { id: 'C++',    label: 'C++',    icon: 'cplusplus' },
    { id: 'Python', label: 'Python', icon: 'python'    },
    { id: 'Java',   label: 'Java',   icon: 'java'      },
    { id: 'Go',     label: 'Go',     icon: 'go'        },
    { id: 'C#',     label: 'C#',     icon: 'csharp'    },
];

let userData      = {};
let selectedLangs = [];

// ── Helpers ───────────────────────────────────────────────────────────────

function setFeedback(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className   = 'cfg-feedback' + (type ? ' ' + type : '');
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
}

// ── Perfil section ────────────────────────────────────────────────────────

function initPerfilSection(user) {
    const img = document.getElementById('cfgAvatarImg');
    img.src = user.avatar || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

    if (user.profile_banner) {
        const bannerStrip = document.getElementById('cfgBannerStrip');
        bannerStrip.style.backgroundImage    = `url(${user.profile_banner})`;
        bannerStrip.style.backgroundSize     = 'cover';
        bannerStrip.style.backgroundPosition = 'center';
        document.getElementById('cfgBannerEmpty').style.display = 'none';
    }

    if (user.profile_background) {
        const strip = document.getElementById('cfgBgStrip');
        document.getElementById('cfgBgEmpty').style.display = 'none';
        if (user.profile_background.includes('.mp4') || user.profile_background.includes('video')) {
            strip.style.position = 'relative';
            const vid = document.createElement('video');
            vid.className = 'cfg-bg-preview-video';
            vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
            vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;';
            vid.src = user.profile_background;
            strip.appendChild(vid);
        } else {
            strip.style.backgroundImage    = `url(${user.profile_background})`;
            strip.style.backgroundSize     = 'cover';
            strip.style.backgroundPosition = 'center';
        }
    }

    document.getElementById('cfgUsername').value = user.username || '';
    document.getElementById('cfgDesc').value     = user.description || '';

    // Avatar preview
    document.getElementById('cfgAvatarInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => { document.getElementById('cfgAvatarImg').src = ev.target.result; };
        reader.readAsDataURL(file);
    });

    // Banner preview
    document.getElementById('cfgBannerInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const strip  = document.getElementById('cfgBannerStrip');
        const reader = new FileReader();
        reader.onload = ev => {
            strip.style.backgroundImage    = `url(${ev.target.result})`;
            strip.style.backgroundSize     = 'cover';
            strip.style.backgroundPosition = 'center';
            document.getElementById('cfgBannerEmpty').style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    // Background preview
    document.getElementById('cfgBgInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const strip = document.getElementById('cfgBgStrip');
        document.getElementById('cfgBgEmpty').style.display = 'none';

        if (file.type === 'video/mp4') {
            const url = URL.createObjectURL(file);
            strip.style.backgroundImage = 'none';
            let vid = strip.querySelector('video.cfg-bg-preview-video');
            if (!vid) {
                vid = document.createElement('video');
                vid.className = 'cfg-bg-preview-video';
                vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
                vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;';
                strip.style.position = 'relative';
                strip.appendChild(vid);
            }
            vid.src = url;
        } else {
            const vid = strip.querySelector('video.cfg-bg-preview-video');
            if (vid) vid.remove();
            const reader = new FileReader();
            reader.onload = ev => {
                strip.style.backgroundImage    = `url(${ev.target.result})`;
                strip.style.backgroundSize     = 'cover';
                strip.style.backgroundPosition = 'center';
            };
            reader.readAsDataURL(file);
        }
    });

    // Delete banner
    document.getElementById('cfgBannerDeleteBtn')?.addEventListener('click', async () => {
        if (!confirm('¿Eliminar el banner?')) return;
        const tk = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_BASE}/user/delete-banner`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${tk}` }
            });
            if (res.ok) {
                const strip = document.getElementById('cfgBannerStrip');
                strip.style.backgroundImage = 'none';
                strip.style.backgroundSize = '';
                strip.style.backgroundPosition = '';
                document.getElementById('cfgBannerEmpty').style.display = '';
                document.getElementById('cfgBannerInput').value = '';
            }
        } catch {}
    });

    // Delete background
    document.getElementById('cfgBgDeleteBtn')?.addEventListener('click', async () => {
        if (!confirm('¿Eliminar el fondo de perfil?')) return;
        const tk = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_BASE}/user/delete-background`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${tk}` }
            });
            if (res.ok) {
                const strip = document.getElementById('cfgBgStrip');
                strip.style.backgroundImage = 'none';
                strip.style.backgroundSize = '';
                strip.style.backgroundPosition = '';
                const vid = strip.querySelector('video.cfg-bg-preview-video');
                if (vid) vid.remove();
                document.getElementById('cfgBgEmpty').style.display = '';
                document.getElementById('cfgBgInput').value = '';
            }
        } catch {}
    });

    // Style groups (localStorage, instant)
    function initStyleGroup(groupId, lsKey, dataAttr, defaultVal) {
        const group = document.getElementById(groupId);
        if (!group) return;
        const saved = localStorage.getItem(lsKey) || defaultVal;
        group.querySelectorAll(`[data-${dataAttr}]`).forEach(btn => {
            btn.classList.toggle('active', btn.dataset[dataAttr] === saved);
            btn.addEventListener('click', () => {
                group.querySelectorAll(`[data-${dataAttr}]`).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                localStorage.setItem(lsKey, btn.dataset[dataAttr]);
            });
        });
    }
    initStyleGroup('cfgBoxStyleGroup',  'codexar_box_style',  'style',  'solid');
    initStyleGroup('cfgBgVisGroup',     'codexar_bg_vis',     'vis',    'dim');
    initStyleGroup('cfgBannerVisGroup', 'codexar_banner_vis', 'banvis', 'dim');

    // Username availability check (debounce for live feedback while typing)
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
}

// ── Socials section ───────────────────────────────────────────────────────

function initSocialsSection(user) {
    const links = user.social_links || {};
    document.getElementById('cfgGithub').value     = links.github     || '';
    document.getElementById('cfgLinkedin').value   = links.linkedin   || '';
    document.getElementById('cfgCodeforces').value = links.codeforces || '';
    document.getElementById('cfgInstagram').value  = links.instagram  || '';
    document.getElementById('cfgTiktok').value     = links.tiktok     || '';
}

// ── Seguridad section (verify only — save is part of saveAll) ─────────────

function initSeguridadSection(user) {
    document.getElementById('cfgEmail').value = user.email || '';

    const oldPwdInput = document.getElementById('cfgOldPwd');
    const newPwdInput = document.getElementById('cfgNewPwd');
    const verifyBtn   = document.getElementById('cfgVerifyBtn');

    verifyBtn.addEventListener('click', async () => {
        const val = oldPwdInput.value;
        if (!val) { setStatus('cfgPwdStatus', 'Escribe tu contraseña primero.', 'err'); return; }

        verifyBtn.disabled    = true;
        verifyBtn.textContent = '⏳';
        setStatus('cfgPwdStatus', '', '');

        const token = localStorage.getItem('access_token');
        try {
            const fd = new FormData();
            fd.append('password', val);
            const res  = await fetch(`${API_BASE}/user/verify-password`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
            });
            const data = await res.json();
            if (data.valid) {
                setStatus('cfgPwdStatus', '✓ Verificada — escribe la nueva contraseña.', 'ok');
                newPwdInput.disabled    = false;
                newPwdInput.placeholder = 'Escribe tu nueva contraseña...';
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

    // Reset if user edits old password after verifying
    oldPwdInput.addEventListener('input', () => {
        if (verifyBtn.textContent === '✅') {
            verifyBtn.disabled      = false;
            verifyBtn.textContent   = 'Verificar';
            newPwdInput.disabled    = true;
            newPwdInput.placeholder = 'Verifica primero tu contraseña actual';
            newPwdInput.value       = '';
            setStatus('cfgPwdStatus', '', '');
        }
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

// ── Save all ──────────────────────────────────────────────────────────────

async function saveAll(btn, feedbackId) {
    const token    = localStorage.getItem('access_token');
    const username = document.getElementById('cfgUsername').value.trim();
    const desc     = document.getElementById('cfgDesc').value.trim();
    const newp     = document.getElementById('cfgNewPwd').value;
    const oldp     = document.getElementById('cfgOldPwd').value;

    setFeedback(feedbackId, '', '');

    // ── 1. Validate username ──────────────────────────────────────────────
    if (username.length < 3) {
        setStatus('cfgUsernameStatus', 'Mínimo 3 caracteres', 'err');
        setFeedback(feedbackId, 'El nombre de usuario es demasiado corto.', 'err');
        return;
    }

    // ── 2. Check username availability (live, authoritative) ─────────────
    if (username !== userData.username) {
        btn.disabled    = true;
        btn.textContent = 'Verificando nombre...';
        try {
            const chk  = await fetch(`${API_BASE}/user/check-username/${encodeURIComponent(username)}`);
            const data = await chk.json();
            if (!data.available) {
                setStatus('cfgUsernameStatus', '✗ Ya está en uso', 'err');
                setFeedback(feedbackId, 'Ese nombre de usuario ya está en uso.', 'err');
                btn.disabled = false; btn.textContent = '▸ Guardar cambios'; return;
            }
            setStatus('cfgUsernameStatus', '✓ Disponible', 'ok');
        } catch {
            setFeedback(feedbackId, 'No se pudo verificar el nombre de usuario.', 'err');
            btn.disabled = false; btn.textContent = '▸ Guardar cambios'; return;
        }
    }

    // ── 3. Validate password change (if requested) ────────────────────────
    if (newp) {
        if (newp.length < 6) {
            setFeedback(feedbackId, 'La nueva contraseña debe tener al menos 6 caracteres.', 'err');
            return;
        }
        const pwdStatus = document.getElementById('cfgPwdStatus');
        if (!pwdStatus.classList.contains('ok')) {
            setFeedback(feedbackId, 'Debes verificar tu contraseña actual antes de cambiarla.', 'err');
            return;
        }
    }

    btn.disabled    = true;
    btn.textContent = 'Guardando...';

    try {
        // ── 4. Upload banner if changed ───────────────────────────────────
        const bannerFile = document.getElementById('cfgBannerInput').files[0];
        if (bannerFile) {
            const bannerForm = new FormData();
            bannerForm.append('banner', bannerFile);
            const res = await fetch(`${API_BASE}/user/upload-banner`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: bannerForm,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setFeedback(feedbackId, err.detail || 'Error subiendo el banner.', 'err');
                btn.disabled = false; btn.textContent = '▸ Guardar cambios'; return;
            }
        }

        // ── 5. Upload background if changed ──────────────────────────────
        const bgFile = document.getElementById('cfgBgInput').files[0];
        if (bgFile) {
            const bgForm = new FormData();
            bgForm.append('bg', bgFile);
            const res = await fetch(`${API_BASE}/user/upload-background`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: bgForm,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setFeedback(feedbackId, err.detail || 'Error subiendo el fondo.', 'err');
                btn.disabled = false; btn.textContent = '▸ Guardar cambios'; return;
            }
        }

        // ── 6. Profile update (username, desc, avatar, languages, password) ──
        const form = new FormData();
        if (username !== userData.username) form.append('username', username);
        if (desc !== userData.description)  form.append('description', desc);

        const avatarFile = document.getElementById('cfgAvatarInput').files[0];
        if (avatarFile) form.append('pfp', avatarFile);

        selectedLangs.forEach(l => form.append('languages', l));

        if (newp && oldp) {
            form.append('old_password', oldp);
            form.append('new_password', newp);
        }

        const profileRes  = await fetch(`${API_BASE}/user/profile/update`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
        });
        const profileData = await profileRes.json();
        if (!profileRes.ok) {
            setFeedback(feedbackId, profileData.detail || 'Error al guardar el perfil.', 'err');
            btn.disabled = false; btn.textContent = '▸ Guardar cambios'; return;
        }

        // ── 7. Social links ───────────────────────────────────────────────
        const socialBody = {
            github:     document.getElementById('cfgGithub').value.trim()     || null,
            linkedin:   document.getElementById('cfgLinkedin').value.trim()   || null,
            codeforces: document.getElementById('cfgCodeforces').value.trim() || null,
            instagram:  document.getElementById('cfgInstagram').value.trim()  || null,
            tiktok:     document.getElementById('cfgTiktok').value.trim()     || null,
        };
        const socialRes = await fetch(`${API_BASE}/user/update-socials`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(socialBody),
        });
        if (!socialRes.ok) {
            const err = await socialRes.json().catch(() => ({}));
            setFeedback(feedbackId, err.detail || 'Error al guardar redes sociales.', 'err');
            btn.disabled = false; btn.textContent = '▸ Guardar cambios'; return;
        }

        // ── 8. Success ────────────────────────────────────────────────────
        userData.username    = username;
        userData.description = desc;
        userData.languages   = [...selectedLangs];
        document.getElementById('navUsername').textContent = username;

        // Reset password fields
        if (newp) {
            document.getElementById('cfgOldPwd').value       = '';
            document.getElementById('cfgNewPwd').value       = '';
            document.getElementById('cfgNewPwd').disabled    = true;
            document.getElementById('cfgNewPwd').placeholder = 'Verifica primero tu contraseña actual';
            document.getElementById('cfgVerifyBtn').textContent = 'Verificar';
            setStatus('cfgPwdStatus', '', '');
        }

        setFeedback(feedbackId, '¡Configuración guardada correctamente!', 'ok');
        setTimeout(() => setFeedback(feedbackId, '', ''), 4000);

    } catch {
        setFeedback(feedbackId, 'Error de conexión.', 'err');
    }

    btn.disabled    = false;
    btn.textContent = '▸ Guardar cambios';
}

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }

    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = '/login';
    });

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { window.location.href = '/login'; return; }
        userData      = await res.json();
        selectedLangs = [...(userData.languages || [])];
    } catch {
        window.location.href = '/login';
        return;
    }

    populateNavbar(userData);
    initPerfilSection(userData);
    initSocialsSection(userData);
    initSeguridadSection(userData);
    initLenguajesSection();
    initAparienciaSection();

    const $personalBtn = document.getElementById('cfgPersonalSaveBtn');
    const $persBtn     = document.getElementById('cfgPersSaveBtn');
    if ($personalBtn) $personalBtn.addEventListener('click', () => saveAll($personalBtn, 'cfgPersonalFeedback'));
    if ($persBtn)     $persBtn.addEventListener('click',     () => saveAll($persBtn,     'cfgPersFeedback'));
});
