import { ReactNode, useEffect } from 'react';
import { cn } from '@/utils/helpers';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Простая модалка без внешних зависимостей.
 * Закрывается по клику на фон и по Esc.
 */
export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="fixed inset-0 bg-secondary-900/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full bg-white rounded-xl shadow-xl border border-secondary-100 animate-slide-up',
          size === 'sm' && 'max-w-md',
          size === 'md' && 'max-w-xl',
          size === 'lg' && 'max-w-3xl'
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100">
          <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost p-1.5 text-secondary-500"
            aria-label="Закрыть"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
