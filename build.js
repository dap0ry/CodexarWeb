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
  'TournamentBattle.html':    'torneos/batalla.html',
  'FriendlyBattle.html':      'friendly/batalla.html',
  'Supervivencia.html':       'supervivencia.html',
  'SupervivenciaBattle.html': 'supervivencia/batalla.html',
  'SupervivenciaLobby.html':  'supervivencia/lobby.html',
  'SolvePage.html':           'resolver.html',
  'ProfileView.html':         'perfil.html',
  'QuickLogin.html':          'quick-login.html',
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

// Clean output dir
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.mkdirSync(OUT);

// Copy assets and services (needed by absolute /src/assets/ and /src/services/ paths in HTML)
copyDir(path.join(SRC, 'assets'), path.join(OUT, 'src', 'assets'));
copyDir(path.join(SRC, 'services'), path.join(OUT, 'src', 'services'));

// Copy pages with clean names
for (const [srcFile, outFile] of Object.entries(PAGE_MAP)) {
  const srcPath = path.join(SRC, 'pages', srcFile);
  const outPath = path.join(OUT, outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.copyFileSync(srcPath, outPath);
  console.log(`  ${srcFile} → ${outFile}`);
}

console.log('\nBuild done.');
