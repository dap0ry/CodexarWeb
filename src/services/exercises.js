const API_BASE = 'https://codexarapi.onrender.com/api';
let masterExercises = [];

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function initializeOfflineMode() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    try {
        // Hydrate Navbar
        const userRes = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userRes.ok) throw new Error('Auth Fault');
        const user = await userRes.json();

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

        // Fetch Exercises (includes solved, first_solver, friends_solved per user)
        const exRes = await fetch(`${API_BASE}/exercises`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!exRes.ok) throw new Error('Exercises Fault');
        masterExercises = await exRes.json();

        renderExercises(masterExercises);

    } catch (error) {
        console.error("Initialization Failed:", error);
        if (error.message === 'Auth Fault') window.location.href = 'Login.html';
    }
}

function buildAvatarEl(user, size = 22) {
    const safeName = escHtml(user.username);
    const safeAvatar = escHtml(user.avatar);
    if (user.avatar) {
        return `<div class="mini-avatar-img" style="width:${size}px;height:${size}px;background-image:url(${safeAvatar});" title="${safeName}"></div>`;
    }
    return `<div class="mini-avatar-letter" style="width:${size}px;height:${size}px;font-size:${Math.floor(size * 0.45)}px;" title="${safeName}">${(user.username || '?').charAt(0).toUpperCase()}</div>`;
}

function renderExercises(data) {
    const list = document.getElementById('exercisesList');
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#ffffff; margin-top:30px; font-family:var(--font-heading);">No se encontraron desafíos...</div>`;
        return;
    }

    data.forEach(ex => {
        let diffColorClass = 'badge-normal';
        if (ex.difficulty === 'Fácil') diffColorClass = 'badge-facil';
        if (ex.difficulty === 'Difícil') diffColorClass = 'badge-dificil';

        // First solver badge
        let firstSolverHtml = '';
        if (ex.first_solver) {
            const fs = ex.first_solver;
            firstSolverHtml = `
                <span class="ex-badge badge-first-solver" title="Primera resolución por: ${escHtml(fs.username)}" style="cursor:pointer" onclick="window.location.href='ProfileView.html?u=${escHtml(fs.username)}'">
                    <span class="fs-label">1°</span>
                    ${buildAvatarEl(fs, 18)}
                    <span class="fs-name">${escHtml(fs.username)}</span>
                </span>
            `;
        }

        // Friends solved badge
        let friendsSolvedHtml = '';
        if (ex.friends_solved && ex.friends_solved.length > 0) {
            const friends = ex.friends_solved;
            const shown = friends.slice(0, 4);
            const extra = friends.length > 4 ? friends.length - 4 : 0;
            
            // Build tooltip content
            const tooltipHtml = friends.map(f => `
                <div class="tooltip-friend-row">
                    ${buildAvatarEl(f, 20)}
                    <span>${escHtml(f.username)}</span>
                </div>
            `).join('');

            friendsSolvedHtml = `
                <span class="ex-badge badge-friends-solved" data-tooltip-id="ft-${ex.id}">
                    <span class="fs-label" style="color:var(--accent-cyan);">👥</span>
                    <div class="friends-avatars-row">
                        ${shown.map(f => buildAvatarEl(f, 18)).join('')}
                        ${extra > 0 ? `<span class="extra-friends">+${extra}</span>` : ''}
                    </div>
                    <div class="friends-tooltip" id="ft-${ex.id}">
                        <div class="tooltip-title">Amigos que lo resolvieron</div>
                        <div class="tooltip-list">${tooltipHtml}</div>
                    </div>
                </span>
            `;
        }

        const card = document.createElement('div');
        card.className = `ex-card${ex.solved ? ' ex-card-solved' : ''}`;

        card.innerHTML = `
            <div class="ex-content">
                <div class="ex-title">
                    ${ex.solved ? '<span class="solved-check">✓</span> ' : ''}${escHtml(ex.title)}
                </div>
                <div class="ex-meta-row">
                    <span class="ex-badge ${diffColorClass}">${escHtml(ex.difficulty)}</span>
                    <span class="ex-badge badge-category">${escHtml(ex.category)}</span>
                    <span class="ex-badge badge-solvers">${parseInt(ex.total_solvers) || 0} Resueltos</span>
                    ${firstSolverHtml}
                    ${friendsSolvedHtml}
                </div>
            </div>
            <div class="ex-action">
                <button class="btn-resolve${ex.solved ? ' btn-resolved' : ''}" data-exid="${escHtml(ex.id)}">
                    ${ex.solved ? '✓ Ver' : 'Resolver'}
                </button>
            </div>
        `;
        card.querySelector('[data-exid]').addEventListener('click', function() {
            solveExercise(this.dataset.exid);
        });
        list.appendChild(card);
    });
}

// Filter Logic
function applyFilters() {
    const term = document.getElementById('searchExercise').value.toLowerCase();
    const cat = document.getElementById('filterCategory').value;
    const diff = document.getElementById('filterDifficulty').value;

    const filtered = masterExercises.filter(ex => {
        const matchesTerm = ex.title.toLowerCase().includes(term);
        const matchesCat = cat === 'All' || ex.category === cat;
        const matchesDiff = diff === 'All' || ex.difficulty === diff;
        return matchesTerm && matchesCat && matchesDiff;
    });

    renderExercises(filtered);
}

document.getElementById('searchExercise').addEventListener('input', applyFilters);
document.getElementById('filterCategory').addEventListener('change', applyFilters);
document.getElementById('filterDifficulty').addEventListener('change', applyFilters);

// Random → SolvePage
document.getElementById('btnRandom').addEventListener('click', () => {
    if (masterExercises.length === 0) return;
    const randomEx = masterExercises[Math.floor(Math.random() * masterExercises.length)];
    window.location.href = `SolvePage.html?id=${randomEx.id}`;
});

// Navigate to SolvePage
window.solveExercise = function (id) {
    window.location.href = `SolvePage.html?id=${id}`;
};

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
});

document.addEventListener('DOMContentLoaded', initializeOfflineMode);
