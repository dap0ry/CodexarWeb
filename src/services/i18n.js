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

    const FLAG_SRCS = {
        es: 'https://flagcdn.com/es.svg',
        en: 'https://flagcdn.com/gb.svg',
        zh: 'https://flagcdn.com/cn.svg',
    };

    function buildSwitcher(extraClass) {
        const switcher = document.createElement('div');
        switcher.className = 'lang-switcher' + (extraClass ? ' ' + extraClass : '');
        SUPPORTED.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'lang-btn' + (lang === currentLang ? ' active' : '');
            btn.dataset.lang = lang;
            const img = document.createElement('img');
            img.src = FLAG_SRCS[lang];
            img.alt = lang.toUpperCase();
            img.className = 'flag-icon';
            btn.appendChild(img);
            btn.onclick = () => window.setLang(lang);
            switcher.appendChild(btn);
        });
        return switcher;
    }

    function injectSwitcher() {
        // Auth pages only — the rest use the hero lang buttons on Home
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
            const res = await fetch('/src/locales/' + lang + '.json');
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
    window.i18nT = t;

    document.addEventListener('DOMContentLoaded', async () => {
        injectSwitcher();
        await loadLang(currentLang);
        applyTranslations();
    });
})();
