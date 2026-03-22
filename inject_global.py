"""
Batch-inject global.css and globalBg.js into all interior HTML pages.
Skips index.html, Login.html, Register.html (they have their own CSS/JS).
"""

import os
import glob

PAGES_DIR = r"c:\Users\dapory\Documents\Codexar\WEB\src\pages"

SKIP = {'index.html', 'Login.html', 'Register.html'}

CSS_TAG  = '    <link rel="stylesheet" href="../assets/css/global.css">\n'
JS_TAG   = '    <script src="../services/globalBg.js"></script>\n'

files = glob.glob(os.path.join(PAGES_DIR, '*.html'))

for path in files:
    fname = os.path.basename(path)
    if fname in SKIP:
        print(f'  SKIP: {fname}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False

    # Inject CSS right before </head>
    if 'global.css' not in content and '</head>' in content:
        content = content.replace('</head>', CSS_TAG + '</head>', 1)
        changed = True

    # Inject JS right before </body>
    if 'globalBg.js' not in content and '</body>' in content:
        content = content.replace('</body>', JS_TAG + '</body>', 1)
        changed = True

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  UPDATED: {fname}')
    else:
        print(f'  ALREADY OK: {fname}')

print('Done.')
