"""
Batch replace only logout redirects (not auth guards) in JS service files.
Lines that redirect to Login.html on LOGOUT are:
  - exercises.js:171  (logout btn)
  - friends.js:53     (logout btn)
  - homeDashboard.js:160 (logout btn)
  - leaderboard.js:127 (logout btn)
  - profile.js:66     (logout btn)
  - ranked.js:66      (logout btn)
  - storyMode.js:53   (logout btn)
  - unranked.js:47    (logout btn)
  - rankedBattle.js:50
  - unrankedBattle.js:46
  - solveExercise.js:351
"""

import os

targets = {
    "exercises.js":    [(171,)],
    "friends.js":      [(53,)],
    "homeDashboard.js":[(160,)],
    "leaderboard.js":  [(127,)],
    "profile.js":      [(66,)],
    "ranked.js":       [(66,)],
    "storyMode.js":    [(53,)],
    "unranked.js":     [(47,)],
    "rankedBattle.js": [(50,)],
    "unrankedBattle.js":[(46,)],
    "solveExercise.js":[(351,)],
}

base = r"c:\Users\dapory\Documents\Codexar\WEB\src\services"

for filename, linenos in targets.items():
    path = os.path.join(base, filename)
    if not os.path.exists(path):
        print(f"  SKIP (not found): {filename}")
        continue
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    changed = False
    for (lineno,) in linenos:
        idx = lineno - 1
        if idx < len(lines) and 'Login.html' in lines[idx]:
            lines[idx] = lines[idx].replace("'Login.html'", "'index.html'").replace('"Login.html"', '"index.html"')
            changed = True
            print(f"  REPLACED line {lineno} in {filename}")
    
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)

print("Done.")
