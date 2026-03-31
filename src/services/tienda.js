const API_BASE_URL = 'http://localhost:8000/api';
let allItems = [];
let userCoins = 0;
let activeTab = 'frame';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = 'Login.html';
    });

    // Navbar
    try {
        const res = await fetch(`${API_BASE_URL}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const user = await res.json();
        document.getElementById('navUsername').textContent = user.username;
        const navAvatar = document.getElementById('navAvatar');
        if (user.avatar) {
            navAvatar.style.backgroundImage = `url('${user.avatar}')`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border = '1px solid var(--accent-cyan)';
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
    } catch {
        localStorage.removeItem('access_token');
        window.location.href = 'index.html';
        return;
    }

    // Tab listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            renderGrid();
        });
    });

    await loadStore();
});

async function loadStore() {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/store/items`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        allItems = data.items;
        userCoins = data.coins;
        document.getElementById('coinsAmount').textContent = userCoins.toLocaleString();
        renderGrid();
    } catch {
        document.getElementById('tiendaGrid').innerHTML = '<div class="tienda-loading">Error cargando la tienda.</div>';
    }
}

function renderGrid() {
    const grid = document.getElementById('tiendaGrid');
    const filtered = allItems.filter(i => i.type === activeTab);

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="tienda-loading">No hay artículos en esta categoría.</div>';
        return;
    }

    grid.innerHTML = filtered.map(item => buildItemCard(item)).join('');
}

function getPreviewClass(item) {
    const map = {
        frame_silver: 'frame-silver', frame_cyan: 'frame-cyan',
        frame_gold: 'frame-gold', frame_fire: 'frame-fire', frame_rainbow: 'frame-rainbow',
        bg_void: 'bg-void', bg_matrix: 'bg-matrix', bg_aurora: 'bg-aurora', bg_cyber: 'bg-cyber',
    };
    if (item.type === 'upgrade') return 'upgrade';
    return map[item.id] || '';
}

function getPreviewIcon(item) {
    if (item.type === 'frame') return '👤';
    if (item.type === 'upgrade') {
        const icons = { extra_badge_slot: '🏅', extended_bio: '📝' };
        return icons[item.id] || '⚡';
    }
    return '';
}

function buildItemCard(item) {
    const previewClass = getPreviewClass(item);
    const icon = getPreviewIcon(item);
    const canAfford = userCoins >= item.price;

    let btnHTML = '';
    if (item.equipped) {
        btnHTML = `<button class="item-btn equipped-state" disabled>Equipado</button>`;
    } else if (item.owned) {
        if (item.type !== 'upgrade') {
            btnHTML = `<button class="item-btn equip" onclick="equipItem('${item.id}')">Equipar</button>`;
        } else {
            btnHTML = `<button class="item-btn equipped-state" disabled>Activo</button>`;
        }
    } else {
        btnHTML = `<button class="item-btn buy ${canAfford ? '' : 'cant-afford'}"
            onclick="${canAfford ? `buyItem('${item.id}')` : ''}"
            ${canAfford ? '' : 'disabled'}>Comprar</button>`;
    }

    const equippedBadge = item.equipped ? '<div class="item-equipped-badge">EQUIPADO</div>' : '';

    return `
        <div class="item-card ${item.owned ? 'owned' : ''} ${item.equipped ? 'equipped' : ''}" id="card-${item.id}">
            ${equippedBadge}
            <div class="item-preview ${previewClass}">${icon}</div>
            <div class="item-info">
                <p class="item-name">${item.name}</p>
                <p class="item-desc">${item.description}</p>
            </div>
            <div class="item-footer">
                <div class="item-price">
                    <span class="price-icon">◈</span>
                    <span>${item.owned ? '—' : item.price.toLocaleString()}</span>
                </div>
                ${btnHTML}
            </div>
        </div>`;
}

async function buyItem(itemId) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE_URL}/store/buy/${itemId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Error al comprar', true); return; }

        userCoins = data.coins_left;
        document.getElementById('coinsAmount').textContent = userCoins.toLocaleString();

        // Update item state locally
        const item = allItems.find(i => i.id === itemId);
        if (item) { item.owned = true; }

        showToast(data.message);
        renderGrid();
    } catch {
        showToast('Error de conexión', true);
    }
}

async function equipItem(itemId) {
    const token = localStorage.getItem('access_token');
    try {
        const item = allItems.find(i => i.id === itemId);
        const res = await fetch(`${API_BASE_URL}/store/equip/${itemId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || 'Error al equipar', true); return; }

        // Unequip others of same type
        allItems.forEach(i => {
            if (i.type === item.type) i.equipped = false;
        });
        item.equipped = true;

        showToast(data.message);
        renderGrid();
    } catch {
        showToast('Error de conexión', true);
    }
}

let _toastTimer = null;
function showToast(msg, isError = false) {
    const toast = document.getElementById('tiendaToast');
    toast.textContent = msg;
    toast.className = 'tienda-toast show' + (isError ? ' error' : '');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { toast.className = 'tienda-toast'; }, 3000);
}
