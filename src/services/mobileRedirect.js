(function () {
    var ua = navigator.userAgent;
    var isPhone = /iPhone|iPod/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua));
    var onMobilePage = window.location.pathname === '/mobile' || window.location.pathname.startsWith('/mobile/') ||
                       window.location.pathname === '/instalar-ios';
    // When launched from home screen (PWA mode) let the user through normally
    var isPWA = window.navigator.standalone === true ||
                window.matchMedia('(display-mode: standalone)').matches;
    if (isPhone && !onMobilePage && !isPWA) {
        window.location.replace('/mobile');
    }
})();
