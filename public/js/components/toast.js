/**
 * Sistema de Notificaciones Toast Flotantes (Estilo Sonner / Shadcn UI)
 * Soporta variantes: success, error, warning, info con animaciones fluidas
 */

const ICONS = {
    success: `<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 16px;"></i>`,
    error: `<i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 16px;"></i>`,
    warning: `<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; font-size: 16px;"></i>`,
    info: `<i class="fa-solid fa-circle-info" style="color: #3b82f6; font-size: 16px;"></i>`
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
                <i class="fa-solid fa-xmark" style="font-size: 13px;"></i>
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
