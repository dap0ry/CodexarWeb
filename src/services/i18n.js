(function () {
    const STORAGE_KEY = 'codexar_lang';
    const SUPPORTED = ['es', 'en', 'zh'];
    let currentLang = localStorage.getItem(STORAGE_KEY) || 'es';
    if (!SUPPORTED.includes(currentLang)) currentLang = 'es';

    let translations = {};

    function t(key) {
        const parts = key.split('.');
        let val = translations;
        for (const p of parts) {
            if (val == null) return key;
            val = val[p];
        }
        return (val != null && typeof val === 'string') ? val : key;
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = t(key);
            if (text !== key) el.textContent = text;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const text = t(key);
            if (text !== key) el.placeholder = text;
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const text = t(key);
            if (text !== key) el.title = text;
        });
        updateActiveBtns();
    }

    function updateActiveBtns() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === currentLang);
        });
    }

    function buildSwitcher(extraClass) {
        const switcher = document.createElement('div');
        switcher.className = 'lang-switcher' + (extraClass ? ' ' + extraClass : '');
        SUPPORTED.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'lang-btn' + (lang === currentLang ? ' active' : '');
            btn.dataset.lang = lang;
            btn.textContent = lang === 'zh' ? '中' : lang.toUpperCase();
            btn.onclick = () => window.setLang(lang);
            switcher.appendChild(btn);
        });
        return switcher;
    }

    function injectSwitcher() {
        const navbar = document.querySelector('.navbar');
        if (navbar && !navbar.querySelector('.lang-switcher')) {
            const pill = navbar.querySelector('.user-pill-container');
            if (pill) navbar.insertBefore(buildSwitcher(), pill);
            else navbar.appendChild(buildSwitcher());
        }
        // Auth pages have no navbar
        const authCard = document.querySelector('.auth-card');
        if (authCard && !document.querySelector('.lang-switcher')) {
            const topLine = authCard.querySelector('.auth-card-top-line');
            const switcher = buildSwitcher('lang-switcher--auth');
            if (topLine) topLine.after(switcher);
            else authCard.prepend(switcher);
        }
    }

    async function loadLang(lang) {
        try {
            const res = await fetch('/src/locales/' + lang + '.json?v=' + Date.now());
            if (!res.ok) throw new Error('fetch failed');
            translations = await res.json();
        } catch (e) {
            console.warn('[i18n] Could not load', lang);
            translations = {};
        }
    }

    window.setLang = async function (lang) {
        if (!SUPPORTED.includes(lang)) return;
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        await loadLang(lang);
        applyTranslations();
    };

    window.i18nApply = applyTranslations;

    document.addEventListener('DOMContentLoaded', async () => {
        injectSwitcher();
        await loadLang(currentLang);
        applyTranslations();
    });
})();
