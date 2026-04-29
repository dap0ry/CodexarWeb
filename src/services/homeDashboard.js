const API_BASE_URL = 'https://api.codexar.es/api';

async function fetchUserData() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return null;
    }

    const response = await fetch(`${API_BASE_URL}/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        if (response.status === 401) window.location.href = '/login';
        throw new Error('No se pudo cargar el perfil');
    }
    return await response.json();
}

// ── Mention parser: converts @username and #TeamName into clickable links ─────
function parseMentions(text) {
    return text
        .replace(/#([\w\s]{1,20}?)(?=\s|$|[^a-zA-Z0-9_\s])/g, (match, name) => {
            const trimmed = name.trim();
            return `<a class="news-mention news-team-mention" href="/equipo?t=${encodeURIComponent(trimmed)}">#${trimmed}</a>`;
        })
        .replace(/@(\w+)/g, (match, username) => {
            return `<a class="news-mention" href="/perfil?u=${encodeURIComponent(username)}">@${username}</a>`;
        });
}

// ── Format date ──────────────────────────────────────────────────────────────
function formatDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Render a single news card ─────────────────────────────────────────────────
function buildNewsCard(news) {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.dataset.id = news.id;

    const bodyHtml = parseMentions(news.body || '');
    const likedClass = news.liked_by_me ? ' liked' : '';

    card.innerHTML = `
        <div class="news-card-header">
            <div class="news-card-title">${escapeHtml(news.title)}</div>
            <div class="news-card-subtitle">${escapeHtml(news.subtitle)}</div>
        </div>
        <div class="news-card-meta">
            <span class="news-card-creator">@${escapeHtml(news.creator)}</span>
            <span class="news-card-dot">·</span>
            <span>${formatDate(news.created_at)}</span>
        </div>
        <div class="news-card-body">${bodyHtml}</div>
        <div class="news-card-footer">
            <button class="news-like-btn${likedClass}" data-id="${news.id}">
                <span class="news-like-icon">${news.liked_by_me ? '♥' : '♡'}</span>
                <span class="news-like-count">${news.like_count}</span>
            </button>
        </div>
    `;

    // Like toggle handler
    card.querySelector('.news-like-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_BASE_URL}/news/${news.id}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                btn.classList.toggle('liked', data.liked);
                btn.querySelector('.news-like-icon').textContent = data.liked ? '♥' : '♡';
                btn.querySelector('.news-like-count').textContent = data.like_count;
            }
        } catch (err) {
            console.warn('Error al dar like:', err);
        }
    });

    return card;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Load news feed ────────────────────────────────────────────────────────────
async function loadNews(token) {
    const feed = document.getElementById('newsFeed');
    if (!feed) return;
    try {
        const res = await fetch(`${API_BASE_URL}/news/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error cargando noticias');
        const newsList = await res.json();
        feed.innerHTML = '';
        if (newsList.length === 0) {
            feed.innerHTML = '<div class="news-skeleton">No hay noticias aún.</div>';
            return;
        }
        newsList.forEach(n => feed.appendChild(buildNewsCard(n)));
    } catch (err) {
        console.warn('No se pudieron cargar las noticias:', err);
        if (feed) feed.innerHTML = '<div class="news-skeleton">No se pudieron cargar las noticias.</div>';
    }
}

// ── Dashboard init ────────────────────────────────────────────────────────────
async function initDashboard() {
    try {
        const token = localStorage.getItem('access_token');
        const user = await fetchUserData();
        if (!user) return;

        // Navbar pill
        const navUsername = document.getElementById('navUsername');
        if (navUsername) navUsername.textContent = user.username;

        // Sidebar user card
        const sidebarUsername = document.getElementById('sidebarUsername');
        if (sidebarUsername) sidebarUsername.textContent = user.username;

        const sidebarBadge = document.getElementById('sidebarBadge');
        if (sidebarBadge) sidebarBadge.textContent = user.description ? user.description.toUpperCase() : "JUGADOR CODEXAR";

        // Language icons
        const langIcons = {
            "C++":    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
            "Python": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
            "Java":   "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
            "Go":     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
            "C#":     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg"
        };

        const sidebarLangs = document.getElementById('sidebarLangs');
        if (sidebarLangs && user.languages) {
            sidebarLangs.innerHTML = '';
            const langStats = user.lang_stats || {};
            const total = Object.values(langStats).reduce((a, b) => a + b, 0);
            user.languages.forEach(lang => {
                if (!langIcons[lang]) return;
                const count = langStats[lang] || 0;
                const pct   = total > 0 ? Math.round(count / total * 100) : 0;
                const img   = document.createElement('img');
                img.src       = langIcons[lang];
                img.className = 'sidebar-lang-icon';
                img.alt       = lang;
                img.title     = `${lang}${total > 0 ? `: ${pct}%` : ''}`;
                sidebarLangs.appendChild(img);
            });
        }

        // Rank, ELO & global rank
        const rankText = document.getElementById('homeRankText');
        const globalRank = document.getElementById('homeGlobalRank');
        const heroElo = document.getElementById('heroElo');
        if (rankText) rankText.textContent = user.rank_name || 'Bronce I';
        if (globalRank) globalRank.textContent = user.global_rank ? `#${user.global_rank} Global` : 'Sin ranking';
        if (heroElo) heroElo.textContent = user.elo !== undefined ? user.elo : '—';

        // Role badge
        const roleBadge = document.getElementById('heroRoleBadge');
        if (roleBadge && user.role && user.role !== 'user') {
            roleBadge.textContent = user.role === 'admin' ? '◈ ADMIN' : '◈ MOD';
            roleBadge.className = 'hero-role-badge ' + (user.role === 'admin' ? 'admin' : 'mod');
        }

        // Avatars
        function setAvatar(el) {
            if (!el) return;
            if (user.avatar) {
                el.style.backgroundImage = `url(${user.avatar})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                el.textContent = '';
                el.style.border = '2px solid rgba(0,255,204,0.35)';
            } else {
                el.textContent = user.username.charAt(0).toUpperCase();
            }
        }
        setAvatar(document.getElementById('navAvatar'));
        setAvatar(document.getElementById('sidebarAvatar'));

        // Exercise stats + donut chart
        let realStats = { easy: 0, medium: 0, hard: 0, total: 0 };
        try {
            const statsRes = await fetch(`${API_BASE_URL}/user/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (statsRes.ok) realStats = await statsRes.json();
        } catch (e) {
            console.warn('Could not fetch stats:', e);
        }

        const total = realStats.total || 0;
        const statsTotal = document.getElementById('statsTotal');
        if (statsTotal) statsTotal.textContent = total;

        const donutSegments = document.getElementById('donutSegments');
        if (donutSegments) {
            donutSegments.innerHTML = '';
            if (total > 0) {
                const easyPct = realStats.easy / total;
                const medPct  = realStats.medium / total;
                const hardPct = realStats.hard / total;
                const circumference = 2 * Math.PI * 16;
                let currentAngle = 0;

                function appendSegment(percent, color, angleOffset) {
                    if (percent <= 0) return;
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', '21'); circle.setAttribute('cy', '21'); circle.setAttribute('r', '16');
                    circle.setAttribute('fill', 'transparent');
                    circle.setAttribute('stroke', color);
                    circle.setAttribute('stroke-width', '8');
                    circle.setAttribute('stroke-dasharray', `${percent * circumference} ${circumference}`);
                    circle.setAttribute('transform', `rotate(${angleOffset} 21 21)`);
                    donutSegments.appendChild(circle);
                }

                appendSegment(easyPct, '#39ff14', 0);
                currentAngle += easyPct * 360;
                appendSegment(medPct, '#f89820', currentAngle);
                currentAngle += medPct * 360;
                appendSegment(hardPct, '#ff3333', currentAngle);
            }
        }

        // Wins & win rate
        const wins = user.wins || 0;
        const played = user.matches_played || 0;
        const wr = played > 0 ? Math.round((wins / played) * 100) : 0;
        const statsWins = document.getElementById('statsWins');
        const statsWR = document.getElementById('statsWR');
        if (statsWins) statsWins.textContent = wins;
        if (statsWR) statsWR.textContent = played > 0 ? `${wr}% WR` : '-- WR';

        // Equipped achievements
        try {
            const equippedRes = await fetch(`${API_BASE_URL}/achievements/equipped`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (equippedRes.ok) {
                const equippedData = await equippedRes.json();
                equippedData.equipped.forEach((ach, i) => {
                    const badge = document.getElementById(`equippedBadge${i}`);
                    if (!badge) return;
                    badge.classList.add(`badge-${ach.rarity}`);
                    badge.title = ach.title;
                    badge.innerHTML = `<span class="badge-icon">${ach.icon}</span>`;
                });
            }
        } catch (e) {
            console.warn('No se pudieron cargar los logros equipados:', e);
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('access_token');
                window.location.href = '/';
            });
        }

        // Share profile
        const shareBtn = document.getElementById('shareProfileBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const profileViewer = document.getElementById('profileViewer');
                shareBtn.style.display = 'none';
                try {
                    const canvas = await html2canvas(profileViewer, {
                        backgroundColor: '#121216', scale: 2,
                        useCORS: true, allowTaint: true
                    });
                    const link = document.createElement('a');
                    link.download = `Codexar_Perfil_${user.username}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } catch (err) {
                    console.error('Error capturando perfil:', err);
                } finally {
                    shareBtn.style.display = '';
                }
            });
        }

        // Load news feed
        await loadNews(token);

        console.log("Dashboard inicializado con éxito para " + user.username);
    } catch (error) {
        console.error("Error al cargar los datos del usuario:", error);
    }
}

window.addEventListener('DOMContentLoaded', initDashboard);
