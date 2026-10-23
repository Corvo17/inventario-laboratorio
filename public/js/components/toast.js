/**
 * Sistema de Notificaciones Toast Flotantes (Estilo Sonner / Shadcn UI)
 * Soporta variantes: success, error, warning, info con animaciones fluidas
 */

const ICONS = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

export class Toast {
    static getContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    static show({ type = 'info', title, description = '', duration = 3500 }) {
        const container = this.getContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        toast.innerHTML = `
            <div class="toast-icon-wrapper">
                ${ICONS[type] || ICONS.info}
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${description ? `<div class="toast-description">${description}</div>` : ''}
            </div>
            <button type="button" class="toast-close-btn" aria-label="Cerrar notificación">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        container.appendChild(toast);

        let timeoutId;
        const removeToast = () => {
            if (toast.classList.contains('toast-exit')) return;
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => {
                toast.remove();
            }, { once: true });
        };

        const startTimer = () => {
            timeoutId = setTimeout(removeToast, duration);
        };

        const pauseTimer = () => {
            clearTimeout(timeoutId);
        };

        startTimer();

        // Pausar auto-cierre si el usuario pasa el cursor por encima
        toast.addEventListener('mouseenter', pauseTimer);
        toast.addEventListener('mouseleave', startTimer);

        // Botón cerrar inmediato
        const closeBtn = toast.querySelector('.toast-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearTimeout(timeoutId);
                removeToast();
            });
        }

        return toast;
    }

    static success(title, description = '', duration = 3500) {
        return this.show({ type: 'success', title, description, duration });
    }

    static error(title, description = '', duration = 4500) {
        return this.show({ type: 'error', title, description, duration });
    }

    static warning(title, description = '', duration = 3500) {
        return this.show({ type: 'warning', title, description, duration });
    }

    static info(title, description = '', duration = 3000) {
        return this.show({ type: 'info', title, description, duration });
    }
}

export const toast = Toast;
export default Toast;
