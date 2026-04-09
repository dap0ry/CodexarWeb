/**
 * themeService.js — Codexar Theme Manager
 * Must be loaded as the FIRST script in <head> (synchronous, no defer/async)
 * so the data-theme attribute is set before any CSS renders → no FOUC.
 */
(function () {
    var theme = localStorage.getItem('codexar_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
})();

function setTheme(t) {
    localStorage.setItem('codexar_theme', t);
    document.documentElement.setAttribute('data-theme', t);
}

function getTheme() {
    return localStorage.getItem('codexar_theme') || 'dark';
}
