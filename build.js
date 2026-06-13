const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'public');

// src/pages filename → clean output filename (under public/)
const PAGE_MAP = {
  'index.html':               'index.html',
  'Login.html':               'login.html',
  'Register.html':            'register.html',
  'Home.html':                'home.html',
  'Configuracion.html':       'configuracion.html',
  'Exercises.html':           'ejercicios.html',
  'Friends.html':             'amigos.html',
  'Logros.html':              'logros.html',
  'Leaderboard.html':         'clasificacion.html',
  'Teams.html':               'equipos.html',
  'TeamView.html':            'equipo.html',
  'Tournaments.html':         'torneos.html',
  'TournamentLobby.html':    'torneos/sala.html',
  'Pricing.html':             'precios.html',
  'Tutorial.html':            'tutorial.html',
  'AdminPanel.html':          'admin.html',
  'CreateExercise.html':      'crear-ejercicio.html',
  'Verificacion.html':        'verificacion.html',
  'Onboarding.html':          'onboarding.html',
  'VsCpu.html':               'vs-cpu.html',
  'VsCpuBattle.html':         'vs-cpu/batalla.html',
  'Ranked.html':              'ranked.html',
  'RankedBattle.html':        'ranked/batalla.html',
  'TournamentHelp.html':      'torneos/ayuda.html',
  'FriendInvite.html':        'amigo.html',
  'TournamentBattle.html':    'torneos/batalla.html',
  'FriendlyBattle.html':      'friendly/batalla.html',
  'Supervivencia.html':       'supervivencia.html',
  'SupervivenciaBattle.html': 'supervivencia/batalla.html',
  'SupervivenciaLobby.html':  'supervivencia/lobby.html',
  'SolvePage.html':           'resolver.html',
  'ProfileView.html':         'perfil.html',
  'QuickLogin.html':          'quick-login.html',
  'Mobile.html':              'mobile.html',
  'MobileAuth.html':          'mobile/auth.html',
  'MobileApp.html':           'mobile/app.html',
  'InstallIOS.html':          'instalar-ios.html',
  'EditTeam.html':            'editar-club.html',
  'TournamentDetail.html':   'torneos/detalle.html',
};

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// PWA meta tags + SW registration injected into every HTML page
const PWA_TAGS = `
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Codexar">
    <meta name="theme-color" content="#07070f">
    <link rel="apple-touch-icon" href="/icons/icon-180.png">
    <link rel="manifest" href="/manifest.json">`;

const SW_SCRIPT = `
    <script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')});}</script>`;

// Clean output dir
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.mkdirSync(OUT);

// Copy assets, services and locales (needed by absolute /src/... paths in HTML)
copyDir(path.join(SRC, 'assets'), path.join(OUT, 'src', 'assets'));
copyDir(path.join(SRC, 'services'), path.join(OUT, 'src', 'services'));
copyDir(path.join(SRC, 'locales'), path.join(OUT, 'src', 'locales'));

// Copy static root files (manifest.json, sw.js, icons/, …)
copyDir(path.join(SRC, 'static'), OUT);

// Copy pages with clean names + inject PWA tags
for (const [srcFile, outFile] of Object.entries(PAGE_MAP)) {
  const srcPath = path.join(SRC, 'pages', srcFile);
  const outPath = path.join(OUT, outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let html = fs.readFileSync(srcPath, 'utf8');
  html = html.replace('</head>', PWA_TAGS + '\n</head>');
  html = html.replace('</body>', SW_SCRIPT + '\n</body>');
  fs.writeFileSync(outPath, html);

  console.log(`  ${srcFile} → ${outFile}`);
}

console.log('\nBuild done.');
