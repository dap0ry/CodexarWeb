const API_BASE = 'https://api.codexar.es/api';

const LANG_ICONS = {
    'Python': 'python',
    'C++':    'cplusplus',
    'Java':   'java',
    'Go':     'go',
    'C#':     'csharp',
};

const DIFF_CONFIG = [
    { key: 'Fácil',       label: '800 – 1200',  cls: 'bar-facil'   },
    { key: 'Normal',      label: '1200 – 1800', cls: 'bar-normal'  },
    { key: 'Difícil',     label: '1800 – 2400', cls: 'bar-dificil' },
    { key: 'Muy Difícil', label: '2400 – 3000', cls: 'bar-muydif'  },
    { key: 'Insane',      label: '3000 – 3500', cls: 'bar-insane'  },
    { key: 'Abyssal',     label: '3500+',       cls: 'bar-abyssal' },
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
        const pct   = count > 0 ? Math.max(Math.round((count / diffMax) * 100), 4) : 0;
        return `
            <div class="pv-bar-row">
                <span class="pv-bar-label">${escHtml(label)}</span>
                <div class="pv-bar-track">
                    <div class="pv-bar-fill ${cls}" style="width:${pct}%"></div>
                </div>
                <span class="pv-bar-count${count > 0 ? ' pv-bar-count-active' : ''}">${count}</span>
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

    const diffCols = BOT_DIFF_CONFIG.map(({ key, label }) => {
        const wins    = winsByDiff[key]    || 0;
        const matches = matchesByDiff[key] || 0;
        const cls     = wins > 0 ? 'accent-green' : (matches > 0 ? '' : 'accent-muted');
        return `
            <div class="pvb-stat">
                <span class="pv-stat-key">${escHtml(label)}</span>
                <span class="pv-stat-val ${cls}">${wins}/${matches}</span>
            </div>
        `;
    }).join('');

    el.innerHTML = `
        <div class="pvt-body">
            <div>
                <div class="pvt-section-label">Resumen</div>
                <div class="pvt-stats-row">
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
            </div>
            <div class="pvt-divider"></div>
            <div>
                <div class="pvt-section-label">Por dificultad</div>
                <div class="pvt-stats-row pvb-diff-cols">
                    ${diffCols}
                </div>
            </div>
        </div>
    `;
}

// ── Survival stats ────────────────────────────────────────────
function renderSurvivalStats(data) {
    const el = document.getElementById('pvSurvivalStats');
    if (!el) return;
    const sv   = data.survival_stats?.survival || {};
    const solo = { games: sv.solo_games || 0, maxEx: sv.solo_max_exercises || 0, maxT: sv.solo_max_time_survived || 0 };
    const coop = { games: sv.coop_games || 0, maxEx: sv.coop_max_exercises || 0, maxT: sv.coop_max_time_survived || 0 };

    function fmtT(s) {
        if (!s) return '—';
        const m = Math.floor(s / 60);
        const sc = s % 60;
        return `${m}:${String(sc).padStart(2, '0')}`;
    }

    function section(label, d) {
        const tC  = d.maxT  > 0 ? 'accent-green' : 'accent-muted';
        const exC = d.maxEx > 0 ? 'accent-green' : 'accent-muted';
        return `
            <div>
                <div class="pvt-section-label">${label}</div>
                <div class="pvt-stats-row">
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Partidas</span>
                        <span class="pv-stat-val">${d.games}</span>
                    </div>
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Tiempo</span>
                        <span class="pv-stat-val ${tC}">${fmtT(d.maxT)}</span>
                    </div>
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Ejercs.</span>
                        <span class="pv-stat-val ${exC}">${d.maxEx || '—'}</span>
                    </div>
                </div>
            </div>`;
    }

    el.innerHTML = `
        <div class="pvt-body">
            ${section('SOLO', solo)}
            <div class="pvt-divider"></div>
            ${section('COOPERATIVO', coop)}
        </div>
    `;
}

// ── Tournament stats ──────────────────────────────────────────
function renderTournamentStats(data) {
    const el = document.getElementById('pvTournamentStats');
    if (!el) return;

    const played  = data.tournaments_joined      || 0;
    const wins    = data.tournament_wins         || 0;
    const winrate = data.tournament_winrate      || 0;
    const mWins   = data.tournament_match_wins   || 0;
    const mLosses = data.tournament_match_losses || 0;
    const mTotal  = mWins + mLosses;
    const mWR     = mTotal > 0 ? Math.round(mWins / mTotal * 100) : 0;

    const trClass = played > 0 ? 'accent-blue' : 'accent-muted';
    const mrClass = mTotal > 0 ? 'accent-blue' : 'accent-muted';

    el.innerHTML = `
        <div class="pvt-body">
            <div>
                <div class="pvt-section-label">Torneos</div>
                <div class="pvt-stats-row">
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Jugados</span>
                        <span class="pv-stat-val">${escHtml(String(played))}</span>
                    </div>
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Ganados</span>
                        <span class="pv-stat-val accent-blue">${escHtml(String(wins))}</span>
                    </div>
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Win Rate</span>
                        <span class="pv-stat-val ${trClass}">${played > 0 ? winrate + '%' : '--%'}</span>
                    </div>
                </div>
            </div>
            <div class="pvt-divider"></div>
            <div>
                <div class="pvt-section-label">Partidas</div>
                <div class="pvt-stats-row">
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Total</span>
                        <span class="pv-stat-val">${escHtml(String(mTotal))}</span>
                    </div>
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Victorias</span>
                        <span class="pv-stat-val accent-blue">${escHtml(String(mWins))}</span>
                    </div>
                    <div class="pvb-stat">
                        <span class="pv-stat-key">Derrotas</span>
                        <span class="pv-stat-val accent-muted">${escHtml(String(mLosses))}</span>
                    </div>
                </div>
            </div>
            <div class="pvt-divider"></div>
            <div class="pvt-stats-row">
                <div class="pvb-stat">
                    <span class="pv-stat-key">WR partidas</span>
                    <span class="pv-stat-val ${mrClass}">${mTotal > 0 ? mWR + '%' : '--%'}</span>
                </div>
            </div>
        </div>
    `;
}

// ── Social links ──────────────────────────────────────────────
const LINKEDIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="15" height="15"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.14-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg>`;

const SOCIAL_CONFIG = [
    { key: 'github',     icon: 'https://cdn.simpleicons.org/github/ffffff',     label: 'GitHub'     },
    { key: 'linkedin',   icon: null,                                             label: 'LinkedIn'   },
    { key: 'codeforces', icon: 'https://cdn.simpleicons.org/codeforces/ffffff', label: 'Codeforces' },
    { key: 'instagram',  icon: 'https://cdn.simpleicons.org/instagram/ffffff',  label: 'Instagram'  },
    { key: 'tiktok',     icon: 'https://cdn.simpleicons.org/tiktok/ffffff',     label: 'TikTok'     },
];

function renderSocials(socialLinks) {
    const el = document.getElementById('pvSocials');
    const links = socialLinks || {};
    const active = SOCIAL_CONFIG.filter(s => links[s.key]);
    if (!active.length) return;

    el.innerHTML = active.map(s => `
        <a href="${escHtml(links[s.key])}" target="_blank" rel="noopener noreferrer"
           class="pv-social-link" title="${escHtml(s.label)}">
            ${s.icon
                ? `<img src="${s.icon}" alt="${escHtml(s.label)}" class="pv-social-icon">`
                : `<span class="pv-social-icon" style="opacity:0.55;display:flex;align-items:center;justify-content:center;">${LINKEDIN_SVG}</span>`
            }
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
    renderTournamentStats(data);

    // Apply owner's visual settings
    applyProfileSettings(data.profile_settings);

    // Show content
    document.getElementById('pvLoading').classList.add('hidden');
    document.getElementById('pvContent').classList.remove('hidden');
}

// ── Apply profile owner's display settings ────────────────────
function applyProfileSettings(settings) {
    const s      = settings || {};
    const style  = s.box_style  || 'solid';
    const bgVis  = s.bg_vis     || 'dim';
    const banVis = s.banner_vis || 'dim';

    const boxOpacity = style  === 'transparent' ? 0 : style  === 'semi' ? 0.8 : 1;
    const bgDim      = bgVis  === 'full' ? 0    : bgVis  === 'mid' ? 0.5 : 1;
    const bannerDim  = banVis === 'full' ? 0    : banVis === 'mid' ? 0.5 : 1;

    const root = document.documentElement;
    root.style.setProperty('--pv-box-opacity', boxOpacity);
    root.style.setProperty('--pv-bg-dim',      bgDim);
    root.style.setProperty('--pv-banner-dim',  bannerDim);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }

    document.getElementById('logoutBtn').addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        window.location.href = '/login';
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

        if (!meRes.ok) { window.location.href = '/login'; return; }

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
