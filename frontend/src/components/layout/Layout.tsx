import { ReactNode } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/constants';
import { cn } from '@/utils/helpers';
import { Footer } from '@/components/layout/Footer';

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout, hasRole } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/books', label: 'Каталог книг', icon: 'bi-book' },
    { path: '/my-loans', label: 'Мои выдачи', icon: 'bi-journal-text' },
    { path: '/my-queue', label: 'Моя очередь', icon: 'bi-clock-history' },
    { path: '/profile', label: 'Профиль', icon: 'bi-person' },
  ];

  const librarianItems = [
    { path: '/librarian', label: 'Панель библиотекаря', icon: 'bi-building' },
  ];

  const adminItems = [
    { path: '/admin', label: 'Панель модератора', icon: 'bi-shield-lock' },
  ];

  const handleLogout = () => {
    logout();
    // API logout вызовется через ProtectedRoute или отдельно
  };

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-secondary-200',
        'transform transition-transform duration-300 lg:translate-x-0'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-secondary-200">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <i className="bi bi-book text-white text-xl" />
            </div>
            <span className="text-xl font-bold text-secondary-900">Библиотека</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                )}
              >
                <i className={cn('bi', item.icon, 'text-lg')} />
                {item.label}
              </NavLink>
            ))}

            {hasRole(['LIBRARIAN', 'MODERATOR']) && (
              <>
                <hr className="my-4 border-secondary-200" />
                <p className="px-3 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                  Библиотекарь
                </p>
                {librarianItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                    )}
                  >
                    <i className={cn('bi', item.icon, 'text-lg')} />
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}

            {hasRole(['MODERATOR']) && (
              <>
                <hr className="my-4 border-secondary-200" />
                <p className="px-3 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                  Администрация
                </p>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                    )}
                  >
                    <i className={cn('bi', item.icon, 'text-lg')} />
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-secondary-200">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                {user ? user.firstName.charAt(0) + user.lastName.charAt(0) : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 truncate">
                  {user ? `${user.firstName} ${user.lastName}` : 'Пользователь'}
                </p>
                <p className="text-xs text-secondary-500 capitalize">
                  {user ? ROLE_LABELS[user.role] : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center gap-3 px-3 py-2 text-sm font-medium text-secondary-600 rounded-lg hover:bg-secondary-50 hover:text-secondary-900 transition-colors"
            >
              <i className="bi bi-box-arrow-right" />
              Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-secondary-200 px-6 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-secondary-900">
              {location.pathname === '/books' && 'Каталог книг'}
              {location.pathname === '/my-loans' && 'Мои выдачи'}
              {location.pathname === '/my-queue' && 'Моя очередь'}
              {location.pathname === '/profile' && 'Профиль'}
              {location.pathname === '/librarian' && 'Панель библиотекаря'}
              {location.pathname === '/admin' && 'Панель модератора'}
            </h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children || <Outlet />}
        </main>

        <Footer />
      </div>
    </div>
  );
}