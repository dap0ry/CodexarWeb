(function () {
    var ua = navigator.userAgent;
    var isPhone = /iPhone|iPod/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua));
    var onMobilePage = window.location.pathname === '/mobile' || window.location.pathname.startsWith('/mobile/');
    if (isPhone && !onMobilePage) {
        window.location.replace('/mobile');
    }
})();
