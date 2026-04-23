/**
 * roleNav.js — inyecta links de moderador/admin en el dropdown de navegación
 * Incluir en todas las páginas que tengan navbar.
 */
(async function injectRoleNav() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch('https://api.codexar.es/api/user/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const user = await res.json();
        const role = user.role || 'user';
        if (role === 'user') return;

        const dropdown = document.querySelector('.user-dropdown');
        if (!dropdown) return;

        // Separador + links según rol
        const divider = document.createElement('div');
        divider.className = 'dropdown-divider';

        const links = [];

        if (role === 'moderator' || role === 'admin') {
            const a = document.createElement('a');
            a.href = 'CreateExercise.html';
            a.className = 'dropdown-item';
            a.textContent = 'Crear Ejercicio';
            links.push(a);
        }

        if (role === 'admin') {
            const a = document.createElement('a');
            a.href = 'AdminPanel.html';
            a.className = 'dropdown-item';
            a.textContent = 'Panel Admin';
            links.push(a);
        }

        if (!links.length) return;

        // Insertar antes del divider final (Cerrar Sesión)
        const lastDivider = [...dropdown.querySelectorAll('.dropdown-divider')].at(-1);
        if (lastDivider) {
            dropdown.insertBefore(divider, lastDivider);
            links.forEach(l => dropdown.insertBefore(l, lastDivider));
        } else {
            dropdown.appendChild(divider);
            links.forEach(l => dropdown.appendChild(l));
        }
    } catch (_) {}
})();
