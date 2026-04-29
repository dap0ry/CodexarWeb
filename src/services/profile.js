/* profile.js - Orchestrates atomic state modifications syncing to global servers */
const API_BASE = "https://api.codexar.es/api";
let originalData = {};
let isFormDirty = false;
let selectedLangs = [];

const LANGUAGES_DB = [
    { id: 'C++', label: 'C++', icon: 'cplusplus' },
    { id: 'Python', label: 'Python', icon: 'python' },
    { id: 'Java', label: 'Java', icon: 'java' },
    { id: 'Go', label: 'Go', icon: 'go' },
    { id: 'C#', label: 'C#', icon: 'csharp' }
];

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "/login";
        return;
    }
    
    // Core Navbar Execution
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        });
    }

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) throw new Error("Auth block rejected.");
        const user = await res.json();
        originalData = user;
        selectedLangs = [...(user.languages || [])];
        
        // Push initial Navbar states
        document.getElementById('navUsername').textContent = user.username;
        const navAvatar = document.getElementById('navAvatar');
        if (user.avatar) {
            navAvatar.style.backgroundImage = `url(${user.avatar})`;
            navAvatar.style.backgroundSize = 'cover';
            navAvatar.style.backgroundPosition = 'center';
            navAvatar.style.border = '1px solid var(--accent-cyan)';
            navAvatar.textContent = '';
        } else {
            navAvatar.textContent = user.username.charAt(0).toUpperCase();
        }

        // Hydrate Core DOM Fields silently
        document.getElementById('usernameInput').value = user.username || "";
        document.getElementById('descInput').value = user.description || "";
        if (user.avatar) {
            document.getElementById('avatarPreview').src = user.avatar;
        } else {
            document.getElementById('avatarPreview').src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
        }

        renderLangsGrid();
    } catch(err) {
        console.error(err);
        window.location.href = "/";
    }

    setupMutationListeners();
});

// Flag logic enabling DB sync commits
function markDirty() {
    isFormDirty = true;
    document.getElementById('saveProfileBtn').disabled = false;
}

// Explicit bindings overriding global DOM readonly lock mechanisms mapped physically in HTML
window.toggleEdit = function(inputId) {
    const el = document.getElementById(inputId);
    if(el.hasAttribute('readonly')) {
        el.removeAttribute('readonly');
        el.focus();
        markDirty(); // Trigger commit allowance automatically when opening locks natively
    } else {
        el.setAttribute('readonly', 'true');
    }
}

window.toggleLangEdit = function() {
    const grid = document.getElementById('langsGrid');
    grid.classList.toggle('disabled-grid');
    if(!grid.classList.contains('disabled-grid')) {
        markDirty();
    }
}

// Generate the visual architecture natively using local variables
function renderLangsGrid() {
    const grid = document.getElementById('langsGrid');
    grid.innerHTML = LANGUAGES_DB.map(lang => {
        const isSelected = selectedLangs.includes(lang.id);
        return `
            <div class="lang-card ${isSelected ? 'active' : ''}" data-lang="${lang.id}" onclick="toggleLangSelection('${lang.id}', this)">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${lang.icon}/${lang.icon}-original.svg" class="icon-img" alt="${lang.label}">
            </div>
        `;
    }).join("");
}

window.toggleLangSelection = function(langId, element) {
    if(document.getElementById('langsGrid').classList.contains('disabled-grid')) return;
    
    if (selectedLangs.includes(langId)) {
        selectedLangs = selectedLangs.filter(id => id !== langId);
        element.classList.remove('active');
    } else {
        selectedLangs.push(langId);
        element.classList.add('active');
    }
    markDirty();
}


function setupMutationListeners() {
    const token = localStorage.getItem("access_token");
    const pfpInput = document.getElementById('pfpInput');

    pfpInput.addEventListener('change', (e) => {
        if(e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('avatarPreview').src = e.target.result; // Pre-render before DB upload explicitly showing new state naturally
            };
            reader.readAsDataURL(e.target.files[0]);
            markDirty();
        }
    });

    // Advanced Password Validation Gate
    const oldPwdInput = document.getElementById('oldPasswordInput');
    const newPwdInput = document.getElementById('newPasswordInput');
    const pwdIcon = document.getElementById('pwdStatusIcon');
    const verifyBtn = document.getElementById('verifyPwdBtn');

    verifyBtn.addEventListener('click', async () => {
        const val = oldPwdInput.value;
        if(val.length === 0) {
            pwdIcon.className = "status-msg error";
            pwdIcon.textContent = 'Escribe tu contraseña actual primero';
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = '⏳';
        pwdIcon.textContent = '';

        const fd = new FormData();
        fd.append('password', val);
        try {
            const res = await fetch(`${API_BASE}/user/verify-password`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: fd
            });
            const data = await res.json();
            if(data.valid) {
                pwdIcon.className = "status-msg success";
                pwdIcon.textContent = '¡Contraseña validada! Ya puedes escribir tu nueva clave.';
                newPwdInput.disabled = false;
                newPwdInput.style.opacity = '1';
                newPwdInput.style.cursor = 'text';
                newPwdInput.placeholder = 'Escribe la nueva clave...';
                verifyBtn.textContent = '✅';
            } else {
                pwdIcon.className = "status-msg error";
                pwdIcon.textContent = 'Contraseña actual incorrecta.';
                newPwdInput.disabled = true;
                newPwdInput.style.opacity = '0.5';
                newPwdInput.style.cursor = 'not-allowed';
                newPwdInput.placeholder = 'Bloqueado';
                newPwdInput.value = '';
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verificar';
            }
        } catch(e) {
            pwdIcon.className = "status-msg error";
            pwdIcon.textContent = 'Error de conexión.';
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verificar';
        }
    });

    oldPwdInput.addEventListener('input', () => {
        // Reset button natively if user alters password after verifying
        if(verifyBtn.textContent === '✅') {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verificar';
            newPwdInput.disabled = true;
            newPwdInput.style.opacity = '0.5';
            newPwdInput.style.cursor = 'not-allowed';
            newPwdInput.placeholder = 'Bloqueado';
            newPwdInput.value = '';
            pwdIcon.textContent = '';
        }
    });

    // Username Async Database Validation Check
    let debounce;
    const usernameInput = document.getElementById('usernameInput');
    const uStatus = document.getElementById('usernameStatus');

    usernameInput.addEventListener('input', () => {
        const val = usernameInput.value.trim();
        if(val === originalData.username) {
            uStatus.textContent = "";
            return;
        }

        clearTimeout(debounce);
        debounce = setTimeout(async () => {
            if(val.length < 3) {
                uStatus.textContent = "El nombre es muy corto.";
                uStatus.className = "status-msg error";
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/user/check-username/${val}`);
                const data = await res.json();
                if(data.available) {
                    uStatus.textContent = "Nombre disponible";
                    uStatus.className = "status-msg success";
                } else {
                    uStatus.textContent = "Nombre en uso";
                    uStatus.className = "status-msg error";
                }
            } catch(e) {}
        }, 500); // 500ms safety window catching queries efficiently while editing username loops
    });

    // Master Submit Logic Building Complex Forms payload 
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (uStatus.className.includes("error")) return; // Halt invalid commits natively

        const btn = document.getElementById('saveProfileBtn');
        const feedback = document.getElementById('globalFeedback');
        btn.disabled = true;
        btn.textContent = "Aplicando mutaciones...";

        const formData = new FormData();
        
        const currentUname = usernameInput.value.trim();
        if(currentUname !== originalData.username) {
            formData.append('username', currentUname);
        }

        const currentDesc = document.getElementById('descInput').value.trim();
        if(currentDesc !== originalData.description) {
            formData.append('description', currentDesc);
        }

        // Map Array sequentially bypassing JSON blocks
        selectedLangs.forEach(L => formData.append('languages', L));

        // Password logic strict inclusion
        const oldp = oldPwdInput.value;
        const newp = newPwdInput.value;
        if(oldp && newp && !newPwdInput.disabled) { 
            formData.append('old_password', oldp);
            formData.append('new_password', newp);
        }

        // Check if there is an physical file overwrite
        if(pfpInput.files.length > 0) {
            formData.append('pfp', pfpInput.files[0]);
        }

        try {
            const res = await fetch(`${API_BASE}/user/profile/update`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Token auth logic
                body: formData // Payload natively supports files and form strings globally 
            });

            const data = await res.json();

            if(res.ok) {
                feedback.className = "status-msg success";
                feedback.textContent = "¡Parámetros rediseñados y subidos satisfactoriamente!";
                setTimeout(() => window.location.reload(), 1500); // Hard reboot ensuring UI matches server exact states safely
            } else {
                feedback.className = "status-msg error";
                feedback.textContent = data.detail || "Explotó el enlace a la base de datos.";
                btn.disabled = false;
                btn.textContent = "Guardar Cambios";
            }
        } catch(err) {
            feedback.className = "status-msg error";
            feedback.textContent = "Llamada HTTP inalcanzable. Contacta root.";
            btn.disabled = false;
            btn.textContent = "Guardar Cambios";
        }
    });
}
