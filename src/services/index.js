/**
 * index.js – Codexar Landing Page Logic
 * - Particle/grid canvas background
 * - Auto-rotating feature card carousel
 * - Stat counter animation
 * - 3D tilt effect on the active feature card
 */

/* ────────────────────────────────────────────
   1. CANVAS BACKGROUND – animated dot grid
   ──────────────────────────────────────────── */

const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');

let W, H, dots = [];

function resizeCanvas() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); initDots(); });

function initDots() {
    dots = [];
    const cols = Math.floor(W / 48);
    const rows = Math.floor(H / 48);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            dots.push({
                x: (c + 0.5) * (W / cols),
                y: (r + 0.5) * (H / rows),
                baseAlpha: Math.random() * 0.08 + 0.02,
                alpha: 0,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.4 + 0.2,
            });
        }
    }
}
initDots();

let mouseX = W / 2, mouseY = H / 2;
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

let t = 0;
function drawCanvas() {
    ctx.clearRect(0, 0, W, H);

    // Very subtle radial glow following cursor
    const grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 380);
    grad.addColorStop(0, 'rgba(0,255,204,0.04)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Animated dot grid
    t += 0.012;
    dots.forEach(d => {
        const dist = Math.hypot(d.x - mouseX, d.y - mouseY);
        const proximity = Math.max(0, 1 - dist / 340);
        d.alpha = d.baseAlpha + Math.sin(t * d.speed + d.phase) * 0.04 + proximity * 0.18;

        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,204,${Math.min(d.alpha, 0.35)})`;
        ctx.fill();
    });

    // Faint connecting lines between nearby dots (near cursor)
    if (dots.length < 500) {
        for (let i = 0; i < dots.length; i++) {
            const d = dots[i];
            if (Math.hypot(d.x - mouseX, d.y - mouseY) > 200) continue;
            for (let j = i + 1; j < dots.length; j++) {
                const d2 = dots[j];
                const dist = Math.hypot(d.x - d2.x, d.y - d2.y);
                if (dist < 80) {
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(d2.x, d2.y);
                    ctx.strokeStyle = `rgba(0,255,204,${0.05 * (1 - dist / 80)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    requestAnimationFrame(drawCanvas);
}
drawCanvas();


/* ────────────────────────────────────────────
   2. FEATURE CARD CAROUSEL
   ──────────────────────────────────────────── */

const cards = document.querySelectorAll('.feature-card');
const dots2  = document.querySelectorAll('.carousel-dots .dot');
let currentCard = 0;
let carouselTimer;

function showCard(idx, direction = 'next') {
    const prev = currentCard;
    cards[prev].classList.remove('active');
    cards[prev].classList.add(direction === 'next' ? 'prev' : '');
    setTimeout(() => cards[prev].classList.remove('prev'), 600);

    currentCard = (idx + cards.length) % cards.length;
    cards[currentCard].classList.add('active');
    dots2.forEach((d, i) => d.classList.toggle('active', i === currentCard));
}

function nextCard() { showCard(currentCard + 1, 'next'); }

function startCarousel() {
    carouselTimer = setInterval(nextCard, 3400);
}

dots2.forEach(dot => {
    dot.addEventListener('click', () => {
        clearInterval(carouselTimer);
        showCard(parseInt(dot.dataset.idx, 10));
        startCarousel();
    });
});

// Swipe support
let tsX = 0;
document.querySelector('.feature-carousel').addEventListener('touchstart', e => {
    tsX = e.changedTouches[0].screenX;
}, { passive: true });
document.querySelector('.feature-carousel').addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - tsX;
    if (Math.abs(dx) > 40) {
        clearInterval(carouselTimer);
        showCard(currentCard + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
        startCarousel();
    }
});

startCarousel();


/* ────────────────────────────────────────────
   3. STAT COUNTER ANIMATION
   ──────────────────────────────────────────── */

function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1400;
    let start = null;

    function step(ts) {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        el.textContent = Math.round(easeOutExpo(progress) * target);
        if (progress < 1) requestAnimationFrame(step);
    }

    // Start counter when element enters viewport (for load)
    setTimeout(() => requestAnimationFrame(step), 600);
});


/* ────────────────────────────────────────────
   4. 3D CARD TILT ON MOUSEMOVE
   ──────────────────────────────────────────── */

document.querySelector('.feature-carousel').addEventListener('mousemove', e => {
    const activeCard = document.querySelector('.feature-card.active');
    if (!activeCard) return;

    const rect   = activeCard.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = (e.clientX - cx) / (rect.width  / 2);
    const dy     = (e.clientY - cy) / (rect.height / 2);
    const tiltX  = dy * -8;
    const tiltY  = dx *  8;

    activeCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
});

document.querySelector('.feature-carousel').addEventListener('mouseleave', () => {
    const activeCard = document.querySelector('.feature-card.active');
    if (activeCard) {
        activeCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
        activeCard.style.transition = 'transform 0.6s cubic-bezier(0.22,1,0.36,1)';
    }
});


/* ────────────────────────────────────────────
   5. REDIRECT logout to index
   ──────────────────────────────────────────── */
// Any page that calls clearToken() should redirect here.
// The logout buttons use:  localStorage.removeItem('access_token'); window.location.href = 'index.html';
