# CodexarWeb — Frontend Context

## Tech
Vanilla HTML5 / CSS3 / JavaScript — **no framework, no build step**.
Deployed on Vercel. Root redirects to `/src/pages/index.html` (see `vercel.json`).
API base: `https://codexarapi.onrender.com/api` (hardcoded in every service file).
WS base: `wss://codexarapi.onrender.com/api` (used in matchmakingGlobal.js, supervivenciaLobby.js).
Auth token stored in `localStorage` as `access_token`.

## Directory map
```
src/
├── pages/          ~27 HTML pages (each is a standalone route)
├── services/       ~32 JS modules (one per feature area)
└── assets/css/     ~27 CSS files (global.css + themes.css + one per page)
```

## Pages
| File                    | Purpose                                              |
|-------------------------|------------------------------------------------------|
| index.html              | Landing — hero, carousel, stat counters, CTA        |
| Login.html              | Login form                                          |
| Register.html           | Register form                                       |
| QuickLogin.html         | Quick login/register modal flow                     |
| Onboarding.html         | First-time setup: username, languages, level, bio   |
| Verificacion.html       | Email/account verification flow                     |
| Home.html               | Dashboard — quick actions, news feed, widgets       |
| Exercises.html          | Exercise browser with filters (category/diff)       |
| SolvePage.html          | Code editor + test console                          |
| Profile.html            | Own profile: stats, avatar upload, edit             |
| ProfileView.html        | Public profile view of other users                  |
| Friends.html            | Friend list, requests, search, activity             |
| Leaderboard.html        | Global top-100 ranking table                        |
| Ranked.html             | Ranked queue waiting screen                         |
| RankedBattle.html       | Live ranked PvP battle UI                           |
| FriendlyBattle.html     | Friendly (unranked) PvP battle UI (renamed from UnrankedBattle) |
| Supervivencia.html      | Survival mode lobby/menu                            |
| SupervivenciaLobby.html | Survival room lobby (waiting for players)           |
| SupervivenciaBattle.html| Survival game (co-op coding battle)                 |
| VsCpu.html              | vs CPU mode selector                                |
| VsCpuBattle.html        | vs CPU battle UI                                    |
| Teams.html              | Team browser + my team management                   |
| Tournaments.html        | Tournament list + registration                      |
| Tutorial.html           | Onboarding tutorial / guide                         |
| Logros.html             | Achievements page                                   |
| Tema.html               | Theme selector page                                 |
| AdminPanel.html         | Admin panel (ban, roles, manage users)              |
| CreateExercise.html     | Create/submit new exercise (moderator+)             |

## Services (JS modules)
| File                       | Responsibility                                             |
|----------------------------|------------------------------------------------------------|
| auth.js                    | login/register API calls, token save, redirects           |
| quickLogin.js              | Quick login modal flow                                     |
| onboarding.js              | POST /user/onboard                                        |
| verificacion.js            | Account verification                                      |
| homeDashboard.js           | GET /user/me → render dashboard, news feed                |
| exercises.js               | GET /exercises, filter/search UI                          |
| solveExercise.js           | GET exercise detail, POST /exercises/{id}/solve           |
| profile.js                 | Own profile: GET /user/me, POST /user/profile/update      |
| profileView.js             | Public profile: GET /user/profile/{username}              |
| friends.js                 | All /friends/* endpoints + friend notifications           |
| friendlyNotifications.js   | Friendly match invite notifications                       |
| leaderboard.js             | GET leaderboard data, pagination                          |
| ranked.js                  | POST /matchmaking/join (ranked), queue waiting UI         |
| rankedBattle.js            | Long-poll /match/{id}/poll, submit results                |
| friendlyBattle.js          | Friendly PvP battle UI (was unrankedBattle.js)            |
| matchmakingGlobal.js       | Persistent MM state across pages via localStorage + WS    |
| supervivencia.js           | Survival mode menu/selector                               |
| supervivenciaLobby.js      | Survival room lobby via WebSocket                         |
| supervivenciaBattle.js     | Survival game: WS messages, code editor, timer            |
| survivalNotifications.js   | Survival invite notifications                             |
| vsCpu.js                   | vs CPU difficulty selector                                |
| vsCpuBattle.js             | vs CPU battle UI (bot opponent)                           |
| teams.js                   | Teams CRUD, invite/accept/decline/kick                    |
| tournaments.js             | Tournament list, register, submit-solve                   |
| logros.js                  | Achievements catalog, equip/unequip                       |
| tema.js                    | Theme selector page logic                                 |
| themeService.js            | Must load FIRST (sync, no defer): sets data-theme on <html> |
| roleNav.js                 | Injects moderator/admin nav links dynamically             |
| adminPanel.js              | Admin panel: list users, ban/unban, set-role              |
| createExercise.js          | Create exercise form (moderator+)                        |
| index.js                   | Landing page: canvas animation, carousel                  |
| globalBg.js                | Shared animated canvas background (dot grid)             |
| authBg.js                  | Background for Login/Register pages                       |

## Auth pattern (used in every service)
```javascript
const token = localStorage.getItem('access_token');
// No token → redirect to Login
const res = await fetch(`${API_BASE}/...`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
// 401 → clear token, redirect to Login
```

## Theme system
`themeService.js` must be the FIRST script in `<head>` (synchronous) to avoid FOUC.
Supported themes: `dark` · `dracula` · `nord` · `matrix` · `focus` · `zen` (alias: `light`)
Stored in `localStorage` as `codexar_theme`. Applied as `data-theme` attribute on `<html>`.
All CSS variables defined per-theme in `themes.css`.

## Styling system
**`global.css`** defines the shared design tokens (dark mode defaults):
```css
--accent-cyan:  #00ffcc   /* primary neon highlight */
--accent-green: #39ff14   /* secondary neon */
--bg-dark:      #0a0a0e   /* page background */
--bg-card:      #13131a   /* card/panel background */
--font-mono:    'JetBrains Mono', monospace
--text-light:   #e8e8f0
--glow-cyan:    rgba(0, 255, 204, 0.12)
```
Aesthetic: **cyberpunk / dark mode** with neon glows, mono font, glassmorphism cards.
Each page imports its own `<PageName>.css` on top of `global.css`.

## Global matchmaking bar (matchmakingGlobal.js)
Persists across page navigations using `localStorage` key `codexar_mm`.
Uses WebSocket (`wss://...`) for real-time queue state.
Exposes: `startMatchmaking(mode)`, `cancelMatchmaking()`, `isMatchmakingActive()`, `showCancelConfirmModal()`.

## Survival mode flow
1. `Supervivencia.html` — pick difficulty, create room (POST /api/survival/room), invite friends
2. `SupervivenciaLobby.html` — WS connection, wait for host to start
3. `SupervivenciaBattle.html` — shared co-op coding: `submit`, `code_sync`, `lang_sync`, `abandon` WS actions
4. On game over → shows score + personal record via `game_over` WS message

## Role-based navigation
`roleNav.js` (included in all pages with navbar) calls `/api/user/me` and injects:
- Moderator or Admin → "Crear Ejercicio" link
- Admin only → "Panel Admin" link

## Real-time battle flow (rankedBattle.js / friendlyBattle.js)
1. Page loads with `?match_id=<uuid>` query param
2. Long-polls `GET /api/matchmaking/match/{id}/poll` (25s timeout)
3. Renders opponent info, shared exercise, timer
4. User submits code → `POST /api/exercises/{id}/solve` (local test run)
5. Submits results → `POST /api/matchmaking/match/{id}/submit`
6. Polls for winner → shows victory/defeat screen with ELO delta

## Navigation / redirect rules
- Not logged in → always redirect to `Login.html`
- Logged in, not onboarded → redirect to `Onboarding.html`
- Logged in + onboarded → `Home.html` is the main hub

## Deployment
- Platform: Vercel (static)
- `vercel.json`: redirects `/` → `/src/pages/index.html`
- No build process; files are served as-is
