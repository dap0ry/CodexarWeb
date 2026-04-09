/**
 * themeService.js — Codexar Theme Manager
 * Must be loaded as the FIRST script in <head> (synchronous, no defer/async)
 * so the data-theme attribute is set before any CSS renders — no FOUC.
 *
 * Supported themes: dark · dracula · nord · matrix · focus · zen
 * The value "light" is a backwards-compatible alias for "zen".
 */
(function () {
    var theme = localStorage.getItem('codexar_theme') || 'dark';
    if (theme === 'light') theme = 'zen';
    document.documentElement.setAttribute('data-theme', theme);
})();

function setTheme(t) {
    localStorage.setItem('codexar_theme', t);
    document.documentElement.setAttribute('data-theme', t);
}

function getTheme() {
    var t = localStorage.getItem('codexar_theme') || 'dark';
    return t === 'light' ? 'zen' : t;
}
