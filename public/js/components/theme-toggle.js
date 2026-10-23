export function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;

    function updateButtonState(theme) {
        const icon = toggleBtn.querySelector('i');
        if (theme === 'dark') {
            if (icon) icon.className = 'fa-solid fa-sun';
            toggleBtn.setAttribute('title', 'Cambiar a modo claro');
        } else {
            if (icon) icon.className = 'fa-solid fa-moon';
            toggleBtn.setAttribute('title', 'Cambiar a modo oscuro');
        }
    }

    // Sincronizar estado inicial al cargar
    const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateButtonState(currentTheme);

    // Evento click con toggle directo
    toggleBtn.onclick = (e) => {
        e.preventDefault();
        const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const nextTheme = active === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
        updateButtonState(nextTheme);
    };
}
