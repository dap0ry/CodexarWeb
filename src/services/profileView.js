const API_BASE = 'https://codexarapi.onrender.com/api';

const LANG_ICONS = {
    'Python': 'python',
    'C++':    'cplusplus',
    'Java':   'java',
    'Go':     'go',
    'C#':     'csharp',
};

const DIFF_CONFIG = [
    { key: 'Fácil',       label: 'Fácil',      cls: 'bar-facil'   },
    { key: 'Normal',      label: 'Normal',     cls: 'bar-normal'  },
    { key: 'Difícil',     label: 'Difícil',    cls: 'bar-dificil' },
    { key: 'Muy Difícil', label: 'Muy Dif.',   cls: 'bar-muydif'  },
    { key: 'Insane',      label: 'Insane',     cls: 'bar-insane'  },
    { key: 'Abyssal',     label: 'Abyssal',    cls: 'bar-abyssal' },
];

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Navbar ────────────────────────────────────────────────────
function populateNavbar(user) {
    document.getElementById('navUsername').textContent = user.username;
    const navAvatar = document.getElementById('navAvatar');
    if (user.avatar) {
        navAvatar.style.cssText = `background-image:url(${user.avatar});background-size:cover;background-position:center;border:1px solid var(--accent-cyan);`;
        navAvatar.textContent = '';
    } else {
        navAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
}

// ── Avatar element ────────────────────────────────────────────
function renderAvatar(el, username, avatar) {
    if (avatar) {
        el.style.backgroundImage   = `url(${avatar})`;
        el.style.backgroundSize    = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
    } else {
        el.textContent = (username || '?').charAt(0).toUpperCase();
    }
}

// ── Achievement cards ─────────────────────────────────────────
function renderAchievements(equipped) {
    for (let i = 0; i < 3; i++) {
        const el  = document.getElementById(`pvAch${i}`);
        const ach = equipped[i];
        el.className = 'pv-ach-card';

        if (!ach) {
            el.className += ' pv-ach-empty';
            el.innerHTML = '';
            continue;
        }

        el.innerHTML = `
            <span class="pv-ach-icon">${escHtml(ach.icon)}</span>
            <div class="pv-ach-info">
                <span class="pv-ach-title">${escHtml(ach.title)}</span>
                <span class="pv-ach-rarity rarity-${escHtml(ach.rarity)}">${escHtml(ach.rarity).toUpperCase()}</span>
            </div>
        `;
    }
}

// ── Language icons ────────────────────────────────────────────
function renderLangs(el, languages) {
    if (!languages?.length) return;
    el.innerHTML = languages.map(l => {
        const icon = LANG_ICONS[l];
        if (!icon) return '';
        return `<img class="pv-lang-icon" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${icon}/${icon}-original.svg" title="${escHtml(l)}" alt="${escHtml(l)}">`;
    }).join('');
}

const LANG_COLORS = {
    'Python': '#4d96ff',
    'C++':    '#9b5de5',
    'Java':   '#ff8c00',
    'Go':     '#00d4aa',
    'C#':     '#c77dff',
};

// ── Exercise difficulty chart ─────────────────────────────────
function renderChart(solved_by_diff, lang_stats, total) {
    const chartEl = document.getElementById('pvChart');
    const diffMax = Math.max(...Object.values(solved_by_diff), 1);

    chartEl.innerHTML = DIFF_CONFIG.map(({ key, label, cls }) => {
        const count = solved_by_diff[key] || 0;
        const pct   = Math.round((count / diffMax) * 100);
        return `
            <div class="pv-bar-row">
                <span class="pv-bar-label">${escHtml(label)}</span>
                <div class="pv-bar-track">
                    <div class="pv-bar-fill ${cls}" style="width:${pct}%"></div>
                </div>
                <span class="pv-bar-count">${count}</span>
            </div>
        `;
    }).join('');

    // ── Language segmented bar ────────────────────────────────
    const langTotal = Object.values(lang_stats || {}).reduce((a, b) => a + b, 0);
    const wrapEl    = document.getElementById('pvLangBarWrap');
    const barEl     = document.getElementById('pvLangBar');
    const legendEl  = document.getElementById('pvLangLegend');

    if (langTotal > 0) {
        wrapEl.classList.remove('hidden');

        // Segments
        barEl.innerHTML = Object.entries(lang_stats)
            .filter(([, v]) => v > 0)
            .map(([lang, count]) => {
                const pct   = (count / langTotal) * 100;
                const color = LANG_COLORS[lang] || '#888';
                return `<div class="pv-lang-segment" style="width:${pct}%;background:${color}" title="${escHtml(lang)}: ${Math.round(pct)}%"></div>`;
            }).join('');

        // Legend
        legendEl.innerHTML = Object.entries(lang_stats)
            .filter(([, v]) => v > 0)
            .map(([lang, count]) => {
                const pct   = Math.round(count / langTotal * 100);
                const color = LANG_COLORS[lang] || '#888';
                return `<span class="pv-lang-legend-item">
                    <span class="pv-lang-legend-dot" style="background:${color}"></span>
                    ${escHtml(lang)} ${pct}%
                </span>`;
            }).join('');
    } else {
        wrapEl.classList.add('hidden');
    }
}

// ── Stat row helper ───────────────────────────────────────────
function statRow(label, value, accentClass = '', fullRow = false) {
    return `
        <div class="pv-stat-row${fullRow ? ' full-row' : ''}">
            <span class="pv-stat-key">${escHtml(label)}</span>
            <span class="pv-stat-val ${accentClass}">${escHtml(String(value))}</span>
        </div>
    `;
}

// ── Ranked stats ──────────────────────────────────────────────
function renderRankedStats(data) {
    const el = document.getElementById('pvRankedStats');
    const wr = data.matches_played > 0 ? `${data.win_rate}%` : '--%';
    const hardest = data.hardest_exercise
        ? `${data.hardest_exercise.title.substring(0, 26)}${data.hardest_exercise.title.length > 26 ? '…' : ''}`
        : '—';

    el.innerHTML = [
        statRow('Rango actual',    data.rank_name,  'accent-cyan'),
        statRow('Rango máximo',    data.max_rank_name, ''),
        statRow('ELO actual',      data.elo,         ''),
        statRow('ELO máximo',      data.max_elo,     ''),
        statRow('Victorias',       data.wins,        'accent-green'),
        statRow('Win Rate',        wr,               data.matches_played > 0 ? 'accent-green' : 'accent-muted'),
        statRow('Ej. más difícil', hardest,          'accent-muted', true),
    ].join('');
}

// ── Bot stats ─────────────────────────────────────────────────
const BOT_DIFF_CONFIG = [
    { key: 'normal',    label: 'Normal',    color: 'rgba(80,220,100,0.8)'  },
    { key: 'dificil',   label: 'Difícil',   color: 'rgba(255,80,80,0.85)' },
    { key: 'demencial', label: 'Demencial', color: 'rgba(180,80,255,0.9)' },
];

function renderBotStats(data) {
    const el = document.getElementById('pvBotStats');
    const wr = data.bot_matches > 0 ? `${data.bot_winrate}%` : '--%';
    const wrClass = data.bot_matches > 0 ? 'accent-green' : 'accent-muted';

    const winsByDiff    = data.bot_wins_by_diff    || {};
    const matchesByDiff = data.bot_matches_by_diff || {};
    const maxWins = Math.max(...BOT_DIFF_CONFIG.map(d => winsByDiff[d.key] || 0), 1);

    const diffBars = BOT_DIFF_CONFIG.map(({ key, label, color }) => {
        const wins    = winsByDiff[key]    || 0;
        const matches = matchesByDiff[key] || 0;
        const pct     = Math.round((wins / maxWins) * 100);
        return `
            <div class="pvb-diff-row">
                <span class="pvb-diff-label">${escHtml(label)}</span>
                <div class="pvb-diff-track">
                    <div class="pvb-diff-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                <span class="pvb-diff-count">${wins}<span class="pvb-diff-of">/${matches}</span></span>
            </div>
        `;
    }).join('');

    el.innerHTML = `
        <div class="pvb-body">
            <div class="pvb-top-stats">
                <div class="pvb-stat">
                    <span class="pv-stat-key">Partidas</span>
                    <span class="pv-stat-val">${escHtml(String(data.bot_matches))}</span>
                </div>
                <div class="pvb-stat">
                    <span class="pv-stat-key">Victorias</span>
                    <span class="pv-stat-val accent-green">${escHtml(String(data.bot_wins))}</span>
                </div>
                <div class="pvb-stat">
                    <span class="pv-stat-key">Win Rate</span>
                    <span class="pv-stat-val ${wrClass}">${escHtml(wr)}</span>
                </div>
            </div>
            <div class="pvb-divider"></div>
            <div class="pvb-diff-bars">${diffBars}</div>
        </div>
    `;
}

// ── Survival stats ────────────────────────────────────────────
const SURVIVAL_DIFF_CONFIG = [
    { key: 'normal',    label: 'Normal',    color: 'rgba(57,255,20,0.8)'   },
    { key: 'dificil',   label: 'Difícil',   color: 'rgba(255,80,80,0.85)' },
    { key: 'demencial', label: 'Demencial', color: 'rgba(180,80,255,0.9)' },
];

function renderSurvivalStats(data) {
    const el = document.getElementById('pvSurvivalStats');
    if (!el) return;
    const stats = data.survival_stats || {};
    const maxVal = Math.max(...SURVIVAL_DIFF_CONFIG.map(d => (stats[d.key]?.max_exercises || 0)), 1);

    const diffBars = SURVIVAL_DIFF_CONFIG.map(({ key, label, color }) => {
        const max = stats[key]?.max_exercises || 0;
        const pct = Math.round((max / maxVal) * 100);
        return `
            <div class="pvb-diff-row">
                <span class="pvb-diff-label">${escHtml(label)}</span>
                <div class="pvb-diff-track">
                    <div class="pvb-diff-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                <span class="pvb-diff-count">${max}<span class="pvb-diff-of"> ej.</span></span>
            </div>
        `;
    }).join('');

    el.innerHTML = `<div class="pvb-body"><div class="pvb-diff-bars">${diffBars}</div></div>`;
}

// ── Social links ──────────────────────────────────────────────
const SOCIAL_CONFIG = [
    { key: 'github',     icon: 'https://cdn.simpleicons.org/github',     label: 'GitHub'     },
    { key: 'linkedin',   icon: 'https://cdn.simpleicons.org/linkedin',   label: 'LinkedIn'   },
    { key: 'codeforces', icon: 'https://cdn.simpleicons.org/codeforces', label: 'Codeforces' },
    { key: 'instagram',  icon: 'https://cdn.simpleicons.org/instagram',  label: 'Instagram'  },
    { key: 'tiktok',     icon: 'https://cdn.simpleicons.org/tiktok',     label: 'TikTok'     },
];

function renderSocials(socialLinks) {
    const el = document.getElementById('pvSocials');
    const links = socialLinks || {};
    const active = SOCIAL_CONFIG.filter(s => links[s.key]);
    if (!active.length) return;

    el.innerHTML = active.map(s => `
        <a href="${escHtml(links[s.key])}" target="_blank" rel="noopener noreferrer"
           class="pv-social-link" title="${escHtml(s.label)}">
            <img src="${s.icon}" alt="${escHtml(s.label)}" class="pv-social-icon">
        </a>
    `).join('');

    el.classList.remove('hidden');
}

// ── Friend button ─────────────────────────────────────────────
function setupFriendBtn(status, username) {
    const btn = document.getElementById('pvFriendBtn');
    if (status.is_self) return;

    btn.classList.remove('hidden');

    if (status.is_friend) {
        btn.textContent = 'Amigo ✓';
        btn.classList.add('friend-active');
        btn.disabled = true;
        return;
    }

    if (status.request_sent) {
        btn.textContent = 'Solicitud enviada';
        btn.disabled = true;
        return;
    }

    if (status.request_received) {
        btn.textContent = 'Aceptar solicitud';
        btn.classList.add('request-received');
        btn.addEventListener('click', async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch(`${API_BASE}/friends/accept/${encodeURIComponent(username)}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    btn.textContent = 'Amigo ✓';
                    btn.classList.remove('request-received');
                    btn.classList.add('friend-active');
                    btn.disabled = true;
                }
            } catch { /* silent */ }
        });
        return;
    }

    // Default: add friend
    btn.textContent = 'Añadir amigo';
    btn.addEventListener('click', async () => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_BASE}/friends/request/${encodeURIComponent(username)}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                btn.textContent = 'Solicitud enviada';
                btn.disabled = true;
            }
        } catch { /* silent */ }
    });
}

// ── Main render ───────────────────────────────────────────────
function renderProfile(data) {
    const username = data.username;

    document.title = `Codexar — ${username}`;

    // Full-page background wallpaper
    if (data.profile_background) {
        const overlay = document.getElementById('pvBgOverlay');
        overlay.classList.remove('hidden');
        if (data.profile_background.includes('.mp4') || data.profile_background.includes('video')) {
            overlay.style.backgroundImage = 'none';
            const vid = document.createElement('video');
            vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
            vid.src = data.profile_background;
            vid.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;';
            document.body.insertBefore(vid, document.body.firstChild);
        } else {
            overlay.style.backgroundImage = `url(${data.profile_background})`;
        }
    }

    // Top banner strip
    if (data.profile_banner) {
        const banner = document.getElementById('pvBanner');
        banner.style.backgroundImage = `url(${data.profile_banner})`;
        banner.classList.remove('hidden');
    }

    // Avatar
    renderAvatar(document.getElementById('pvAvatar'), username, data.avatar);

    // Achievements
    renderAchievements(data.equipped_achievements || []);

    // Identity
    document.getElementById('pvUsername').textContent = username;
    document.getElementById('pvDesc').textContent     = data.description || '';
    renderLangs(document.getElementById('pvLangs'), data.languages);

    // Global rank
    const rankEl = document.getElementById('pvGlobalRank');
    if (rankEl && data.global_rank) {
        rankEl.innerHTML = `Posición global: <strong>#${data.global_rank}</strong>`;
        rankEl.classList.remove('hidden');
    }

    // Role badge (moderator / admin) + subscription badge (plus / max)
    const roleBadge = document.getElementById('pvRoleBadge');
    const subBadge  = document.getElementById('pvSubBadge');
    if (roleBadge) {
        const role = data.role || 'user';
        if (role === 'moderator') {
            roleBadge.textContent = 'MOD';
            roleBadge.className = 'pv-role-badge pv-role-moderator';
        } else if (role === 'admin') {
            roleBadge.textContent = 'ADMIN';
            roleBadge.className = 'pv-role-badge pv-role-admin';
        } else {
            roleBadge.className = 'pv-role-badge hidden';
        }
    }
    if (subBadge) {
        const plan = data.subscription_plan;
        if (plan === 'max') {
            subBadge.textContent = '◆ MAX';
            subBadge.className = 'pv-role-badge pv-sub-max';
        } else if (plan === 'plus' || plan === 'plus_boosted') {
            subBadge.textContent = '▲ PLUS';
            subBadge.className = 'pv-role-badge pv-sub-plus';
        } else {
            subBadge.className = 'pv-role-badge hidden';
        }
    }

    // Social links
    renderSocials(data.social_links);

    // Friend button
    setupFriendBtn(data.friendship_status, username);

    // Exercise stats
    document.getElementById('pvExTotal').textContent = data.solved_count;
    renderChart(data.solved_by_difficulty || {}, data.lang_stats || {}, data.solved_count);

    // Stat cards
    renderRankedStats(data);
    renderBotStats(data);
    renderSurvivalStats(data);

    // Show content
    document.getElementById('pvLoading').classList.add('hidden');
    document.getElementById('pvContent').classList.remove('hidden');
}

// ── Apply saved box style ─────────────────────────────────────
(function () {
    const style = localStorage.getItem('codexar_box_style') || 'solid';
    const opacity = style === 'transparent' ? 0 : style === 'semi' ? 0.8 : 1;
    document.documentElement.style.setProperty('--pv-box-opacity', opacity);
})();

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'Login.html'; return; }

    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = 'Login.html';
    });

    const username = new URLSearchParams(location.search).get('u');
    if (!username) {
        showError('No se especificó ningún usuario.');
        return;
    }

    try {
        const [meRes, profileRes] = await Promise.all([
            fetch(`${API_BASE}/user/me`,                     { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE}/user/profile/${encodeURIComponent(username)}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!meRes.ok) { window.location.href = 'Login.html'; return; }

        const me = await meRes.json();
        populateNavbar(me);

        if (!profileRes.ok) {
            showError(profileRes.status === 404 ? 'Usuario no encontrado.' : 'Error cargando el perfil.');
            return;
        }

        const profile = await profileRes.json();
        renderProfile(profile);

    } catch {
        showError('Error de conexión con el servidor.');
    }
});

function showError(msg) {
    document.getElementById('pvLoading').classList.add('hidden');
    document.getElementById('pvErrorMsg').textContent = msg;
    document.getElementById('pvError').classList.remove('hidden');
}
