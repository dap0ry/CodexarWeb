(function () {
    var ua = navigator.userAgent;
    var isPhone = /iPhone|iPod/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua));
    var path = window.location.pathname;
    var onMobilePage = path === '/mobile' || path.startsWith('/mobile/') ||
                       path === '/instalar-ios';
    var isPWA = window.navigator.standalone === true ||
                window.matchMedia('(display-mode: standalone)').matches;
    if (isPhone && !onMobilePage && !isPWA) {
        var hasToken = !!localStorage.getItem('access_token');
        window.location.replace(hasToken ? '/mobile/app' : '/mobile/auth');
    }
})();
