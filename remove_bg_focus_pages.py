"""
Remove globalBg.js from pages where it would distract: SolvePage, RankedBattle, Ranked, StoryMode
"""
import os
import glob

PAGES_DIR = r"c:\Users\dapory\Documents\Codexar\WEB\src\pages"

# Pages where the animated bg would distract from the task
REMOVE_FROM = {
    'SolvePage.html',
    'RankedBattle.html',
    'Ranked.html',
    'StoryMode.html',
}

JS_TAG_VARIANTS = [
    '    <script src="../services/globalBg.js"></script>\n',
    '    <script src="../services/globalBg.js"></script>\r\n',
    '\n    <script src="../services/globalBg.js"></script>',
]

for fname in REMOVE_FROM:
    path = os.path.join(PAGES_DIR, fname)
    if not os.path.exists(path):
        print(f'  NOT FOUND: {fname}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'globalBg.js' not in content:
        print(f'  SKIP (not present): {fname}')
        continue

    for tag in JS_TAG_VARIANTS:
        if tag in content:
            content = content.replace(tag, '')
            break
    else:
        # fallback: simple replace
        content = content.replace('<script src="../services/globalBg.js"></script>', '')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  REMOVED: {fname}')

print('Done.')
