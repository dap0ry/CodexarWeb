const fs = require('fs');
const path = require('path');

const PAGES = path.join(__dirname, 'src', 'pages');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // ../assets/  →  /src/assets/
  content = content.replace(/(['"`])\.\.\/(assets\/)/g, '$1/src/$2');
  // ../services/  →  /src/services/
  content = content.replace(/(['"`])\.\.\/(services\/)/g, '$1/src/$2');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  Fixed:', path.basename(filePath));
    return true;
  }
  return false;
}

let changed = 0;
for (const f of fs.readdirSync(PAGES)) {
  if (f.endsWith('.html')) {
    if (fixFile(path.join(PAGES, f))) changed++;
  }
}
console.log(`\nDone. ${changed} files fixed.`);
