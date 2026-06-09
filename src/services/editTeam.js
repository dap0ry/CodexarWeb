const ET_API = 'https://api.codexar.es/api';

let etTeam     = null;
let etTeamId   = null;
let etUsername = null;

function token() { return localStorage.getItem('access_token'); }
function authHeaders() { return { 'Authorization': `Bearer ${token()}` }; }

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer = null;
function showToast(msg, isErr = false) {
    let el = document.getElementById('etToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'etToast';
        el.className = 'tm-toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `tm-toast${isErr ? ' err' : ''}`;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function setFeedback(id, msg, ok) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = `tm-feedback ${ok ? 'ok' : 'err'}`;
    setTimeout(() => { el.textContent = ''; el.className = 'tm-feedback'; }, 4000);
}

async function initEditTeam() {
    if (!token()) { window.location.href = '/login'; return; }

    const params   = new URLSearchParams(window.location.search);
    const teamName = params.get('t');
    if (!teamName) { showError(); return; }

    // Load current user
    const meRes = await fetch(`${ET_API}/user/me`, { headers: authHeaders() });
    if (!meRes.ok) { window.location.href = '/login'; return; }
    const me = await meRes.json();
    etUsername = me.username;

    // Navbar
    const navUsername = document.getElementById('navUsername');
    const navAvatar   = document.getElementById('navAvatar');
    if (navUsername) navUsername.textContent = me.username;
    if (navAvatar) {
        if (me.avatar) {
            navAvatar.style.backgroundImage    = `url(${me.avatar})`;
            navAvatar.style.backgroundSize     = 'cover';
            navAvatar.style.backgroundPosition = 'center';
        } else {
            navAvatar.textContent = me.username.charAt(0).toUpperCase();
        }
    }
    document.getElementById('logoutBtn')?.addEventListener('click', e => {
        e.preventDefault(); localStorage.removeItem('access_token'); window.location.href = '/';
    });

    // Load team (public endpoint gives us id + owner)
    const teamRes = await fetch(`${ET_API}/teams/public/${encodeURIComponent(teamName)}`);
    if (!teamRes.ok) { showError(); return; }
    etTeam = await teamRes.json();
    etTeamId = etTeam.id;

    // Verify ownership
    if (etTeam.owner !== etUsername && me.role !== 'admin') { showError(); return; }

    renderPage();
}

function showError() {
    document.getElementById('etLoading').classList.add('hidden');
    document.getElementById('etError').classList.remove('hidden');
}

function renderPage() {
    document.getElementById('etLoading').classList.add('hidden');
    document.getElementById('etContent').classList.remove('hidden');

    document.title = `Codexar — Editar ${etTeam.name}`;
    document.getElementById('etTitle').textContent = etTeam.name;

    document.getElementById('etBackBtn').addEventListener('click', () => {
        window.location.href = `/equipo?t=${encodeURIComponent(etTeam.name)}`;
    });

    // Background overlay preview
    if (etTeam.background_url) {
        document.getElementById('etBgOverlay').style.backgroundImage = `url(${etTeam.background_url})`;
    }

    // Photo preview
    const photoPreview = document.getElementById('etPhotoPreview');
    if (etTeam.photo_url) {
        photoPreview.style.backgroundImage = `url(${etTeam.photo_url})`;
    } else {
        photoPreview.textContent = (etTeam.name || '?').charAt(0).toUpperCase();
    }

    // Banner preview
    const bannerPreview = document.getElementById('etBannerPreview');
    const bannerSrc = etTeam.banner_url || etTeam.background_url;
    if (bannerSrc) bannerPreview.style.backgroundImage = `url(${bannerSrc})`;

    // Bg preview
    const bgPreview = document.getElementById('etBgPreview');
    if (etTeam.background_url) bgPreview.style.backgroundImage = `url(${etTeam.background_url})`;

    // Photo input preview
    document.getElementById('etPhotoInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        photoPreview.style.backgroundImage = `url(${url})`;
        photoPreview.textContent = '';
    });
    document.getElementById('etBannerInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        bannerPreview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
    });
    document.getElementById('etBgInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        bgPreview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
    });

    // Upload buttons
    document.getElementById('etPhotoUploadBtn').addEventListener('click', () => uploadFile('photo'));
    document.getElementById('etBannerUploadBtn').addEventListener('click', () => uploadFile('banner'));
    document.getElementById('etBgUploadBtn').addEventListener('click', () => uploadFile('background'));

    // Members list
    renderMembers(etTeam.members_info || []);

    // Delete
    document.getElementById('etDeleteBtn').addEventListener('click', confirmDeleteTeam);

    // Confirm modal cancel
    document.getElementById('etConfirmCancel').addEventListener('click', closeConfirm);
    document.getElementById('etConfirmModal').addEventListener('click', e => {
        if (e.target === document.getElementById('etConfirmModal')) closeConfirm();
    });
}

async function uploadFile(type) {
    const inputMap   = { photo: 'etPhotoInput',  banner: 'etBannerInput',  background: 'etBgInput'        };
    const feedbackMap = { photo: 'etPhotoFeedback', banner: 'etBannerFeedback', background: 'etBgFeedback' };
    const endpointMap = { photo: 'upload-photo',  banner: 'upload-banner',  background: 'upload-background' };
    const fieldMap   = { photo: 'photo',          banner: 'banner',         background: 'bg'               };

    const input = document.getElementById(inputMap[type]);
    const file  = input?.files[0];
    if (!file) { setFeedback(feedbackMap[type], 'Selecciona una imagen primero.', false); return; }

    const btn = document.getElementById(`et${type.charAt(0).toUpperCase() + type.slice(1)}UploadBtn`);
    btn.disabled = true;
    btn.textContent = 'Subiendo...';

    const form = new FormData();
    form.append(fieldMap[type], file);

    try {
        const res = await fetch(`${ET_API}/teams/${etTeamId}/${endpointMap[type]}`, {
            method: 'POST',
            headers: authHeaders(),
            body: form,
        });
        const data = await res.json();
        if (res.ok) {
            setFeedback(feedbackMap[type], '¡Imagen actualizada!', true);
            showToast('¡Imagen actualizada!');
            if (type === 'background' && data.url) {
                document.getElementById('etBgOverlay').style.backgroundImage = `url(${data.url})`;
            }
        } else {
            setFeedback(feedbackMap[type], data.detail || 'Error al subir', false);
        }
    } catch {
        setFeedback(feedbackMap[type], 'Error de conexión', false);
    } finally {
        btn.disabled = false;
        btn.textContent = type === 'photo' ? 'Subir foto' : type === 'banner' ? 'Subir banner' : 'Subir fondo';
    }
}

function renderMembers(members) {
    const list = document.getElementById('etMembersList');
    if (!members.length) {
        list.innerHTML = '<div class="tm-empty">Sin miembros</div>';
        return;
    }
    list.innerHTML = members.map(m => {
        const initials    = m.username.charAt(0).toUpperCase();
        const avatarStyle = m.avatar
            ? `style="background-image:url(${esc(m.avatar)});background-size:cover;background-position:center;color:transparent"`
            : '';
        const isOwner = m.is_owner || m.username === etTeam.owner;
        const kickBtn = !isOwner
            ? `<button class="et-btn-kick" data-username="${esc(m.username)}">Expulsar</button>` : '';
        const ownerTag = isOwner ? '<span class="et-owner-tag">Capitán</span>' : '';
        return `
            <div class="et-member-row">
                <div class="et-mc-avatar" ${avatarStyle}>${m.avatar ? '' : initials}</div>
                <div class="et-mc-name">${esc(m.username)} ${ownerTag}</div>
                ${kickBtn}
            </div>
        `;
    }).join('');

    list.querySelectorAll('.et-btn-kick').forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.dataset.username;
            document.getElementById('etConfirmText').textContent = `¿Expulsar a ${username} del club?`;
            document.getElementById('etConfirmModal').classList.remove('hidden');
            document.getElementById('etConfirmOk').onclick = async () => {
                closeConfirm();
                await kickMember(username);
            };
        });
    });
}

async function kickMember(username) {
    try {
        const res = await fetch(`${ET_API}/teams/${etTeamId}/members/${encodeURIComponent(username)}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || `${username} expulsado`);
            etTeam.members_info = (etTeam.members_info || []).filter(m => m.username !== username);
            renderMembers(etTeam.members_info);
        } else {
            showToast(data.detail || 'Error al expulsar', true);
        }
    } catch {
        showToast('Error de conexión', true);
    }
}

function confirmDeleteTeam() {
    document.getElementById('etConfirmText').textContent =
        `¿Disolver el club "${etTeam.name}" permanentemente? Todos los miembros serán expulsados.`;
    const modal = document.getElementById('etConfirmModal');
    modal.classList.remove('hidden');
    // Replace title and button style for delete
    document.querySelector('#etConfirmModal .tm-modal-title').textContent = 'DISOLVER CLUB';
    document.getElementById('etConfirmOk').textContent = 'Disolver';
    document.getElementById('etConfirmOk').onclick = async () => {
        closeConfirm();
        await deleteTeam();
    };
}

async function deleteTeam() {
    try {
        const res = await fetch(`${ET_API}/teams/${etTeamId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Club disuelto');
            setTimeout(() => window.location.href = '/equipos', 1200);
        } else {
            showToast(data.detail || 'Error al disolver', true);
        }
    } catch {
        showToast('Error de conexión', true);
    }
}

function closeConfirm() {
    document.getElementById('etConfirmModal').classList.add('hidden');
    document.querySelector('#etConfirmModal .tm-modal-title').textContent = 'CONFIRMAR EXPULSIÓN';
    document.getElementById('etConfirmOk').textContent = 'Expulsar';
}

window.addEventListener('DOMContentLoaded', initEditTeam);
