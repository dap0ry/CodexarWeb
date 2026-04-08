/* logros.js — Achievements page logic */
const API_BASE = 'https://codexarapi.onrender.com/api';

let achievementsData = null;
let pendingEquipKey = null;

const RARITY_LABEL = {
    common: 'Común', uncommon: 'Poco Común', rare: 'Raro',
    epic: 'Épico', legendary: 'Legendario', ultimate: 'Supremo'
};
const RARITY_COLOR = {
    common: '#cd7f32', uncommon: '#c0c0c0', rare: '#ffd700',
    epic: '#c77dff', legendary: '#00ffcc', ultimate: '#ff6b6b'
};

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    // Navbar hydration
    try {
        const res = await fetch(`${API_BASE}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const user = await res.json();
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
    } catch (e) {
        window.location.href = 'Login.html';
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            window.location.href = 'Login.html';
        });
    }

    loadAchievements();
});

async function loadAchievements() {
    const token = localStorage.getItem('access_token');
    const container = document.getElementById('achievementsContainer');
    if (!container) return;
    container.innerHTML = '<div class="ach-loading">Cargando logros...</div>';
    try {
        const res = await fetch(`${API_BASE}/achievements/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        achievementsData = await res.json();
        renderAchievements(achievementsData);
    } catch (e) {
        container.innerHTML = '<div class="ach-loading" style="color:#ff4444;">Error al cargar logros.</div>';
    }
}

function renderAchievements(data) {
    const container = document.getElementById('achievementsContainer');
    if (!container) return;

    const categories = [
        { key: 'exercises',   label: '💻 Ejercicios Resueltos' },
        { key: 'ranked_wins', label: '⚡ Victorias Clasificatorias' },
    ];

    let html = '';
    for (const cat of categories) {
        const achs = data.achievements.filter(a => a.category === cat.key);
        html += `<div class="ach-section">
            <h3 class="ach-section-title">${cat.label}</h3>
            <div class="ach-grid">`;

        for (const a of achs) {
            const lockedClass = a.unlocked ? '' : 'locked';
            const equippedTag = a.equipped ? '<span class="ach-equipped-tag">● EQUIPADO</span>' : '';
            let actionBtn = '';
            if (a.equipped) {
                actionBtn = `<button class="btn-ach btn-unequip" onclick="handleUnequip('${a.key}')">Desequipar</button>`;
            } else if (a.unlocked) {
                actionBtn = `<button class="btn-ach btn-equip" onclick="handleEquip('${a.key}')">Equipar</button>`;
            }
            const progressText = a.unlocked ? '✓ Completado' : `${a.current}/${a.threshold}`;

            html += `<div class="ach-card rarity-${a.rarity} ${lockedClass}">
                <div class="ach-icon">${a.icon}</div>
                <div class="ach-info">
                    <div class="ach-header">
                        <span class="ach-title">${a.title}</span>
                        <span class="ach-rarity rarity-badge-${a.rarity}">${RARITY_LABEL[a.rarity] || a.rarity}</span>
                    </div>
                    <p class="ach-desc">${a.description}</p>
                    <div class="ach-progress-row">
                        <div class="ach-progress-bar">
                            <div class="ach-progress-fill rarity-${a.rarity}" style="width:${a.progress_pct}%"></div>
                        </div>
                        <span class="ach-progress-text">${progressText}</span>
                    </div>
                    ${equippedTag}
                </div>
                <div class="ach-actions">${actionBtn}</div>
            </div>`;
        }
        html += '</div></div>';
    }
    container.innerHTML = html;
}

window.handleEquip = async function(key) {
    if (!achievementsData) return;
    if (achievementsData.equipped.length >= 3) {
        openReplaceModal(key);
        return;
    }
    await doEquip(key, null);
};

window.handleUnequip = async function(key) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/achievements/unequip`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ achievement_key: key })
        });
        if (!res.ok) { alert('Error al desequipar.'); return; }
        achievementsData = null;
        loadAchievements();
    } catch (e) { alert('Error de conexión.'); }
};

async function doEquip(key, replaceKey) {
    const token = localStorage.getItem('access_token');
    try {
        const body = { achievement_key: key };
        if (replaceKey) body.replace_key = replaceKey;
        const res = await fetch(`${API_BASE}/achievements/equip`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) { const err = await res.json(); alert(err.detail || 'Error al equipar.'); return; }
        achievementsData = null;
        closeReplaceModal();
        loadAchievements();
    } catch (e) { alert('Error de conexión.'); }
}

function openReplaceModal(key) {
    pendingEquipKey = key;
    const slots = document.getElementById('replaceSlots');
    if (!slots || !achievementsData) return;

    const equippedAchs = achievementsData.achievements.filter(a => a.equipped);
    slots.innerHTML = equippedAchs.map(a => `
        <div class="replace-slot" onclick="confirmReplace('${a.key}')">
            <span class="replace-slot-icon">${a.icon}</span>
            <span class="replace-slot-name">${a.title}</span>
            <span class="replace-slot-rarity" style="color:${RARITY_COLOR[a.rarity] || '#fff'}">${RARITY_LABEL[a.rarity] || a.rarity}</span>
        </div>
    `).join('');

    document.getElementById('replaceOverlay').classList.remove('hidden');
}

window.closeReplaceModal = function() {
    pendingEquipKey = null;
    document.getElementById('replaceOverlay').classList.add('hidden');
};

window.confirmReplace = async function(replaceKey) {
    if (!pendingEquipKey) return;
    await doEquip(pendingEquipKey, replaceKey);
};
