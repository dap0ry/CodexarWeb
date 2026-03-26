# Codexar Web

Frontend de **Codexar** — plataforma de programación competitiva.

**Stack:** HTML5 · CSS3 · Vanilla JavaScript (sin framework, sin build step)
**Despliegue:** Vercel — root redirige a `/src/pages/index.html`
**API:** `http://localhost:8000/api` (local) · `https://codexarapi.onrender.com/api` (producción)

> Los archivos de producción están en el repo con la URL de Render. Para desarrollo local todos los services apuntan a `localhost:8000`.

---

## Estado del proyecto

### Implementado
- [x] Landing page con animaciones canvas, carousel y contadores
- [x] Login y Register
- [x] **Verificación de email** (página nueva: `Verificacion.html`)
  - 6 cajas OTP con auto-advance y paste support
  - Countdown 5 minutos (se pone rojo al minuto)
  - Botón reenviar con cooldown de 60 segundos
- [x] Onboarding (username, lenguajes, nivel, avatar, descripción)
- [x] Dashboard principal (Home)
- [x] Lista de ejercicios con filtros (categoría, dificultad)
- [x] Editor de código + consola de tests (SolvePage)
- [x] Perfil de usuario (stats, editar, avatar upload)
- [x] Amigos (lista, solicitudes, búsqueda)
- [x] Leaderboard global
- [x] Cola ranked + batalla ranked en tiempo real
- [x] Cola unranked + batalla unranked
- [x] Story mode (estructura base)

### Pendiente / Por hacer
- [ ] Story mode completo (capítulos, progresión)
- [ ] Achievements/logros
- [ ] Tienda
- [ ] Notificaciones en tiempo real
- [ ] PWA / mobile optimization

---

## Estructura de archivos

```
src/
├── pages/                   (15 páginas HTML independientes)
│   ├── index.html           Landing page
│   ├── Login.html
│   ├── Register.html
│   ├── Verificacion.html    ← NUEVO: verificación email por OTP
│   ├── Onboarding.html      Primera configuración de perfil
│   ├── Home.html            Dashboard
│   ├── Exercises.html       Lista de ejercicios
│   ├── SolvePage.html       Editor de código + tests
│   ├── Profile.html
│   ├── Friends.html
│   ├── Leaderboard.html
│   ├── Ranked.html          Cola ranked
│   ├── RankedBattle.html    Batalla ranked en curso
│   ├── Unranked.html        Cola casual
│   ├── UnrankedBattle.html  Batalla casual en curso
│   └── StoryMode.html
│
├── services/                (16 módulos JS, uno por feature)
│   ├── auth.js              Login + Register → redirige a Verificacion.html
│   ├── verificacion.js      ← NUEVO: OTP, countdown, resend cooldown
│   ├── onboarding.js
│   ├── homeDashboard.js
│   ├── exercises.js
│   ├── solveExercise.js
│   ├── profile.js
│   ├── friends.js
│   ├── leaderboard.js
│   ├── ranked.js
│   ├── rankedBattle.js
│   ├── unranked.js
│   ├── unrankedBattle.js
│   ├── storyMode.js
│   ├── globalBg.js          Canvas animado compartido (dot grid)
│   └── authBg.js            Canvas para páginas de auth
│
└── assets/css/              (16 archivos CSS)
    ├── global.css           Tokens de diseño compartidos
    ├── Auth.css             Login, Register, Verificacion (base compartida)
    ├── Verificacion.css     ← NUEVO: OTP boxes, timer, resend btn
    ├── index.css
    ├── Home.css
    ├── Exercises.css
    ├── SolvePage.css
    ├── Profile.css
    ├── Friends.css
    ├── Leaderboard.css
    ├── Ranked.css
    ├── RankedBattle.css
    ├── Unranked.css
    ├── UnrankedBattle.css
    ├── BattlePage.css
    └── Onboarding.css
```

---

## Flujo de navegación

```
index.html
    ↓
Register.html → POST /api/auth/register
    ↓ (código enviado al email)
Verificacion.html → POST /api/auth/verify-email
    ↓ (JWT guardado en localStorage)
Onboarding.html → POST /api/user/onboard
    ↓
Home.html  ←──────────────────── Login.html (usuarios existentes)
    ├── Exercises.html → SolvePage.html
    ├── Profile.html
    ├── Friends.html
    ├── Leaderboard.html
    ├── Ranked.html → RankedBattle.html
    ├── Unranked.html → UnrankedBattle.html
    └── StoryMode.html
```

**Reglas de redirección:**
- Sin token → siempre a `Login.html`
- Token + `is_onboarded: false` → `Onboarding.html`
- Token + onboarded → acceso normal

---

## Sistema de diseño

**Tema:** Cyberpunk oscuro con neón cian/verde

```css
/* global.css — tokens principales */
--accent-cyan:  #00ffcc    /* acento principal */
--accent-green: #39ff14    /* acento secundario */
--bg-dark:      #0a0a0e    /* fondo de página */
--bg-card:      #13131a    /* fondo de cards */
--font-mono:    'JetBrains Mono', monospace
--text-light:   #e8e8f0
--glow-cyan:    rgba(0, 255, 204, 0.12)
```

**Efectos recurrentes:**
- Glassmorphism en cards (`backdrop-filter: blur`)
- Canvas animado con dot grid en todas las páginas de auth
- Fragmentos de código flotantes con animación en auth pages
- Línea de acento cian en la parte superior de las cards
- Botones con efecto de brillo deslizante en hover

---

## Patrón de autenticación (usado en todos los services)

```javascript
const token = localStorage.getItem('access_token');
if (!token) { window.location.href = 'Login.html'; return; }

const res = await fetch(`${API_BASE}/endpoint`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
if (res.status === 401) { localStorage.clear(); window.location.href = 'Login.html'; }
```

**Verificación de email (flujo específico):**
```javascript
// Register → guarda email temporalmente
sessionStorage.setItem('pending_email', email);
window.location.href = 'Verificacion.html';

// Verificacion → al verificar, guarda el JWT real
localStorage.setItem('access_token', data.access_token);
sessionStorage.removeItem('pending_email');
window.location.href = 'Onboarding.html';
```

---

## Arrancar en local

No hay build. Puedes servir los archivos con cualquier servidor estático:

```bash
# Opción 1: extensión Live Server de VS Code (recomendado)
# Opción 2: Python
cd CodexarWeb
python -m http.server 5500
# Accede a http://localhost:5500/src/pages/index.html
```

> Asegúrate de que la API local esté corriendo en `http://localhost:8000` antes de probar.

---

## Cambiar entre entornos

Todos los services tienen la URL hardcodeada en la primera línea. Para cambiar entre local y producción:

| Entorno | URL |
|---------|-----|
| Local | `http://localhost:8000/api` |
| Producción | `https://codexarapi.onrender.com/api` |

En el futuro se podría centralizar en un `config.js` global.

---

## Notas importantes

- **`auth.js`** maneja tanto login como register (detecta qué formulario existe en el DOM).
- **`Verificacion.html`** usa `sessionStorage` para el email pendiente (no localStorage) — se limpia automáticamente al cerrar la pestaña.
- **`authBg.js`** y **`globalBg.js`** son scripts de canvas compartidos — deben cargarse antes que el service específico de la página.
- El `vercel.json` solo tiene una regla de redirect: `/` → `/src/pages/index.html`.
