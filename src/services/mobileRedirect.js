(function () {
    var ua = navigator.userAgent;
    var isPhone = /iPhone|iPod/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua));
    if (!isPhone) return;

    var path = window.location.pathname;
    var onMobilePage = path === '/mobile' || path.startsWith('/mobile/') ||
                       path === '/instalar-ios';
    if (onMobilePage) return;

    var hasToken = !!localStorage.getItem('access_token');
    window.location.replace(hasToken ? '/mobile/app' : '/mobile/auth');
})();
