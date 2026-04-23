const API_BASE_URL = 'https://api.codexar.es/api/auth';

const VERIFY_SECONDS = 5 * 60;   // 5 min code expiry
const RESEND_COOLDOWN = 60;       // 1 min before resend is allowed

document.addEventListener('DOMContentLoaded', () => {
    const email = sessionStorage.getItem('pending_email');
    if (!email) {
        window.location.href = 'Register.html';
        return;
    }

    // Show masked email  e.g.  he***@gmail.com
    const maskedEmailEl = document.getElementById('maskedEmail');
    if (maskedEmailEl) {
        const [local, domain] = email.split('@');
        const masked = local.length <= 2
            ? local[0] + '***'
            : local.slice(0, 2) + '***';
        maskedEmailEl.textContent = masked + '@' + domain;
    }

    // ── Elements ──────────────────────────────────────────────
    const boxes        = Array.from(document.querySelectorAll('.otp-box'));
    const timerEl      = document.getElementById('timer');
    const verifyBtn    = document.getElementById('verifyBtn');
    const resendBtn    = document.getElementById('resendBtn');
    const resendCD     = document.getElementById('resendCountdown');
    const errorEl      = document.getElementById('errorMessage');
    const successEl    = document.getElementById('successMessage');

    // ── OTP box logic ─────────────────────────────────────────
    boxes.forEach((box, i) => {
        box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            box.value = val ? val.slice(-1) : '';
            box.classList.toggle('filled', !!box.value);
            if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && i > 0) {
                boxes[i - 1].focus();
                boxes[i - 1].value = '';
                boxes[i - 1].classList.remove('filled');
            }
        });

        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData)
                .getData('text')
                .replace(/\D/g, '')
                .slice(0, 6);
            pasted.split('').forEach((ch, j) => {
                if (boxes[j]) {
                    boxes[j].value = ch;
                    boxes[j].classList.add('filled');
                }
            });
            const next = Math.min(pasted.length, boxes.length - 1);
            boxes[next].focus();
        });
    });

    function getCode() {
        return boxes.map(b => b.value).join('');
    }

    function shakeBoxes() {
        boxes.forEach(b => {
            b.classList.remove('error-shake');
            void b.offsetWidth; // reflow
            b.classList.add('error-shake');
        });
        setTimeout(() => boxes.forEach(b => b.classList.remove('error-shake')), 400);
    }

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        if (successEl) successEl.style.display = 'none';
        shakeBoxes();
    }

    function showSuccess(msg) {
        if (successEl) {
            successEl.innerHTML = msg;
            successEl.style.display = 'block';
        }
        errorEl.style.display = 'none';
    }

    function clearMessages() {
        errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
    }

    // ── Countdown timer (5 min) ───────────────────────────────
    let remaining = VERIFY_SECONDS;
    let timerInterval = null;

    function updateTimer() {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        timerEl.classList.toggle('warning', remaining <= 60 && remaining > 0);
        timerEl.classList.toggle('expired', remaining === 0);

        if (remaining === 0) {
            clearInterval(timerInterval);
            timerEl.textContent = 'CÓDIGO EXPIRADO';
            verifyBtn.disabled = true;
            showError('El código ha expirado. Usa el botón de reenviar para recibir uno nuevo.');
        }
    }

    function startTimer(seconds) {
        clearInterval(timerInterval);
        remaining = seconds;
        updateTimer();
        timerInterval = setInterval(() => {
            remaining--;
            updateTimer();
        }, 1000);
    }

    startTimer(VERIFY_SECONDS);

    // ── Resend cooldown (1 min) ───────────────────────────────
    let resendRemaining = RESEND_COOLDOWN;
    let resendInterval = null;

    function startResendCooldown() {
        resendBtn.disabled = true;
        resendRemaining = RESEND_COOLDOWN;
        resendCD.textContent = resendRemaining;

        resendInterval = setInterval(() => {
            resendRemaining--;
            resendCD.textContent = resendRemaining;
            if (resendRemaining <= 0) {
                clearInterval(resendInterval);
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Reenviar código';
            } else {
                resendBtn.innerHTML = `Reenviar código (<span id="resendCountdown">${resendRemaining}</span>s)`;
            }
        }, 1000);
    }

    startResendCooldown();

    // ── Verify handler ────────────────────────────────────────
    verifyBtn.addEventListener('click', async () => {
        const code = getCode();
        if (code.length < 6) {
            showError('Introduce los 6 dígitos del código.');
            return;
        }

        clearMessages();
        verifyBtn.disabled = true;
        verifyBtn.querySelector('.btn-text').textContent = 'Verificando...';

        try {
            const res = await fetch(`${API_BASE_URL}/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const data = await res.json();

            if (res.ok) {
                clearInterval(timerInterval);
                localStorage.setItem('access_token', data.access_token);
                sessionStorage.removeItem('pending_email');
                showSuccess(`[✓] EMAIL VERIFICADO<br><span style="font-family:var(--font-body);font-size:0.8rem;color:var(--text-light);opacity:0.8;letter-spacing:0;">Redirigiendo al terminal de configuración...</span>`);
                verifyBtn.style.display = 'none';
                setTimeout(() => { window.location.href = 'Onboarding.html'; }, 1500);
            } else {
                showError(data.detail || 'Código incorrecto.');
                verifyBtn.disabled = false;
                verifyBtn.querySelector('.btn-text').textContent = 'Verificar';
            }
        } catch (err) {
            console.error(err);
            showError('Error de conexión con el servidor.');
            verifyBtn.disabled = false;
            verifyBtn.querySelector('.btn-text').textContent = 'Verificar';
        }
    });

    // ── Resend handler ────────────────────────────────────────
    resendBtn.addEventListener('click', async () => {
        if (resendBtn.disabled) return;
        clearMessages();
        resendBtn.disabled = true;
        resendBtn.textContent = 'Enviando...';

        try {
            const res = await fetch(`${API_BASE_URL}/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                // Reset both timers
                startTimer(VERIFY_SECONDS);
                startResendCooldown();
                verifyBtn.disabled = false;
                verifyBtn.style.display = '';
                verifyBtn.querySelector('.btn-text').textContent = 'Verificar';
                boxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
                boxes[0].focus();
                showSuccess('[✓] Código reenviado — revisa tu correo.');
            } else {
                showError(data.detail || 'No se pudo reenviar el código.');
                startResendCooldown();
            }
        } catch (err) {
            console.error(err);
            showError('Error de conexión con el servidor.');
            startResendCooldown();
        }
    });

    // Focus first box on load
    boxes[0].focus();
});
