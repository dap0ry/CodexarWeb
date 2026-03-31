const API_BASE_URL = 'http://localhost:8000/api';

const LANG_ICONS = {
    "C++":    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
    "Python": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    "Java":   "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    "Go":     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
    "C#":     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg"
};

const ACHIEVEMENT_CATALOG = {
    exercises_1:    { name: "Primer Ejercicio",  rarity: "common",    icon: "💻" },
    exercises_5:    { name: "5 Ejercicios",       rarity: "uncommon",  icon: "💻" },
    exercises_10:   { name: "10 Ejercicios",      rarity: "rare",      icon: "💻" },
    exercises_25:   { name: "25 Ejercicios",      rarity: "epic",      icon: "💻" },
    exercises_50:   { name: "50 Ejercicios",      rarity: "legendary", icon: "💻" },
    exercises_100:  { name: "100 Ejercicios",     rarity: "ultimate",  icon: "💻" },
    wins_1:         { name: "Primera Victoria",   rarity: "common",    icon: "⚔️" },
    wins_5:         { name: "5 Victorias",        rarity: "uncommon",  icon: "⚔️" },
    wins_10:        { name: "10 Victorias",       rarity: "rare",      icon: "⚔️" },
    wins_25:        { name: "25 Victorias",       rarity: "epic",      icon: "⚔️" },
    wins_50:        { name: "50 Victorias",       rarity: "legendary", icon: "⚔️" },
    wins_100:       { name: "100 Victorias",      rarity: "ultimate",  icon: "⚔️" },
    ranked_wins_1:  { name: "Primera Ranked",     rarity: "common",    icon: "🏆" },
    ranked_wins_5:  { name: "5 Ranked",           rarity: "uncommon",  icon: "🏆" },
    ranked_wins_10: { name: "10 Ranked",          rarity: "rare",      icon: "🏆" },
    ranked_wins_25: { name: "25 Ranked",          rarity: "epic",      icon: "🏆" },
    ranked_wins_50: { name: "50 Ranked",          rarity: "legendary", icon: "🏆" },
    ranked_wins_100:{ name: "100 Ranked",         rarity: "ultimate",  icon: "🏆" },
};

const FRAME_CLASS = {
    frame_silver:  'frame-silver',
    frame_cyan:    'frame-cyan',
    frame_gold:    'frame-gold',
    frame_fire:    'frame-fire',
    frame_rainbow: 'frame-rainbow',
};

const BG_CLASS = {
    bg_void:   'bg-void',
    bg_matrix: 'bg-matrix',
    bg_aurora: 'bg-aurora',
    bg_cyber:  'bg-cyber',
};

// ELO rank range table (mirrors backend logic)
const RANK_RANGES = [
    { name: "Bronce I",    min: 0,    max: 25,         next: "Bronce II" },
    { name: "Bronce II",   min: 26,   max: 51,         next: "Bronce III" },
    { name: "Bronce III",  min: 52,   max: 75,         next: "Plata I" },
    { name: "Plata I",     min: 76,   max: 150,        next: "Plata II" },
    { name: "Plata II",    min: 151,  max: 225,        next: "Plata III" },
    { name: "Plata III",   min: 226,  max: 300,        next: "Oro I" },
    { name: "Oro I",       min: 301,  max: 467,        next: "Oro II" },
    { name: "Oro II",      min: 468,  max: 634,        next: "Oro III" },
    { name: "Oro III",     min: 635,  max: 800,        next: "Platino I" },
    { name: "Platino I",   min: 801,  max: 967,        next: "Platino II" },
    { name: "Platino II",  min: 968,  max: 1134,       next: "Platino III" },
    { name: "Platino III", min: 1135, max: 1300,       next: "Diamante I" },
    { name: "Diamante I",  min: 1301, max: 1534,       next: "Diamante II" },
    { name: "Diamante II", min: 1535, max: 1768,       next: "Diamante III" },
    { name: "Diamante III",min: 1769, max: 2000,       next: "Campeón" },
    { name: "Campeón",     min: 2001, max: Infinity,   next: null },
];

// Exercise milestones for the progress bar
const EX_MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500];

function getRankRange(elo) {
    for (const r of RANK_RANGES) {
        if (elo <= r.max) return r;
    }
    return RANK_RANGES[RANK_RANGES.length - 1];
}

function getRankColor(rankName) {
    if (rankName.startsWith('Bronce'))   return { color: '#cd7f32', bg: 'rgba(205,127,50,0.1)',   border: 'rgba(205,127,50,0.3)' };
    if (rankName.startsWith('Plata'))    return { color: '#c0c0c0', bg: 'rgba(192,192,192,0.1)',  border: 'rgba(192,192,192,0.3)' };
    if (rankName.startsWith('Oro'))      return { color: '#ffd700', bg: 'rgba(255,215,0,0.1)',    border: 'rgba(255,215,0,0.3)' };
    if (rankName.startsWith('Platino'))  return { color: '#a0c4ff', bg: 'rgba(160,196,255,0.1)',  border: 'rgba(160,196,255,0.3)' };
    if (rankName.startsWith('Diamante')) return { color: '#00ffcc', bg: 'rgba(0,255,204,0.1)',    border: 'rgba(0,255,204,0.3)' };
    return { color: '#ffffff', bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.3)' };
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    const params = new URLSearchParams(window.location.search);
    const username = params.get('u');
    if (!username) { window.location.href = 'Home.html'; return; }

    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = 'Login.html';
    });

    // Navbar
    try {
        const res = await fetch(`${API_BASE_URL}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const me = await res.json();
        document.getElementById('navUsername').textContent = me.username;
        const navAvatar = document.getElementById('navAvatar');
        if (me.avatar) {
            navAvatar.style.backgroundImage = `url('${me.avatar}')`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border = '1px solid var(--accent-cyan)';
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = me.username.charAt(0).toUpperCase();
        }
    } catch {
        localStorage.removeItem('access_token');
        window.location.href = 'index.html';
        return;
    }

    // Load public profile
    try {
        const res = await fetch(`${API_BASE_URL}/user/profile/${encodeURIComponent(username)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            document.getElementById('ppLoading').textContent = 'Perfil no encontrado.';
            return;
        }
        const profile = await res.json();
        renderProfile(profile);
    } catch {
        document.getElementById('ppLoading').textContent = 'Error cargando el perfil.';
    }
});

function renderProfile(p) {
    document.title = `Codexar — ${p.username}`;

    // ── Avatar ──
    const avatarEl = document.getElementById('ppAvatar');
    if (p.avatar) {
        avatarEl.style.backgroundImage = `url('${p.avatar}')`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
    } else {
        avatarEl.textContent = (p.username || '?').charAt(0).toUpperCase();
    }
    if (p.equipped_frame && FRAME_CLASS[p.equipped_frame]) {
        avatarEl.classList.add(FRAME_CLASS[p.equipped_frame]);
    }

    // ── Page background ──
    const pageBg = document.getElementById('ppPageBg');
    if (p.profile_background && pageBg) {
        if (BG_CLASS[p.profile_background]) {
            pageBg.classList.add(BG_CLASS[p.profile_background]);
        } else if (p.profile_background.startsWith('http')) {
            pageBg.style.backgroundImage = `url('${p.profile_background}')`;
            pageBg.classList.add('custom-bg');
        }
    }

    // ── Rank badge with dynamic color ──
    const rankBadge = document.getElementById('ppRankBadge');
    rankBadge.textContent = p.rank_name;
    const rc = getRankColor(p.rank_name);
    rankBadge.style.color = rc.color;
    rankBadge.style.background = rc.bg;
    rankBadge.style.borderColor = rc.border;

    // ── Identity ──
    document.getElementById('ppUsername').textContent = p.username;
    document.getElementById('ppDesc').textContent = p.description || '';
    document.getElementById('ppGlobalRank').textContent = `#${p.global_rank || '--'}`;

    // ── Languages ──
    const langsEl = document.getElementById('ppLangs');
    (p.languages || []).forEach(lang => {
        const icon = LANG_ICONS[lang];
        if (icon) {
            const img = document.createElement('img');
            img.src = icon; img.alt = lang; img.title = lang;
            img.className = 'pp-lang-icon';
            langsEl.appendChild(img);
        }
    });

    // ── Stats strip ──
    const elo      = p.elo || 0;
    const wins     = p.wins || 0;
    const matches  = p.matches_played || 0;
    const streak   = p.win_streak || 0;
    const solved   = p.solved_count || 0;

    document.getElementById('ppElo').textContent     = elo;
    document.getElementById('ppWins').textContent    = wins;
    document.getElementById('ppMatches').textContent = matches;
    document.getElementById('ppStreak').textContent  = streak;

    // ── Win rate donut ──
    const CIRC = 238.76; // 2π × 38
    const winRate = matches > 0 ? wins / matches : 0;
    const winPct  = Math.round(winRate * 100);
    const losses  = matches - wins;

    document.getElementById('ppWinPct').textContent    = `${winPct}%`;
    document.getElementById('ppWinLegend').textContent = `${wins}V · ${losses}D`;

    const arc = document.getElementById('ppWinArc');
    arc.style.stroke = rc.color;
    // Animate after paint
    requestAnimationFrame(() => {
        setTimeout(() => {
            arc.setAttribute('stroke-dasharray', `${winRate * CIRC} ${CIRC}`);
        }, 120);
    });

    // ── ELO progress bar ──
    const range = getRankRange(elo);
    const eloRangeSize = range.max === Infinity ? 1 : range.max - range.min + 1;
    const eloInRange   = range.max === Infinity ? 1 : elo - range.min;
    const eloPct       = range.max === Infinity ? 100 : Math.round((eloInRange / eloRangeSize) * 100);

    document.getElementById('ppEloRankCur').textContent  = range.name;
    document.getElementById('ppEloRankCur').style.color  = rc.color;
    document.getElementById('ppEloRankNext').textContent = range.next ? `→ ${range.next}` : '¡Rango Máximo!';
    document.getElementById('ppEloMin').textContent      = range.min;
    document.getElementById('ppEloMax').textContent      = range.max === Infinity ? '∞' : range.max;
    document.getElementById('ppEloValLabel').textContent = `${elo} ELO`;

    requestAnimationFrame(() => {
        setTimeout(() => {
            document.getElementById('ppEloBarFill').style.width = `${eloPct}%`;
        }, 120);
    });

    // ── Exercises bar ──
    document.getElementById('ppSolved').textContent = solved;
    const nextMilestone = EX_MILESTONES.find(m => m > solved) || null;
    const prevMilestone = [...EX_MILESTONES].reverse().find(m => m <= solved) || 0;
    let exPct;
    if (!nextMilestone) {
        exPct = 100;
    } else {
        const range_ = nextMilestone - prevMilestone;
        exPct = Math.round(((solved - prevMilestone) / range_) * 100);
    }
    document.getElementById('ppExMilestone').textContent = nextMilestone
        ? `próximo hito: ${nextMilestone}`
        : '¡Todos los hitos completados!';

    requestAnimationFrame(() => {
        setTimeout(() => {
            document.getElementById('ppExFill').style.width = `${exPct}%`;
        }, 120);
    });

    // ── Achievement showcase ──
    const badges = (p.equipped_achievements || []).slice(0, 3);
    if (badges.length > 0) {
        const section = document.getElementById('ppBadgesSection');
        const row     = document.getElementById('ppBadgesRow');
        section.style.display = '';

        row.innerHTML = badges.map(key => {
            const ach = ACHIEVEMENT_CATALOG[key];
            if (!ach) return '';
            const rarityLabels = {
                common: 'Común', uncommon: 'Poco Común', rare: 'Raro',
                epic: 'Épico', legendary: 'Legendario', ultimate: 'Último'
            };
            return `
                <div class="pp-badge-card ${ach.rarity}">
                    <div class="pp-badge-icon">${ach.icon}</div>
                    <div class="pp-badge-name">${ach.name}</div>
                    <div class="pp-badge-rarity">${rarityLabels[ach.rarity] || ach.rarity}</div>
                </div>
            `;
        }).join('');
    }

    // ── Show ──
    document.getElementById('ppLoading').style.display = 'none';
    document.getElementById('ppContent').style.display = 'flex';
}
