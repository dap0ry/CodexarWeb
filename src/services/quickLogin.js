const API_BASE = 'https://codexarapi.onrender.com/api';

const DEFAULT_AVATAR = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

document.addEventListener('DOMContentLoaded', async () => {
    const token      = localStorage.getItem('access_token');
    const savedEmail = localStorage.getItem('saved_email');

    // Guard: if no session data, go to login
    if (!token || !savedEmail) {
        window.location.replace('Login.html');
        return;
    }

    const avatarEl   = document.getElementById('qlAvatar');
    const usernameEl = document.getElementById('qlUsername');
    const passwordEl = document.getElementById('qlPassword');
    const errorEl    = document.getElementById('qlError');
    const submitBtn  = document.getElementById('qlSubmit');
    const switchBtn  = document.getElementById('qlSwitchBtn');

    // ── Load user data from API ──────────────────────────────────
    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            // Token expired or revoked → send to full login
            _clearSession();
            window.location.replace('Login.html');
            return;
        }

        const user = await res.json();
        usernameEl.innerHTML = `<span>${user.username || 'Usuario'}</span>`;
        avatarEl.src = user.avatar || DEFAULT_AVATAR;
        avatarEl.onerror = () => { avatarEl.src = DEFAULT_AVATAR; };

    } catch {
        _clearSession();
        window.location.replace('Login.html');
        return;
    }

    // ── Password submit ──────────────────────────────────────────
    document.getElementById('qlForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = passwordEl.value;
        if (!password) return;

        _hideError();
        submitBtn.disabled = true;
        submitBtn.querySelector('.ql-btn-text').textContent = 'Verificando...';

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: savedEmail, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // Refresh stored token and go home
                localStorage.setItem('access_token', data.access_token);
                if (data.username) localStorage.setItem('username', data.username);
                window.location.replace('Home.html');
            } else {
                _showError(data.detail || 'Contraseña incorrecta.');
                submitBtn.disabled = false;
                submitBtn.querySelector('.ql-btn-text').textContent = 'Continuar';
                passwordEl.value = '';
                passwordEl.focus();
            }
        } catch {
            _showError('Error de conexión con el servidor.');
            submitBtn.disabled = false;
            submitBtn.querySelector('.ql-btn-text').textContent = 'Continuar';
        }
    });

    // ── Switch account ───────────────────────────────────────────
    switchBtn.addEventListener('click', async () => {
        // Revoke current token on the server, then clear locally
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch { /* best-effort */ }
        _clearSession();
        window.location.replace('Login.html');
    });

    passwordEl.focus();

    // ── Helpers ──────────────────────────────────────────────────
    function _showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
    function _hideError() {
        errorEl.style.display = 'none';
    }
    function _clearSession() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('saved_email');
        localStorage.removeItem('username');
    }
});
