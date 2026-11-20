import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ILoan, IPaginatedResponse, IQueryParams } from '@/types';
import { formatDate, cn } from '@/utils/helpers';
import { LOAN_STATUS_CONFIG } from '@/constants';
import { getApiErrorMessage } from '@/utils/apiError';

export function MyLoansPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const params: IQueryParams = { page, limit };

  const { data, isLoading } = useQuery<IPaginatedResponse<ILoan>>({
    queryKey: ['my-loans', params],
    queryFn: () => api.getPaginated<ILoan>('/loans/my', params),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Мои выдачи</h1>
          <p className="text-secondary-500 mt-1">
            {data?.total || 0} книг на руках
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="flex gap-4">
                  <div className="w-20 h-28 bg-secondary-200 rounded" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-secondary-200 rounded w-3/4" />
                    <div className="h-3 bg-secondary-200 rounded w-1/2" />
                    <div className="h-3 bg-secondary-200 rounded w-1/3" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-12">
          <i className="bi bi-journal-text text-6xl text-secondary-300 mb-4" />
          <h3 className="text-lg font-medium text-secondary-900">У вас нет активных выдач</h3>
          <p className="text-secondary-500 mt-1">Перейдите в каталог, чтобы взять книгу</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data!.data.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-outline px-3 py-2"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <span className="px-4 text-sm text-secondary-600">
                Страница {page} из {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="btn-outline px-3 py-2"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoanCard({ loan }: { loan: ILoan }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const statusConfig = LOAN_STATUS_CONFIG[loan.status];
  const isOverdue = loan.status === 'ACTIVE' && new Date(loan.dueDate) < new Date();
  const daysLeft = Math.ceil((new Date(loan.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const returnMutation = useMutation({
    mutationFn: () => api.patch(`/loans/${loan.id}/return`),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-loans'] }),
        queryClient.invalidateQueries({ queryKey: ['my-loans-book'] }),
        queryClient.invalidateQueries({ queryKey: ['books'] }),
        queryClient.invalidateQueries({ queryKey: ['book'] }),
        queryClient.invalidateQueries({ queryKey: ['copies'] }),
      ]);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Book cover placeholder */}
          <div className="w-20 h-28 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="bi bi-book text-3xl text-secondary-300" />
          </div>

          {/* Book info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-secondary-900 truncate">
              {loan.copy?.book?.title || 'Книга'}
            </h3>
            <p className="text-sm text-secondary-500">
              {loan.copy?.book?.author || 'Автор неизвестен'}
            </p>
            <p className="text-xs text-secondary-400 mt-1">
              Инв. номер: {loan.copy?.inventoryNumber || '—'}
            </p>
          </div>

          {/* Status & Dates */}
          <div className="flex flex-col items-end sm:items-end gap-2 text-right">
            <span className={cn(
              'badge',
              loan.status === 'ACTIVE' && (isOverdue ? 'badge-danger' : 'badge-success'),
              loan.status === 'RETURNED' && 'badge-secondary',
              loan.status === 'OVERDUE' && 'badge-danger',
              loan.status === 'LOST' && 'badge-danger',
            )}>
              {statusConfig?.label || loan.status}
            </span>

            <div className="text-sm text-secondary-600 space-y-1">
              <span>Взята: <span className="font-medium text-secondary-900">{formatDate(loan.loanedAt)}</span></span>
              <span>
                {loan.status === 'ACTIVE' ? (
                  <>
                    Вернуть до:{' '}
                    <span className={cn(
                      'font-medium',
                      isOverdue ? 'text-red-600' : 'text-secondary-900'
                    )}>
                      {formatDate(loan.dueDate)}
                      {isOverdue ? ` (просрочено на ${Math.abs(daysLeft)} дн.)` : ` (осталось ${daysLeft} дн.)`}
                    </span>
                  </>
                ) : loan.returnedAt ? (
                  <>Возвращена: <span className="font-medium text-secondary-900">{formatDate(loan.returnedAt)}</span></>
                ) : null
              }
              </span>
            </div>

            {loan.status === 'ACTIVE' && (
              <>
                <button
                  className="btn-primary btn-sm mt-2"
                  onClick={() => returnMutation.mutate()}
                  disabled={returnMutation.isPending}
                >
                  {returnMutation.isPending ? (
                    <><i className="bi bi-arrow-repeat animate-spin mr-1" /> Возврат...</>
                  ) : (
                    <><i className="bi bi-arrow-return-left mr-1" /> Вернуть</>
                  )}
                </button>
                {error && <span className="text-xs text-red-600 max-w-[220px] text-right">{error}</span>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}