const API_BASE_URL = 'https://api.codexar.es/api';
let isUsernameValid = false;
let checkTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check if token exists, else boot to login
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    const usernameInput = document.getElementById('obUsername');
    const statusMsg = document.getElementById('usernameStatus');
    const descInput = document.getElementById('obDesc');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('obSubmit');
    const form = document.getElementById('onboardForm');
    const errorMsg = document.getElementById('obError');
    
    const pfpCircle = document.getElementById('obPfpCircle');
    const pfpInput = document.getElementById('obPfpInput');
    const pfpText = document.getElementById('obPfpText');
    let selectedImageFile = null;

    if (pfpCircle && pfpInput) {
        pfpCircle.addEventListener('click', () => pfpInput.click());

        pfpInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Max size 1MB (1048576 bytes)
            if (file.size > 1048576) {
                alert('¡La imagen es demasiado pesada! Máximo 1MB permitido.');
                pfpInput.value = '';
                selectedImageFile = null;
                return;
            }

            selectedImageFile = file;
            const objectUrl = URL.createObjectURL(file);
            pfpCircle.style.backgroundImage = `url(${objectUrl})`;
            if (pfpText) pfpText.style.display = 'none';
        });
    }

    // Username debounce and API check
    usernameInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        clearTimeout(checkTimeout);
        
        usernameInput.classList.remove('success', 'error');
        isUsernameValid = false;
        validateSubmit();

        if (value.length < 3) {
            statusMsg.textContent = '(Mínimo 3 caracteres)';
            statusMsg.className = 'status-msg';
            return;
        }

        statusMsg.textContent = 'Comprobando disponibilidad...';
        statusMsg.className = 'status-msg';

        checkTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/user/check-username/${value}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.available) {
                        statusMsg.textContent = '¡Usuario disponible!';
                        statusMsg.className = 'status-msg success';
                        usernameInput.classList.add('success');
                        isUsernameValid = true;
                    } else {
                        statusMsg.textContent = 'Este usuario ya está en uso.';
                        statusMsg.className = 'status-msg error';
                        usernameInput.classList.add('error');
                    }
                    validateSubmit();
                }
            } catch (err) {
                console.error('Error checking username', err);
                statusMsg.textContent = 'Error de validación';
            }
        }, 600);
    });

    // Character counter
    descInput.addEventListener('input', (e) => {
        charCount.textContent = e.target.value.length;
    });

    // Validate if Button should be enabled
    function validateSubmit() {
        submitBtn.disabled = !isUsernameValid;
    }

    // Handle Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!isUsernameValid) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'ENVIANDO...';
        errorMsg.style.display = 'none';

        // Gather Data
        const username = usernameInput.value.trim();
        const languages = Array.from(document.querySelectorAll('input[name="languages"]:checked')).map(cb => cb.value);
        const levelRadio = document.querySelector('input[name="level"]:checked');
        const level = levelRadio ? levelRadio.value : "Nuevo";
        const description = descInput.value.trim();

        const formData = new FormData();
        formData.append('username', username);
        languages.forEach(lang => formData.append('languages', lang));
        formData.append('level', level);
        formData.append('description', description);
        
        if (selectedImageFile) {
            formData.append('pfp', selectedImageFile);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/user/onboard`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Update local storage username
                localStorage.setItem('username', data.username);
                window.location.href = 'Home.html';
            } else {
                errorMsg.textContent = data.detail || 'Error al guardar la configuración';
                errorMsg.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'ENVIAR';
            }

        } catch (err) {
            console.error('Submit error:', err);
            errorMsg.textContent = 'Error de conexión con el servidor.';
            errorMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'ENVIAR';
        }
    });

});
