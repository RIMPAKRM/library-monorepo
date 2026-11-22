import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/helpers';

const FOOTER_LINKS = [
  { path: '/books', label: 'Каталог' },
  { path: '/my-loans', label: 'Мои выдачи' },
  { path: '/my-queue', label: 'Моя очередь' },
];

/** Футер сайта: показывается на всех страницах внутри основного layout */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-secondary-200 bg-white">
      <div className="flex flex-col gap-5 px-6 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <i className="bi bi-book text-base text-white" />
          </span>
          <div>
            <p className="font-semibold text-secondary-900">Библиотека</p>
            <p className="text-xs text-secondary-500">Книги, выдачи и очередь онлайн</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-secondary-500" aria-label="Навигация в футере">
          {FOOTER_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                cn('transition-colors hover:text-primary-600', isActive && 'text-primary-600 font-medium')
              }
            >
              {link.label}
            </NavLink>
          ))}
          <a href="mailto:support@library.local" className="transition-colors hover:text-primary-600">
            support@library.local
          </a>
        </nav>

        <p className="text-xs text-secondary-400">
          © {year} Библиотека. Все права защищены.
        </p>
      </div>
    </footer>
  );
}
