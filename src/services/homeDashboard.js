const API_BASE_URL = 'https://codexarapi.onrender.com/api';

async function fetchUserData() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'Login.html';
        return null;
    }
    
    const response = await fetch(`${API_BASE_URL}/user/me`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        if (response.status === 401) window.location.href = 'Login.html';
        throw new Error('No se pudo cargar el perfil');
    }
    return await response.json();
}

// Initialize dashboard data
async function initDashboard() {
    try {
        const token = localStorage.getItem('access_token');
        const user = await fetchUserData();
        if (!user) return;

        // Populate status bar
        const sbUsername = document.getElementById('sbUsername');
        const sbRank = document.getElementById('sbRank');
        const sbStreak = document.getElementById('sbStreak');
        if (sbUsername) sbUsername.textContent = user.username;
        if (sbRank) sbRank.textContent = user.rank_name || 'Bronce I';
        if (sbStreak) {
            const s = user.win_streak || 0;
            sbStreak.textContent = s > 0 ? `${s} victorias` : 'Sin racha';
        }

        // Inject username into navbar pill and sidebar
        const navUsername = document.getElementById('navUsername');
        const sidebarUsername = document.getElementById('sidebarUsername');
        
        if (navUsername) navUsername.textContent = user.username;
        if (sidebarUsername) sidebarUsername.textContent = user.username;
        
        const sidebarBadge = document.getElementById('sidebarBadge');
        if (sidebarBadge) sidebarBadge.textContent = user.description ? user.description.toUpperCase() : "JUGADOR CODEXAR";

        // Inject Languages Icons
        const langIcons = {
            "C++": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
            "Python": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
            "Java": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
            "Go": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
            "C#": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg"
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

        // Update Rank & Global Position
        const rankText = document.getElementById('homeRankText');
        const globalRank = document.getElementById('homeGlobalRank');
        if (rankText) rankText.textContent = user.rank_name || 'Bronce I';
        if (globalRank) {
            globalRank.textContent = user.global_rank ? `#${user.global_rank} Global` : 'Sin ranking';
        }

        // Inject Avatar logic (Navbar and Sidebar)
        const navAvatar = document.getElementById('navAvatar');
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        
        function setAvatar(el) {
            if (!el) return;
            if (user.avatar) {
                el.style.backgroundImage = `url(${user.avatar})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                el.textContent = ''; // clear text if image exists
                el.style.border = '1px solid var(--accent-cyan)';
            } else {
                el.textContent = user.username.charAt(0).toUpperCase();
            }
        }
        
        setAvatar(navAvatar);
        setAvatar(sidebarAvatar);

        // Fetch real exercise stats from API
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

        // Banner: username + chips
        const welcomeText = document.getElementById('welcomeText');
        if (welcomeText) welcomeText.textContent = user.username;

        const wbRank = document.getElementById('wbRank');
        if (wbRank) wbRank.textContent = user.rank_name || 'Bronce I';

        const wbStreak = document.getElementById('wbStreak');
        if (wbStreak) {
            const s = user.win_streak || 0;
            wbStreak.textContent = s > 0 ? `${s} victorias` : 'Sin racha';
        }

        // --- Real wins & win rate ---
        const wins = user.wins || 0;
        const played = user.matches_played || 0;
        const wr = played > 0 ? Math.round((wins / played) * 100) : 0;
        const statsWins = document.getElementById('statsWins');
        const statsWR = document.getElementById('statsWR');
        if (statsWins) statsWins.textContent = wins;
        if (statsWR) statsWR.textContent = played > 0 ? `${wr}% WR` : '-- WR';

        // Load equipped achievements for sidebar badges
        try {
            const achToken = localStorage.getItem('access_token');
            const equippedRes = await fetch(`${API_BASE_URL}/achievements/equipped`, {
                headers: { 'Authorization': `Bearer ${achToken}` }
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

        // Logout logic
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('access_token');
                window.location.href = 'index.html';
            });
        }

        // Capture Logic
        const shareBtn = document.getElementById('shareProfileBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const profileViewer = document.getElementById('profileViewer');
                // Temporarily hide the button so it isn't recorded in the photo
                shareBtn.style.display = 'none';
                
                try {
                    const canvas = await html2canvas(profileViewer, {
                        backgroundColor: '#121216',
                        scale: 2,
                        useCORS: true, // Allow Cloudinary PFP
                        allowTaint: true
                    });
                    
                    const link = document.createElement('a');
                    link.download = `Codexar_Perfil_${user.username}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } catch (err) {
                    console.error('Error capturando perfil:', err);
                    alert('Hubo un error al generar la imagen. Inténtalo de nuevo.');
                } finally {
                    // Restore button visibility
                    shareBtn.style.display = '';
                }
            });
        }

        console.log("Dashboard inicializado con éxito para " + user.username);
    } catch (error) {
        console.error("Error al cargar los datos del usuario:", error);
    }
}

// Generic button click handler
function handleAction(actionMsg) {
    console.log(actionMsg);
}

// Run initialization on page load
window.addEventListener('DOMContentLoaded', initDashboard);
