const API_BASE_URL = 'http://127.0.0.1:8000/api/auth';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('errorMessage');
            const submitBtn = document.getElementById('loginBtn');
            
            errorElement.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verificando...';

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('access_token', data.access_token);
                    if (data.username) localStorage.setItem('username', data.username);
                    
                    if (data.is_onboarded === false) {
                        window.location.href = 'Onboarding.html';
                    } else {
                        window.location.href = 'Home.html';
                    }
                } else {
                    errorElement.textContent = data.detail || 'Error al iniciar sesión';
                    errorElement.style.display = 'block';
                }
            } catch (error) {
                console.error("Login error:", error);
                errorElement.textContent = 'Error de conexión con el servidor.';
                errorElement.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Acceder';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorElement = document.getElementById('errorMessage');
            const submitBtn = document.getElementById('registerBtn');
            const successElement = document.getElementById('successMessage');
            
            errorElement.style.display = 'none';
            if(successElement) successElement.style.display = 'none';
            
            if (password !== confirmPassword) {
                errorElement.textContent = 'Las contraseñas no coinciden.';
                errorElement.style.display = 'block';
                return;
            }
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registrando...';

            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('access_token', data.access_token);
                    
                    if (successElement) {
                        successElement.innerHTML = `[✓] CREACIÓN EXITOSA<br><span style="font-family:var(--font-body); font-size:0.8rem; color:var(--text-light); opacity:0.8; letter-spacing:0;">Redirigiendo al terminal de configuración...</span>`;
                        successElement.style.display = 'block';
                    }
                    submitBtn.style.display = 'none'; 
                    document.getElementById('errorMessage').style.display = 'none';
                    
                    setTimeout(() => {
                        window.location.href = 'Onboarding.html';
                    }, 2500);
                } else {
                    errorElement.textContent = data.detail || 'Error en el registro';
                    errorElement.style.display = 'block';
                }
            } catch (error) {
                console.error("Register error:", error);
                errorElement.textContent = 'Error de conexión con el servidor.';
                errorElement.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrarse';
            }
        });
    }
});
