# CodexarWeb — Frontend Context

## Tech
Vanilla HTML5 / CSS3 / JavaScript — **no framework, no build step**.
Deployed on Vercel. Root redirects to `/src/pages/index.html` (see `vercel.json`).
API base: `https://codexarapi.onrender.com/api` (hardcoded in every service file).
Auth token stored in `localStorage` as `access_token`.

## Directory map
```
src/
├── pages/          15 HTML pages (each is a standalone route)
├── services/       16 JS modules (one per feature area)
└── assets/css/     15 CSS files (global.css + one per page)
```

## Pages
| File                 | Route / Purpose                                 |
|----------------------|-------------------------------------------------|
| index.html           | Landing — hero, carousel, stat counters, CTA   |
| Login.html           | Login form                                      |
| Register.html        | Register form                                   |
| Onboarding.html      | First-time setup: username, languages, bio      |
| Home.html            | Dashboard — quick actions, summary widgets      |
| Exercises.html       | Exercise browser with filters (category/diff)  |
| SolvePage.html       | Code editor + test console                      |
| Profile.html         | User stats, avatar upload, edit profile         |
| Friends.html         | Friend list, requests, search                   |
| Leaderboard.html     | Global top-100 ranking table                    |
| Ranked.html          | Ranked queue waiting screen                     |
| RankedBattle.html    | Live ranked PvP battle UI                       |
| Unranked.html        | Casual queue waiting screen                     |
| UnrankedBattle.html  | Live unranked PvP battle UI                     |
| StoryMode.html       | Campaign/story missions                         |

## Services (JS modules)
| File                 | Responsibility                                   |
|----------------------|--------------------------------------------------|
| auth.js              | login/register API calls, token save, redirects |
| onboarding.js        | POST /user/onboard                              |
| homeDashboard.js     | GET /user/me → render dashboard widgets         |
| exercises.js         | GET /exercises, filter/search UI                |
| solveExercise.js     | GET exercise detail, POST /exercises/{id}/solve |
| profile.js           | GET /user/me, POST /user/profile/update, avatar |
| friends.js           | All /friends/* endpoints                        |
| leaderboard.js       | GET leaderboard data, pagination                |
| ranked.js            | POST /matchmaking/join, queue waiting UI        |
| rankedBattle.js      | Long-poll /match/{id}/poll, submit results      |
| unranked.js          | Casual queue logic                              |
| unrankedBattle.js    | Casual battle UI                                |
| storyMode.js         | Campaign mode                                   |
| index.js             | Landing page: canvas animation, carousel        |
| globalBg.js          | Shared animated canvas background (dot grid)   |
| authBg.js            | Background for Login/Register pages             |

## Auth pattern (used in every service)
```javascript
const token = localStorage.getItem('access_token');
// No token → redirect to Login
const res = await fetch(`${API_BASE}/...`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
// 401 → clear token, redirect to Login
```

## Styling system
**`global.css`** defines the shared design tokens:
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

## Real-time battle flow (rankedBattle.js)
1. Page loads with `?match_id=<uuid>` query param
2. Long-polls `GET /api/matchmaking/match/{id}/poll` (25 s server timeout)
3. Renders opponent info, shared exercise, timer
4. User submits code → `POST /api/exercises/{id}/solve` (local test run)
5. Submits results → `POST /api/matchmaking/match/{id}/submit`
6. Polls for winner → shows victory/defeat screen with ELO delta

## Navigation / redirect rules
- Not logged in → always redirect to `Login.html`
- Logged in, not onboarded (`is_onboarded === false`) → redirect to `Onboarding.html`
- Logged in + onboarded → `Home.html` is the main hub

## Deployment
- Platform: Vercel (static)
- `vercel.json`: redirects `/` → `/src/pages/index.html`
- No build process; files are served as-is
