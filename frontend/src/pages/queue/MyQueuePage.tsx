import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { IQueueEntry, IPaginatedResponse, IQueryParams } from '@/types';
import { formatDate, cn } from '@/utils/helpers';
import { QUEUE_STATUS_CONFIG } from '@/constants';
import { getApiErrorMessage } from '@/utils/apiError';

export function MyQueuePage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const params: IQueryParams = { page, limit };

  const { data, isLoading } = useQuery<IPaginatedResponse<IQueueEntry>>({
    queryKey: ['my-queue', params],
    queryFn: () => api.getPaginated<IQueueEntry>('/queue/my', params),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Моя очередь</h1>
          <p className="text-secondary-500 mt-1">
            {data?.total || 0} книг в ожидании
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
          <i className="bi bi-clock-history text-6xl text-secondary-300 mb-4" />
          <h3 className="text-lg font-medium text-secondary-900">Вы не стоите в очереди</h3>
          <p className="text-secondary-500 mt-1">
            Когда книга недоступна, вы можете встать в очередь и получить уведомление,
            когда она освободится.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data!.data.map((entry) => (
            <QueueCard key={entry.id} entry={entry} />
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

function QueueCard({ entry }: { entry: IQueueEntry }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const statusConfig = QUEUE_STATUS_CONFIG[entry.status];
  const isNotified = entry.status === 'NOTIFIED';
  const hoursLeft = entry.expiresAt ? Math.ceil((new Date(entry.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)) : 0;

  const mutation = useMutation({
    mutationFn: (kind: 'leave' | 'claim') =>
      kind === 'leave'
        ? api.delete(`/queue/${entry.id}`)
        : api.patch(`/queue/${entry.id}/claim`),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['my-queue-book'] }),
        queryClient.invalidateQueries({ queryKey: ['my-loans'] }),
        queryClient.invalidateQueries({ queryKey: ['my-loans-book'] }),
        queryClient.invalidateQueries({ queryKey: ['books'] }),
        queryClient.invalidateQueries({ queryKey: ['book'] }),
        queryClient.invalidateQueries({ queryKey: ['copies'] }),
        queryClient.invalidateQueries({ queryKey: ['librarian-queue'] }),
      ]);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <div className="card border-l-4 border-primary-500">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Book cover placeholder */}
          <div className="w-20 h-28 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="bi bi-book text-3xl text-secondary-300" />
          </div>

          {/* Book info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-secondary-900 truncate">
                {entry.book?.title || 'Книга'}
              </h3>
              <span className={cn(
                'badge',
                entry.status === 'WAITING' && 'badge-info',
                entry.status === 'NOTIFIED' && 'badge-warning',
                entry.status === 'EXPIRED' && 'badge-danger',
                entry.status === 'FULFILLED' && 'badge-success',
                entry.status === 'CANCELLED' && 'badge-secondary',
              )}>
                {statusConfig?.label || entry.status}
              </span>
            </div>
            <p className="text-sm text-secondary-500 mt-1">
              {entry.book?.author || 'Автор неизвестен'}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-secondary-600">
              <span>Позиция: <span className="font-medium text-secondary-900">#{entry.position}</span></span>
              <span>В очереди с: <span className="font-medium text-secondary-900">{formatDate(entry.createdAt)}</span></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end sm:items-end gap-2">
            {isNotified && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-right">
                <p className="font-medium text-yellow-800">Книга зарезервирована для вас!</p>
                <p className="text-sm text-yellow-700">
                  Заберите в течение {hoursLeft > 0 ? `${hoursLeft} ч.` : '48 ч.'}
                </p>
                <button
                  className="btn-primary btn-sm mt-2"
                  onClick={() => mutation.mutate('claim')}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <><i className="bi bi-arrow-repeat animate-spin mr-1" /> Получение...</>
                  ) : (
                    <><i className="bi bi-check-circle mr-1" /> Получить книгу</>
                  )}
                </button>
              </div>
            )}

            {entry.status === 'WAITING' && (
              <button
                className="btn-outline btn-sm w-full sm:w-auto"
                onClick={() => mutation.mutate('leave')}
                disabled={mutation.isPending}
              >
                <i className="bi bi-x-circle mr-1" /> Покинуть очередь
              </button>
            )}

            {entry.status === 'EXPIRED' && (
              <span className="text-sm text-red-600">
                Время резерва истекло
              </span>
            )}

            {error && (
              <span className="text-xs text-red-600 max-w-[220px] text-right">{error}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}