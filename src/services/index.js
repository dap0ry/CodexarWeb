/**
 * index.js — Codexar Landing
 * Canvas background, battle terminal animation, glitch, counters
 */

// Redirect si hay sesión activa
if (localStorage.getItem('access_token') && localStorage.getItem('saved_email')) {
    window.location.replace('/quick-login');
}

/* ── 1. CANVAS ─────────────────────────────── */
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');
let W, H, dots = [], lines = [], t = 0;
let mx = 0, my = 0;

function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initDots();
}

function initDots() {
    dots  = [];
    lines = [];
    const cols = Math.floor(W / 52);
    const rows = Math.floor(H / 52);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            dots.push({
                x:     (c + 0.5) * (W / cols),
                y:     (r + 0.5) * (H / rows),
                base:  Math.random() * 0.07 + 0.015,
                phase: Math.random() * Math.PI * 2,
                spd:   Math.random() * 0.4 + 0.15,
            });
        }
    }
}

resize();
window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

function drawCanvas() {
    ctx.clearRect(0, 0, W, H);

    // Cursor glow
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 400);
    g.addColorStop(0, 'rgba(0,255,204,0.05)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    t += 0.01;
    dots.forEach(d => {
        const prox = Math.max(0, 1 - Math.hypot(d.x - mx, d.y - my) / 300);
        const a = d.base + Math.sin(t * d.spd + d.phase) * 0.03 + prox * 0.2;
        const size = 1 + prox * 0.8;
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.min(size, 1.8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,204,${Math.min(a, 0.28)})`;
        ctx.fill();
    });

    // Lines near cursor
    const near = dots.filter(d => Math.hypot(d.x - mx, d.y - my) < 220);
    for (let i = 0; i < near.length; i++) {
        for (let j = i + 1; j < near.length; j++) {
            const dist = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
            if (dist < 90) {
                ctx.beginPath();
                ctx.moveTo(near[i].x, near[i].y);
                ctx.lineTo(near[j].x, near[j].y);
                ctx.strokeStyle = `rgba(0,255,204,${0.06 * (1 - dist / 90)})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(drawCanvas);
}
drawCanvas();

/* ── 2. BATTLE TERMINAL ─────────────────────── */

const PY_LINES = [
    'def maxSubarray(nums):',
    '    if not nums: return 0',
    '    cur = best = nums[0]',
    '    for n in nums[1:]:',
    '        cur = max(n, cur + n)',
    '        best = max(best, cur)',
    '    return best',
];

const CPP_LINES = [
    'int maxSubarray(vector<int>& n) {',
    '    int cur = n[0], best = n[0];',
    '    for (int i = 1; i < n.size(); i++) {',
    '        cur = max(n[i], cur + n[i]);',
    '        best = max(best, cur);',
    '    }',
    '    return best;',
    '}',
];

const leftCodeEl    = document.getElementById('leftCode');
const rightCodeEl   = document.getElementById('rightCode');
const leftLinenosEl = document.getElementById('leftLinenos');
const rightLinenosEl = document.getElementById('rightLinenos');
const p1bar  = document.getElementById('p1bar');
const p2bar  = document.getElementById('p2bar');
const p1pct  = document.getElementById('p1pct');
const p2pct  = document.getElementById('p2pct');

let pyProgress  = 0; // chars typed in python
let cppProgress = 0; // chars typed in cpp
let pyTotal  = PY_LINES.join('\n').length;
let cppTotal = CPP_LINES.join('\n').length;

function updateEditor(el, linenosEl, lines, progress) {
    const fullText = lines.join('\n');
    const visible  = fullText.slice(0, progress);
    el.textContent = visible + '█';
    const lineCount = (visible.match(/\n/g) || []).length + 1;
    linenosEl.textContent = Array.from({length: lineCount}, (_, i) => i + 1).join('\n');
}

function updateProgress(pct, barEl, pctEl) {
    barEl.style.width = pct + '%';
    pctEl.textContent = Math.round(pct) + '%';
}

// Animate typing — python is ahead, cpp slightly behind
let pySpeed  = 1.4; // chars per tick
let cppSpeed = 0.9;

function battleTick() {
    if (pyProgress < pyTotal) {
        pyProgress = Math.min(pyProgress + pySpeed + Math.random() * 0.5, pyTotal);
        updateEditor(leftCodeEl, leftLinenosEl, PY_LINES, Math.floor(pyProgress));
        updateProgress((pyProgress / pyTotal) * 100, p1bar, p1pct);
    }
    if (cppProgress < cppTotal) {
        cppProgress = Math.min(cppProgress + cppSpeed + Math.random() * 0.4, cppTotal);
        updateEditor(rightCodeEl, rightLinenosEl, CPP_LINES, Math.floor(cppProgress));
        updateProgress((cppProgress / cppTotal) * 100, p2bar, p2pct);
    }

    // Loop when both done
    if (pyProgress >= pyTotal && cppProgress >= cppTotal) {
        setTimeout(() => {
            pyProgress  = 0;
            cppProgress = 0;
        }, 2800);
    }
}

setInterval(battleTick, 55);

/* ── 3. TIMER ───────────────────────────────── */
let timerSecs = 167; // 2:47
const timerEl = document.getElementById('bcTimer');

setInterval(() => {
    timerSecs--;
    if (timerSecs < 0) timerSecs = 180;
    const m = String(Math.floor(timerSecs / 60)).padStart(2, '0');
    const s = String(timerSecs % 60).padStart(2, '0');
    timerEl.textContent = m + ':' + s;
}, 1000);

/* ── 4. STAT COUNTERS ───────────────────────── */
function easeOut(t) { return 1 - Math.pow(2, -10 * t); }

document.querySelectorAll('.lp-stat-num').forEach(el => {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1600;
    let start      = null;

    function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        el.textContent = Math.round(easeOut(p) * target);
        if (p < 1) requestAnimationFrame(step);
    }

    setTimeout(() => requestAnimationFrame(step), 800);
});
