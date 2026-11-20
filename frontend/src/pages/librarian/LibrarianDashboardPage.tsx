import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ILoan, IQueueEntry, IPaginatedResponse, IQueryParams } from '@/types';
import { formatDate, cn } from '@/utils/helpers';
import { LOAN_STATUS_CONFIG, QUEUE_STATUS_CONFIG } from '@/constants';
import { getApiErrorMessage } from '@/utils/apiError';

interface IActionMessage {
  type: 'success' | 'error';
  text: string;
}

export function LibrarianDashboardPage() {
  const [activeTab, setActiveTab] = useState<'loans' | 'queue' | 'overdue'>('loans');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<IActionMessage | null>(null);
  const limit = 15;
  const queryClient = useQueryClient();

  const params: IQueryParams = { page, limit };

  const { data: loansData } = useQuery<IPaginatedResponse<ILoan>>({
    queryKey: ['librarian-loans', params],
    queryFn: () => api.getPaginated<ILoan>('/loans', { ...params, status: 'ACTIVE' }),
    placeholderData: (previous) => previous,
  });

  const { data: queueData } = useQuery<IPaginatedResponse<IQueueEntry>>({
    queryKey: ['librarian-queue', params],
    queryFn: () => api.getPaginated<IQueueEntry>('/queue', params),
    placeholderData: (previous) => previous,
  });

  const { data: overdueData } = useQuery<IPaginatedResponse<ILoan>>({
    queryKey: ['librarian-overdue', params],
    queryFn: () => api.getPaginated<ILoan>('/loans', { ...params, overdue: true }),
    placeholderData: (previous) => previous,
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['librarian-loans'] }),
      queryClient.invalidateQueries({ queryKey: ['librarian-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['librarian-overdue'] }),
      queryClient.invalidateQueries({ queryKey: ['books'] }),
      queryClient.invalidateQueries({ queryKey: ['book'] }),
      queryClient.invalidateQueries({ queryKey: ['copies'] }),
    ]);
  };

  const action = useMutation({
    mutationFn: async (params: { run: () => Promise<unknown>; success: string }) => {
      await params.run();
      return params.success;
    },
    onSuccess: async (successText) => {
      setMessage({ type: 'success', text: successText });
      await invalidateAll();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: getApiErrorMessage(error) });
    },
  });

  const tabs = [
    { id: 'loans', label: 'Активные выдачи', count: loansData?.total || 0 },
    { id: 'overdue', label: 'Просроченные', count: overdueData?.total || 0 },
    { id: 'queue', label: 'Очередь ожидания', count: queueData?.total || 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Панель библиотекаря</h1>
        <p className="text-secondary-500 mt-1">Управление выдачами, очередями и просрочками</p>
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

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="flex gap-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
              className={cn(
                'pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              )}
            >
              {tab.label}
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-secondary-600'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="card">
        {activeTab === 'loans' && (
          <LoansTable
            loans={loansData?.data || []}
            totalPages={loansData?.totalPages || 1}
            page={page}
            onPageChange={setPage}
            onReturn={(loanId) => action.mutate({
              run: () => api.patch(`/loans/${loanId}/return`),
              success: 'Книга возвращена читателем',
            })}
            isPending={action.isPending}
          />
        )}
        {activeTab === 'overdue' && (
          <LoansTable
            loans={overdueData?.data || []}
            totalPages={overdueData?.totalPages || 1}
            page={page}
            onPageChange={setPage}
            onReturn={(loanId) => action.mutate({
              run: () => api.patch(`/loans/${loanId}/return`),
              success: 'Книга возвращена',
            })}
            isPending={action.isPending}
            isOverdue
          />
        )}
        {activeTab === 'queue' && (
          <QueueTable
            queue={queueData?.data || []}
            totalPages={queueData?.totalPages || 1}
            page={page}
            onPageChange={setPage}
            onFulfill={(entryId) => action.mutate({
              run: () => api.patch(`/queue/${entryId}/fulfill`),
              success: 'Книга выдана читателю',
            })}
            isPending={action.isPending}
          />
        )}
      </div>
    </div>
  );
}

function LoansTable({ loans, totalPages, page, onPageChange, onReturn, isPending, isOverdue = false }: {
  loans: ILoan[];
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  onReturn: (loanId: string) => void;
  isPending: boolean;
  isOverdue?: boolean;
}) {
  if (loans.length === 0) {
    return (
      <div className="text-center py-12">
        <i className={cn('bi', isOverdue ? 'bi-exclamation-triangle' : 'bi-journal-text', 'text-6xl text-secondary-300 mb-4')} />
        <h3 className="text-lg font-medium text-secondary-900">
          {isOverdue ? 'Просроченных выдач нет' : 'Активных выдач нет'}
        </h3>
      </div>
    );
  }

  return (
    <div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Читатель</th>
              <th>Книга</th>
              <th>Взят</th>
              <th>Срок возврата</th>
              <th>Статус</th>
              <th className="w-36">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id}>
                <td>
                  <div>
                    <p className="font-medium text-secondary-900">
                      {loan.user?.firstName} {loan.user?.lastName}
                    </p>
                    <p className="text-xs text-secondary-500">{loan.user?.email}</p>
                  </div>
                </td>
                <td>
                  <div>
                    <p className="font-medium text-secondary-900 truncate max-w-xs">
                      {loan.copy?.book?.title}
                    </p>
                    <p className="text-xs text-secondary-500">
                      Инв. {loan.copy?.inventoryNumber}
                    </p>
                  </div>
                </td>
                <td className="text-sm text-secondary-600">
                  {formatDate(loan.loanedAt)}
                </td>
                <td className="text-sm text-secondary-600">
                  {formatDate(loan.dueDate)}
                </td>
                <td>
                  <span className={cn(
                    'badge',
                    loan.status === 'ACTIVE' && (isOverdue ? 'badge-danger' : 'badge-success'),
                    loan.status === 'OVERDUE' && 'badge-danger',
                    loan.status === 'RETURNED' && 'badge-secondary',
                  )}>
                    {LOAN_STATUS_CONFIG[loan.status]?.label || loan.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-primary btn-sm text-xs px-2"
                    onClick={() => onReturn(loan.id)}
                    disabled={isPending}
                  >
                    <i className="bi bi-arrow-return-left mr-1" /> Вернуть
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="card-footer flex items-center justify-between">
          <span className="text-sm text-secondary-600">Страница {page} из {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn-outline btn-sm"
            >
              <i className="bi bi-chevron-left" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn-outline btn-sm"
            >
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueTable({ queue, totalPages, page, onPageChange, onFulfill, isPending }: {
  queue: IQueueEntry[];
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  onFulfill: (entryId: string) => void;
  isPending: boolean;
}) {
  if (queue.length === 0) {
    return (
      <div className="text-center py-12">
        <i className="bi bi-clock-history text-6xl text-secondary-300 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900">Очередь пуста</h3>
      </div>
    );
  }

  return (
    <div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Читатель</th>
              <th>Книга</th>
              <th>Позиция</th>
              <th>Статус</th>
              <th>В очереди с</th>
              <th className="w-36">Действия</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <div>
                    <p className="font-medium text-secondary-900">
                      {entry.user?.firstName} {entry.user?.lastName}
                    </p>
                    <p className="text-xs text-secondary-500">{entry.user?.email}</p>
                  </div>
                </td>
                <td>
                  <p className="font-medium text-secondary-900 truncate max-w-xs">
                    {entry.book?.title}
                  </p>
                  <p className="text-xs text-secondary-500">{entry.book?.author}</p>
                </td>
                <td className="text-center">
                  <span className="font-mono font-medium text-secondary-900">#{entry.position}</span>
                </td>
                <td>
                  <span className={cn(
                    'badge',
                    entry.status === 'WAITING' && 'badge-info',
                    entry.status === 'NOTIFIED' && 'badge-warning',
                    entry.status === 'EXPIRED' && 'badge-danger',
                    entry.status === 'FULFILLED' && 'badge-success',
                    entry.status === 'CANCELLED' && 'badge-secondary',
                  )}>
                    {QUEUE_STATUS_CONFIG[entry.status]?.label || entry.status}
                  </span>
                </td>
                <td className="text-sm text-secondary-600">
                  {formatDate(entry.createdAt)}
                </td>
                <td>
                  {['WAITING', 'NOTIFIED'].includes(entry.status) ? (
                    <button
                      className="btn-primary btn-sm text-xs px-2"
                      onClick={() => onFulfill(entry.id)}
                      disabled={isPending}
                    >
                      <i className="bi bi-check-circle mr-1" /> Выдать
                    </button>
                  ) : (
                    <span className="text-xs text-secondary-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="card-footer flex items-center justify-between">
          <span className="text-sm text-secondary-600">Страница {page} из {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn-outline btn-sm"
            >
              <i className="bi bi-chevron-left" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn-outline btn-sm"
            >
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
