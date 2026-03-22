import os
import glob
import re

html_files = glob.glob(r"c:\Users\dapory\Documents\Codexar\WEB\src\pages\*.html")

old_block = r'''            <div class="user-dropdown">
                <a href="Home.html" class="dropdown-item">Inicio</a>
                <a href="Exercises.html" class="dropdown-item">Ejercicios</a>
                <a href="Leaderboard.html" class="dropdown-item">Clasificación</a>
                <a href="Profile.html" class="dropdown-item">Perfil</a>
                <a href="Friends.html" class="dropdown-item">Amigos</a>
                <a href="#" class="dropdown-item">Ayuda</a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item dropdown-item-danger" id="logoutBtn">Cerrar Sesión</a>
            </div>'''

new_block = '''            <div class="user-dropdown">
                <a href="Home.html" class="dropdown-item">Inicio</a>
                <a href="Profile.html" class="dropdown-item">Perfil</a>
                <a href="Friends.html" class="dropdown-item">Amigos</a>
                <a href="Leaderboard.html" class="dropdown-item">Clasificación</a>
                <a href="#" class="dropdown-item">Ayuda</a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item dropdown-item-danger" id="logoutBtn">Cerrar Sesión</a>
            </div>'''

count = 0
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try literal replace first
    if old_block in content:
        content = content.replace(old_block, new_block)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        count += 1
    else:
        # Fallback regex replacing between <div class="user-dropdown"> and </div> for that block
        # We find the start and end of user-dropdown
        start = content.find('<div class="user-dropdown">')
        if start != -1:
            end = content.find('</div>', start) + 6
            if "dropdown-item-danger" in content[start:end]:
                # It's the dropdown box, replace it entirely
                content = content[:start] + new_block.strip() + content[end:]
                with open(file, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1
                
print(f"Replaced in {count} files.")
