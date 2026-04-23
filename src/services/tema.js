const API_BASE = 'https://api.codexar.es/api';

function applyActiveState(theme) {
    if (theme === 'light') theme = 'zen';
    document.querySelectorAll('.tema-card').forEach(card => {
        const isActive = card.dataset.theme === theme;
        card.classList.toggle('active', isActive);
        const btn = card.querySelector('.tema-btn');
        if (btn) btn.textContent = isActive ? 'ACTIVO ✓' : 'SELECCIONAR';
    });
}

function selectTheme(theme) {
    setTheme(theme);
    applyActiveState(theme);
}

async function initTema() {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('auth');
        const user = await res.json();

        document.getElementById('navUsername').textContent = user.username;
        const navAvatar = document.getElementById('navAvatar');
        if (user.avatar) {
            navAvatar.style.backgroundImage = `url(${user.avatar})`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
    } catch {
        window.location.href = 'Login.html';
        return;
    }

    // Set initial active card based on current theme
    applyActiveState(getTheme());

    // Wire up card clicks
    document.querySelectorAll('.tema-card').forEach(card => {
        card.addEventListener('click', () => selectTheme(card.dataset.theme));
    });
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
});

document.addEventListener('DOMContentLoaded', initTema);
