const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'src');

const MAPPING = {
  'index.html':               '/',
  'Login.html':               '/login',
  'Register.html':            '/register',
  'Home.html':                '/home',
  'Configuracion.html':       '/configuracion',
  'Exercises.html':           '/ejercicios',
  'Friends.html':             '/amigos',
  'Logros.html':              '/logros',
  'Leaderboard.html':         '/clasificacion',
  'Teams.html':               '/equipos',
  'TeamView.html':            '/equipo',
  'Tournaments.html':         '/torneos',
  'Pricing.html':             '/precios',
  'Tutorial.html':            '/tutorial',
  'AdminPanel.html':          '/admin',
  'CreateExercise.html':      '/crear-ejercicio',
  'Verificacion.html':        '/verificacion',
  'Onboarding.html':          '/onboarding',
  'VsCpu.html':               '/vs-cpu',
  'VsCpuBattle.html':         '/vs-cpu/batalla',
  'Ranked.html':              '/ranked',
  'RankedBattle.html':        '/ranked/batalla',
  'FriendlyBattle.html':      '/friendly/batalla',
  'Supervivencia.html':       '/supervivencia',
  'SupervivenciaBattle.html': '/supervivencia/batalla',
  'SupervivenciaLobby.html':  '/supervivencia/lobby',
  'SolvePage.html':           '/resolver',
  'ProfileView.html':         '/perfil',
  'QuickLogin.html':          '/quick-login',
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [old, newPath] of Object.entries(MAPPING)) {
    // Replace filename followed by query params, quotes, backticks, or whitespace
    const escaped = old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(new RegExp(escaped + '(?=["\'`?\\s]|$)', 'g'), newPath);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let changed = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      changed += walkDir(full);
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.js')) {
      if (replaceInFile(full)) {
        console.log('  Updated:', full);
        changed++;
      }
    }
  }
  return changed;
}

const total = walkDir(ROOT);
console.log(`\nDone. ${total} files updated.`);
