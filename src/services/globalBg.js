/**
 * globalBg.js — Ambient animated background for all interior pages.
 * Inserts: subtly animated dot grid canvas + 2-3 floating code fragments.
 * Safe to include on every page, detects if canvas already exists.
 */
(function () {
    if (document.getElementById('globalBgCanvas')) return; // already initialized

    // ─── Create canvas ───
    const canvas = document.createElement('canvas');
    canvas.id = 'globalBgCanvas';
    document.body.appendChild(canvas); // append at end — position:fixed means location doesn't matter
    const ctx = canvas.getContext('2d');
    let W, H, dots = [], t = 0;
    let mx = 0, my = 0;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        mx = W / 2; my = H / 2;
        initDots();
    }

    function initDots() {
        dots = [];
        const cols = Math.floor(W / 60);
        const rows = Math.floor(H / 60);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                dots.push({
                    x:     (c + 0.5) * (W / cols),
                    y:     (r + 0.5) * (H / rows),
                    base:  Math.random() * 0.05 + 0.015,
                    phase: Math.random() * Math.PI * 2,
                    spd:   Math.random() * 0.35 + 0.15,
                    sz:    Math.random() * 0.5 + 0.8,
                });
            }
        }
    }

    resize();
    window.addEventListener('resize', () => { resize(); });
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // soft cursor glow
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 280);
        g.addColorStop(0, 'rgba(0,255,204,0.04)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        t += 0.008;
        dots.forEach(d => {
            const prox = Math.max(0, 1 - Math.hypot(d.x - mx, d.y - my) / 260);
            const a = d.base + Math.sin(t * d.spd + d.phase) * 0.025 + prox * 0.12;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.sz, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,255,204,${Math.min(a, 0.22)})`;
            ctx.fill();
        });

        requestAnimationFrame(draw);
    }
    draw();


})();
