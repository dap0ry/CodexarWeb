"""
Replace all old .html references with clean absolute URLs throughout the codebase.
Safe to run multiple times (idempotent).
"""

import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "src")

# Mapping: old filename → new clean path
MAPPING = {
    "index.html":               "/",
    "Login.html":               "/login",
    "Register.html":            "/register",
    "Home.html":                "/home",
    "Configuracion.html":       "/configuracion",
    "Exercises.html":           "/ejercicios",
    "Friends.html":             "/amigos",
    "Logros.html":              "/logros",
    "Leaderboard.html":         "/clasificacion",
    "Teams.html":               "/equipos",
    "TeamView.html":            "/equipo",
    "Tournaments.html":         "/torneos",
    "Pricing.html":             "/precios",
    "Tutorial.html":            "/tutorial",
    "AdminPanel.html":          "/admin",
    "CreateExercise.html":      "/crear-ejercicio",
    "Verificacion.html":        "/verificacion",
    "Onboarding.html":          "/onboarding",
    "VsCpu.html":               "/vs-cpu",
    "VsCpuBattle.html":         "/vs-cpu/batalla",
    "Ranked.html":              "/ranked",
    "RankedBattle.html":        "/ranked/batalla",
    "FriendlyBattle.html":      "/friendly/batalla",
    "Supervivencia.html":       "/supervivencia",
    "SupervivenciaBattle.html": "/supervivencia/batalla",
    "SupervivenciaLobby.html":  "/supervivencia/lobby",
    "SolvePage.html":           "/resolver",
    "ProfileView.html":         "/perfil",
    "QuickLogin.html":          "/quick-login",
}

def replace_in_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    for old, new in MAPPING.items():
        # Replace occurrences followed by ? (query params), ', ", `, or end of context
        # e.g. Login.html"  →  /login"
        #      Login.html?  →  /login?
        #      Login.html`  →  /login`
        content = re.sub(
            re.escape(old) + r'(?=["\'\`\?\s]|$)',
            new,
            content
        )

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Updated: {path}")
    return content != original

changed = 0
for dirpath, _, filenames in os.walk(ROOT):
    for fname in filenames:
        if fname.endswith((".html", ".js")):
            if replace_in_file(os.path.join(dirpath, fname)):
                changed += 1

print(f"\nDone. {changed} files updated.")
