import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { IUser, UserRole } from '@/types';
import { cn } from '@/utils/helpers';
import { ROLE_LABELS } from '@/constants';

const profileSchema = z.object({
  firstName: z.string().min(2, 'Имя должно быть минимум 2 символа'),
  lastName: z.string().min(2, 'Фамилия должна быть минимум 2 символа'),
  email: z.string().email('Неверный формат email'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(6, 'Новый пароль должен быть минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleProfileSubmit = async (data: ProfileForm) => {
    try {
      // TODO: API call to update profile
      // const updatedUser = await api.patch('/users/me', data);
      // setUser(updatedUser);
      setMessage({ type: 'success', text: 'Профиль успешно обновлен' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Ошибка при обновлении профиля' });
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    try {
      // TODO: API call to change password
      // await api.post('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
      passwordForm.reset();
      setMessage({ type: 'success', text: 'Пароль успешно изменен' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Ошибка при смене пароля. Проверьте текущий пароль.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Профиль</h1>
        <p className="text-secondary-500 mt-1">Управление учетной записью</p>
      </div>

      {message && (
        <div className={cn(
          'p-4 rounded-lg text-sm',
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        )} role="alert">
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="flex gap-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              'pb-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            )}
          >
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={cn(
              'pb-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'password'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            )}
          >
            Безопасность
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="card">
          <div className="card-body space-y-6">
            {/* Avatar & Role */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl">
                {user?.firstName.charAt(0) || ''}{user?.lastName.charAt(0) || ''}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-secondary-900">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-secondary-500">{user?.email}</p>
                <span className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2',
                  user?.role === 'MODERATOR' && 'bg-purple-100 text-purple-800',
                  user?.role === 'LIBRARIAN' && 'bg-blue-100 text-blue-800',
                  user?.role === 'READER' && 'bg-green-100 text-green-800',
                )}>
                  {ROLE_LABELS[user?.role || 'READER']}
                </span>
              </div>
            </div>

            <hr className="border-secondary-200" />

            {/* Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">Имя</label>
                <input
                  id="firstName"
                  type="text"
                  {...profileForm.register('firstName')}
                  className={cn('input', profileForm.formState.errors.firstName && 'input-error')}
                />
                {profileForm.formState.errors.firstName && (
                  <p className="mt-1.5 text-sm text-red-600">{profileForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="label">Фамилия</label>
                <input
                  id="lastName"
                  type="text"
                  {...profileForm.register('lastName')}
                  className={cn('input', profileForm.formState.errors.lastName && 'input-error')}
                />
                {profileForm.formState.errors.lastName && (
                  <p className="mt-1.5 text-sm text-red-600">{profileForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                {...profileForm.register('email')}
                className={cn('input', profileForm.formState.errors.email && 'input-error')}
              />
              {profileForm.formState.errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{profileForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="pt-4 border-t border-secondary-200">
              <button type="submit" className="btn-primary" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="card">
          <div className="card-body space-y-6">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Смена пароля</h3>
              <p className="text-secondary-500 text-sm">
                Для безопасности введите текущий пароль и новый пароль.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="label">Текущий пароль</label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...passwordForm.register('currentPassword')}
                  className={cn('input', passwordForm.formState.errors.currentPassword && 'input-error')}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1.5 text-sm text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="label">Новый пароль</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('newPassword')}
                  className={cn('input', passwordForm.formState.errors.newPassword && 'input-error')}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1.5 text-sm text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">Подтвердите новый пароль</label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('confirmPassword')}
                  className={cn('input', passwordForm.formState.errors.confirmPassword && 'input-error')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-secondary-200">
              <button type="submit" className="btn-primary" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? 'Смена пароля...' : 'Сменить пароль'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}