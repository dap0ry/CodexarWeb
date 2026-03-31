const API_BASE = "http://localhost:8000/api";
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    initFriendsPage();
});

async function initFriendsPage() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }
    
    // Bind Logout Logic inherited from Navbar
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            window.location.href = 'Login.html';
        });
    }

    try {
        const response = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Token Authentication Invalid");
        currentUser = await response.json();
        
        // Populate standard Navbar Identity
        document.getElementById('navUsername').textContent = currentUser.username;
        const navAvatar = document.getElementById('navAvatar');
        if (currentUser.avatar) {
            navAvatar.style.backgroundImage = `url(${currentUser.avatar})`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border = '1px solid var(--accent-cyan)';
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        }
        
        // Asynchronously populate Page Vectors
        await loadActivityFeed();
        await loadFriendsData();
        setupDirectAddListener();

    } catch (e) {
        console.error("Critical identity failure:", e);
        localStorage.removeItem('access_token');
        window.location.href = 'index.html';
    }

    // Heartbeat every 60s to keep last_seen updated
    async function sendHeartbeat() {
        const t = localStorage.getItem('access_token');
        if (!t) return;
        await fetch(`${API_BASE}/user/heartbeat`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${t}` }
        }).catch(() => {});
    }
    sendHeartbeat();
    setInterval(sendHeartbeat, 60000);
}

// Transforms API User Object into HTML structure mimicking Dashboard Wireframes
function createUserCardHTML(user, actionButtonsHTML) {
    const avatarHTML = user.avatar 
        ? `<img src="${user.avatar}" class="f-avatar" alt="${user.username}">` 
        : ``; // Defaults fallback mapped on CSS wrapper natively

    const isOnline = user.is_online !== undefined ? user.is_online : false;
    const statusClass = isOnline ? "online" : "offline";
    const statusHTML = `<div class="f-status ${statusClass}"></div>`;
    const lastSeenHTML = user.last_seen_text
        ? `<div class="f-last-seen">${user.last_seen_text}</div>`
        : '';

    // Reconstruct Language vectors targeting DevIcons dynamically
    let langsHTML = '';
    if (user.languages && user.languages.length > 0) {
        user.languages.forEach(lang => {
            let iconCode = lang.toLowerCase();
            if (iconCode === 'c++') iconCode = 'cplusplus';
            if (iconCode === 'c#') iconCode = 'csharp';
            langsHTML += `<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${iconCode}/${iconCode}-original.svg" class="f-lang-icon">`;
        });
    }

    // Determine simplified styling depending on action button injection sizes
    const isBasicCard = actionButtonsHTML.includes('request') || actionButtonsHTML.includes('cancel');

    const profileLink = `PerfilPublico.html?u=${encodeURIComponent(user.username)}`;

    return `
        <div class="friend-card ${isBasicCard ? 'friend-card-simplified' : ''}">
            <div class="friend-card-content">
                <div class="f-user-text">
                    <div class="f-username">
                        <a href="${profileLink}" class="f-username-link">${user.username}</a>
                        ${langsHTML}
                    </div>
                        <div class="f-badge">${user.description ? user.description.toUpperCase() : 'JUGADOR CODEXAR'}</div>
                        ${lastSeenHTML}
                </div>
            </div>

            <div class="action-group">
                ${actionButtonsHTML}
            </div>

            <div class="f-avatar-wrapper" onclick="window.location.href='${profileLink}'" style="cursor:pointer;" title="Ver perfil">
                ${avatarHTML}
                ${statusHTML}
            </div>
        </div>
    `;
}

// Trigger parallel API pull for lists mappings
async function loadFriendsData() {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/friends`, { headers: { 'Authorization': `Bearer ${token}` } });
        if(res.ok) {
            const data = await res.json();
            renderFriends(data.friends);
            renderSent(data.sent);
            renderReceived(data.received);
        }
    } catch (e) {
        console.error("Error loading grids:", e);
    }
}

// Injects data mapping onto DOM
function renderFriends(list) {
    const el = document.getElementById('masterFriendsList');
    if (list.length === 0) {
        el.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; padding:10px;">Aún no tienes amigos añadidos.</p>';
        return;
    }
    el.innerHTML = list.map(u => createUserCardHTML(u, `
        <button class="btn-small delete" onclick="handleDeleteFriend('${u.username}')">Eliminar</button>
    `)).join('');
}

function renderSent(list) {
    const el = document.getElementById('sentRequestsList');
    if (list.length === 0) {
        el.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center;">Ninguna solicitud enviada.</p>';
        return;
    }
    el.innerHTML = list.map(u => createUserCardHTML(u, `
        <button class="btn-small cancel" onclick="handleFriendAction('cancel', '${u.username}')">Cancelar</button>
    `)).join('');
}

function renderReceived(list) {
    const el = document.getElementById('receivedRequestsList');
    if (list.length === 0) {
        el.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center;">No tienes solicitudes pendientes.</p>';
        return;
    }
    el.innerHTML = list.map(u => createUserCardHTML(u, `
        <button class="btn-small accept" onclick="handleFriendAction('accept', '${u.username}')">Aceptar</button>
        <button class="btn-small reject" onclick="handleFriendAction('reject', '${u.username}')">Rechazar</button>
    `)).join('');
}

window.handleDeleteFriend = async function(targetUsername) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/friends/${targetUsername}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) await loadFriendsData();
    } catch (err) {
        console.error("Delete friend error:", err);
    }
};

// Extracted globally for inline DOM bind onclick execution securely
window.handleFriendAction = async function(action, targetUsername) {
    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${API_BASE}/friends/${action}/${targetUsername}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
            // Hot refresh data grids securely without window reset
            await loadFriendsData();
        }
    } catch(err) {
        console.error("Action handler exception:", err);
    }
}

// Direct Add Feature Flow
function setupDirectAddListener() {
    const btn = document.getElementById('addFriendBtn');
    const input = document.getElementById('friendSearchInput');
    const feedback = document.getElementById('searchFeedback');

    const triggerAdd = async () => {
        const targetUser = input.value.trim();
        if (!targetUser) return;
        
        feedback.className = 'search-feedback';
        feedback.textContent = 'Buscando perfil...';
        
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_BASE}/friends/request/${encodeURIComponent(targetUser)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await res.json();
            
            if (res.ok) {
                feedback.classList.add('success');
                feedback.textContent = "¡Solicitud enviada correctamente!";
                input.value = '';
                await loadFriendsData(); // Refresh requests box securely
            } else {
                feedback.classList.add('error');
                if (data.detail === "Usuario objetivo no encontrado") {
                    feedback.textContent = "Este usuario no existe.";
                } else {
                    feedback.textContent = data.detail || "Error al enviar la solicitud.";
                }
            }
        } catch (err) {
            feedback.classList.add('error');
            feedback.textContent = "Error de conexión con el servidor.";
            console.error(err);
        }
    };

    btn.addEventListener('click', triggerAdd);

    // Allow mapping enter key inline
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerAdd();
    });
}

// Render dynamic activity mocks securely targeting DOM
async function loadActivityFeed() {
    const token = localStorage.getItem('access_token');
    const el = document.getElementById('activityList');
    try {
        const res = await fetch(`${API_BASE}/friends/activity`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
            const activities = await res.json();
            if(activities.length > 0) {
                el.innerHTML = activities.map(a => `
                    <div class="activity-item">${a.text}</div>
                `).join('');
            } else {
                el.innerHTML = '<div class="activity-placeholder">Vací­o actualmente.</div>';
            }
        }
    } catch(err) {
        console.error(err);
    }
}
