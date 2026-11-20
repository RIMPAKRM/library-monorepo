import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { IUser, UserRole, IPaginatedResponse, IQueryParams } from '@/types';
import { formatDate, cn } from '@/utils/helpers';
import { ROLE_LABELS } from '@/constants';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/apiError';

interface IActionMessage {
  type: 'success' | 'error';
  text: string;
}

export function AdminDashboardPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [message, setMessage] = useState<IActionMessage | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const limit = 15;

  const params: IQueryParams = {
    page,
    limit,
    search: search || undefined,
    role: roleFilter !== 'ALL' ? roleFilter : undefined,
  };

  const { data, isLoading } = useQuery<IPaginatedResponse<IUser>>({
    queryKey: ['admin-users', params],
    queryFn: () => api.getPaginated<IUser>('/users', params),
    placeholderData: (previous) => previous,
  });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setPendingUserId(userId);
      await api.patch(`/users/${userId}`, { role: newRole });
      setMessage({ type: 'success', text: 'Роль пользователя обновлена' });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error) {
      setMessage({ type: 'error', text: getApiErrorMessage(error) });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDeleteUser = async (user: IUser) => {
    if (!window.confirm(`Удалить пользователя ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      setPendingUserId(user.id);
      await api.delete(`/users/${user.id}`);
      setMessage({ type: 'success', text: 'Пользователь удалён' });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error) {
      setMessage({ type: 'error', text: getApiErrorMessage(error) });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Панель модератора</h1>
        <p className="text-secondary-500 mt-1">Управление пользователями и их ролями</p>
      </div>

      {message && (
        <div
          className={cn(
            'flex items-start justify-between gap-3 p-4 rounded-lg border text-sm',
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          )}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
              <input
                type="text"
                placeholder="Поиск по имени, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value as any); setPage(1); }}
              className="input w-auto"
            >
              <option value="ALL">Все роли</option>
              <option value="READER">Читатели</option>
              <option value="LIBRARIAN">Библиотекари</option>
              <option value="MODERATOR">Модераторы</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {isLoading ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Зарегистрирован</th>
                  <th className="w-36">Действия</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td><div className="h-4 bg-secondary-200 rounded w-32 animate-pulse" /></td>
                    <td><div className="h-4 bg-secondary-200 rounded w-40 animate-pulse" /></td>
                    <td><div className="h-5 bg-secondary-200 rounded w-24 animate-pulse" /></td>
                    <td><div className="h-4 bg-secondary-200 rounded w-28 animate-pulse" /></td>
                    <td><div className="h-8 bg-secondary-200 rounded w-24 animate-pulse" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-12">
            <i className="bi bi-people text-6xl text-secondary-300 mb-4" />
            <h3 className="text-lg font-medium text-secondary-900">Пользователи не найдены</h3>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Зарегистрирован</th>
                    <th className="w-36">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-secondary-600">{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={pendingUserId === user.id}
                          className={cn(
                            'px-2 py-1 text-sm rounded border',
                            'focus:outline-none focus:ring-2 focus:ring-primary-500',
                            user.role === 'MODERATOR' && 'bg-purple-50 text-purple-800 border-purple-200',
                            user.role === 'LIBRARIAN' && 'bg-blue-50 text-blue-800 border-blue-200',
                            user.role === 'READER' && 'bg-green-50 text-green-800 border-green-200',
                          )}
                        >
                          <option value="READER">Читатель</option>
                          <option value="LIBRARIAN">Библиотекарь</option>
                          <option value="MODERATOR">Модератор</option>
                        </select>
                      </td>
                      <td className="text-sm text-secondary-600">
                        {formatDate(user.createdAt ?? undefined)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-ghost btn-sm p-1.5"
                            title="Просмотр"
                            onClick={() => setSelectedUser(user)}
                          >
                            <i className="bi bi-eye" />
                          </button>
                          <button
                            className="btn-ghost btn-sm p-1.5 text-red-600 hover:text-red-700"
                            title="Удалить"
                            onClick={() => handleDeleteUser(user)}
                            disabled={pendingUserId === user.id}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && data.totalPages > 1 && (
              <div className="card-footer flex items-center justify-between">
                <span className="text-sm text-secondary-600">
                  Показано {data.data.length} из {data.total} пользователей
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="btn-outline btn-sm"
                  >
                    <i className="bi bi-chevron-left" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page === data.totalPages}
                    className="btn-outline btn-sm"
                  >
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={Boolean(selectedUser)}
        title="Информация о пользователе"
        onClose={() => setSelectedUser(null)}
        size="sm"
        footer={
          <div className="flex justify-end">
            <button type="button" className="btn-outline" onClick={() => setSelectedUser(null)}>
              Закрыть
            </button>
          </div>
        }
      >
        {selectedUser && (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-secondary-500">Имя</dt>
              <dd className="font-medium text-secondary-900">
                {selectedUser.firstName} {selectedUser.lastName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary-500">Email</dt>
              <dd className="font-medium text-secondary-900 break-all">{selectedUser.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary-500">Роль</dt>
              <dd className="font-medium text-secondary-900">
                {ROLE_LABELS[selectedUser.role] || selectedUser.role}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary-500">Зарегистрирован</dt>
              <dd className="font-medium text-secondary-900">{formatDate(selectedUser.createdAt)}</dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}