const API_BASE = 'https://codexarapi.onrender.com/api';

async function initVsCpu() {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('auth');
        const user = await res.json();

        document.getElementById('navUsername').textContent = user.username;
        const navAvatar = document.getElementById('navAvatar');
        if (user.avatar) {
            navAvatar.style.cssText = `background-image:url(${user.avatar});background-size:cover;background-position:center;border:1px solid var(--accent-cyan);`;
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
    } catch {
        window.location.href = 'Login.html';
    }
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
});

initVsCpu();
