/**
 * authBg.js — Shared animated canvas background for Login & Register
 */
(function () {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, dots = [];
    let mouseX = 0, mouseY = 0;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        mouseX = W / 2;
        mouseY = H / 2;
        initDots();
    }

    function initDots() {
        dots = [];
        const cols = Math.floor(W / 52);
        const rows = Math.floor(H / 52);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                dots.push({
                    x: (c + 0.5) * (W / cols),
                    y: (r + 0.5) * (H / rows),
                    base: Math.random() * 0.07 + 0.02,
                    phase: Math.random() * Math.PI * 2,
                    speed: Math.random() * 0.4 + 0.2,
                });
            }
        }
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

    let t = 0;
    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Cursor glow
        const g = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 320);
        g.addColorStop(0, 'rgba(0,255,204,0.05)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        t += 0.01;
        dots.forEach(d => {
            const prox = Math.max(0, 1 - Math.hypot(d.x - mouseX, d.y - mouseY) / 300);
            const a = d.base + Math.sin(t * d.speed + d.phase) * 0.03 + prox * 0.2;
            ctx.beginPath();
            ctx.arc(d.x, d.y, 1.1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,255,204,${Math.min(a, 0.3)})`;
            ctx.fill();
        });

        requestAnimationFrame(draw);
    }
    draw();
})();
