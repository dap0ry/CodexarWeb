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

    // ─── Floating code snippets ───
    const SNIPPETS = [
        { top:'12%', right:'2%', code:`<span class="kw">def</span> <span class="fn">quicksort</span>(a):
  <span class="kw">if</span> len(a) &lt;= <span class="num">1</span>: <span class="kw">return</span> a
  pivot = a[len(a)//<span class="num">2</span>]
  L=[x <span class="kw">for</span> x <span class="kw">in</span> a <span class="kw">if</span> x&lt;pivot]
  M=[x <span class="kw">for</span> x <span class="kw">in</span> a <span class="kw">if</span> x==pivot]
  R=[x <span class="kw">for</span> x <span class="kw">in</span> a <span class="kw">if</span> x&gt;pivot]
  <span class="kw">return</span> quicksort(L)+M+quicksort(R)`, anim:'a' },
        { bottom:'22%', left:'1%', code:`<span class="kw">int</span> <span class="fn">fib</span>(<span class="kw">int</span> n, map&lt;<span class="kw">int</span>,<span class="kw">int</span>&gt;&amp; m) {
  <span class="kw">if</span> (n &lt;= <span class="num">1</span>) <span class="kw">return</span> n;
  <span class="kw">if</span> (m.count(n)) <span class="kw">return</span> m[n];
  <span class="kw">return</span> m[n] = <span class="fn">fib</span>(n-<span class="num">1</span>,m)+<span class="fn">fib</span>(n-<span class="num">2</span>,m);
}`, anim:'b' },
        { top:'55%', right:'2%', code:`<span class="kw">const</span> dfs = (node, visited) => {
  <span class="kw">if</span> (!node || visited.has(node.id)) <span class="kw">return</span>;
  visited.add(node.id);
  result.push(node.val);
  node.children.forEach(c => dfs(c, visited));
}`, anim:'c' },
    ];

    const ANIMS = {
        a: '@keyframes gf-a{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-16px) rotate(1deg)}}',
        b: '@keyframes gf-b{0%,100%{transform:translateY(0) rotate(1deg)}50%{transform:translateY(-14px) rotate(-1.5deg)}}',
        c: '@keyframes gf-c{0%,100%{transform:translateY(0) rotate(-.5deg)}50%{transform:translateY(-20px) rotate(1deg)}}',
    };

    // Inject keyframes
    const style = document.createElement('style');
    style.textContent = Object.values(ANIMS).join('');
    document.head.appendChild(style);

    SNIPPETS.forEach(s => {
        const el = document.createElement('div');
        el.className = 'g-code-float';
        el.innerHTML = `<pre>${s.code}</pre>`;
        Object.assign(el.style, {
            position: 'fixed',
            zIndex: '2',
            animation: `gf-${s.anim} ${9 + Math.random() * 5}s ease-in-out infinite`,
        });
        if (s.top)    el.style.top    = s.top;
        if (s.bottom) el.style.bottom = s.bottom;
        if (s.left)   el.style.left   = s.left;
        if (s.right)  el.style.right  = s.right;
        document.body.appendChild(el);
    });

})();
