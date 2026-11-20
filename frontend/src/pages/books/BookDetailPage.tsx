import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  IBook,
  IBookCopy,
  ILoan,
  IQueueEntry,
  IPaginatedResponse,
} from '@/types';
import { formatDate, cn } from '@/utils/helpers';
import { COPY_STATUS_CONFIG, LOAN_STATUS_CONFIG, QUEUE_STATUS_CONFIG } from '@/constants';
import { useAuthStore } from '@/store/authStore';
import { BookFormModal } from '@/components/books/BookFormModal';
import { CopyFormModal } from '@/components/copies/CopyFormModal';
import { getApiErrorMessage } from '@/utils/apiError';

interface IActionMessage {
  type: 'success' | 'error';
  text: string;
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const isReader = hasRole(['READER']);
  const canManage = hasRole(['LIBRARIAN', 'MODERATOR']);
  const canDelete = hasRole(['MODERATOR']);

  const [isEditBookOpen, setIsEditBookOpen] = useState(false);
  const [isCreateCopyOpen, setIsCreateCopyOpen] = useState(false);
  const [editingCopy, setEditingCopy] = useState<IBookCopy | null>(null);
  const [message, setMessage] = useState<IActionMessage | null>(null);

  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => api.get<IBook>(`/books/${id}`),
    enabled: !!id,
  });

  const { data: copies } = useQuery({
    queryKey: ['copies', id],
    queryFn: () => api.get<IBookCopy[]>(`/books/${id}/copies`),
    enabled: !!id,
  });

  const { data: myLoans } = useQuery<IPaginatedResponse<ILoan>>({
    queryKey: ['my-loans-book', id],
    queryFn: () => api.getPaginated<ILoan>('/loans/my', { page: 1, limit: 100 }),
    enabled: !!id && isReader,
    retry: false,
  });

  const { data: myQueueEntries } = useQuery<IPaginatedResponse<IQueueEntry>>({
    queryKey: ['my-queue-book', id],
    queryFn: () => api.getPaginated<IQueueEntry>('/queue/my', { page: 1, limit: 100 }),
    enabled: !!id && isReader,
    retry: false,
  });

  const myLoan = myLoans?.data.find(
    (loan) => loan.status === 'ACTIVE' && loan.copy?.book?.id === id
  );

  const myQueue = myQueueEntries?.data.find(
    (entry) => entry.bookId === id && ['WAITING', 'NOTIFIED'].includes(entry.status)
  );

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['book', id] }),
      queryClient.invalidateQueries({ queryKey: ['copies', id] }),
      queryClient.invalidateQueries({ queryKey: ['books'] }),
      queryClient.invalidateQueries({ queryKey: ['my-loans'] }),
      queryClient.invalidateQueries({ queryKey: ['my-loans-book', id] }),
      queryClient.invalidateQueries({ queryKey: ['my-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['my-queue-book', id] }),
      queryClient.invalidateQueries({ queryKey: ['librarian-loans'] }),
      queryClient.invalidateQueries({ queryKey: ['librarian-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['librarian-overdue'] }),
    ]);
  };

  const action = useMutation({
    mutationFn: async (params: { run: () => Promise<unknown>; success: string; onDone?: () => void }) => {
      await params.run();
      return params;
    },
    onSuccess: async (params) => {
      setMessage({ type: 'success', text: params.success });
      await invalidateAll();
      params.onDone?.();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: getApiErrorMessage(error) });
    },
  });

  if (bookLoading) {
    return <div className="animate-pulse space-y-6">...</div>;
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <i className="bi bi-book text-6xl text-secondary-300 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900">Книга не найдена</h3>
        <Link to="/books" className="btn-primary mt-4 inline-block">Назад к каталогу</Link>
      </div>
    );
  }

  const availableCopy = copies?.find((copy) => copy.status === 'AVAILABLE');
  const availableCopies = copies?.filter((copy) => copy.status === 'AVAILABLE').length || 0;
  const inQueue = Boolean(myQueue);

  const handleDeleteBook = () => {
    if (!window.confirm(`Удалить книгу «${book.title}» вместе со всеми экземплярами?`)) {
      return;
    }

    action.mutate({
      run: () => api.delete(`/books/${book.id}`),
      success: 'Книга удалена',
      onDone: () => navigate('/books'),
    });
  };

  const handleDeleteCopy = (copy: IBookCopy) => {
    if (!window.confirm(`Удалить экземпляр ${copy.inventoryNumber}?`)) {
      return;
    }

    action.mutate({
      run: () => api.delete(`/copies/${copy.id}`),
      success: 'Экземпляр удалён',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/books" className="btn-ghost text-sm mb-2">
            <i className="bi bi-arrow-left mr-1" /> Назад к каталогу
          </Link>
          <h1 className="text-3xl font-bold text-secondary-900">{book.title}</h1>
          <p className="text-secondary-500 mt-1">Автор: {book.author}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setIsEditBookOpen(true)}>
              <i className="bi bi-pencil mr-1" /> Редактировать
            </button>
            {canDelete && (
              <button
                className="btn-danger"
                onClick={handleDeleteBook}
                disabled={action.isPending}
              >
                <i className="bi bi-trash mr-1" /> Удалить
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Cover & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover & Status */}
          <div className="card">
            <div className="relative aspect-[3/4] bg-secondary-100 overflow-hidden rounded-t-xl">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="bi bi-book text-6xl text-secondary-300" />
                </div>
              )}
            </div>
            <div className="card-body">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn(
                  'badge',
                  availableCopies > 0 ? 'badge-success' : 'badge-danger'
                )}>
                  {availableCopies > 0 ? `${availableCopies} из ${book.copiesCount} доступно` : 'Нет в наличии'}
                </span>
                {book.isbn && (
                  <span className="badge badge-secondary">ISBN: {book.isbn}</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {book.description && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-secondary-900">Описание</h2>
              </div>
              <div className="card-body">
                <p className="text-secondary-600 whitespace-pre-wrap">{book.description}</p>
              </div>
            </div>
          )}

          {/* Copies */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-secondary-900">Экземпляры ({book.copiesCount})</h2>
              {canManage && (
                <button className="btn-primary text-sm" onClick={() => setIsCreateCopyOpen(true)}>
                  <i className="bi bi-plus mr-1" /> Добавить
                </button>
              )}
            </div>
            <div className="card-body p-0">
              {!copies || copies.length === 0 ? (
                <div className="text-center py-8 text-secondary-500">
                  <i className="bi bi-collection text-4xl text-secondary-300 mb-2 block" />
                  Экземпляров пока нет
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Инв. номер</th>
                        <th>Статус</th>
                        {canManage && <th className="w-48">Действия</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {copies.map((copy) => (
                        <tr key={copy.id}>
                          <td className="font-mono text-sm">{copy.inventoryNumber}</td>
                          <td>
                            <span className={cn(
                              'badge',
                              copy.status === 'AVAILABLE' && 'badge-success',
                              copy.status === 'BORROWED' && 'badge-warning',
                              copy.status === 'RESERVED' && 'badge-info',
                              copy.status === 'LOST' && 'badge-danger'
                            )}>
                              {COPY_STATUS_CONFIG[copy.status]?.label || copy.status}
                            </span>
                          </td>
                          {canManage && (
                            <td>
                              <div className="flex items-center gap-2">
                                <button
                                  className="btn-ghost text-sm p-1.5"
                                  title="Редактировать"
                                  onClick={() => setEditingCopy(copy)}
                                >
                                  <i className="bi bi-pencil" />
                                </button>
                                {canDelete && (
                                  <button
                                    className="btn-ghost text-sm p-1.5 text-red-600 hover:text-red-700"
                                    title="Удалить"
                                    onClick={() => handleDeleteCopy(copy)}
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          {/* Borrow/Queue Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-secondary-900">Действия</h2>
            </div>
            <div className="card-body space-y-4">
              {!isReader && (
                <p className="text-sm text-secondary-500">
                  {canManage
                    ? 'Вы можете управлять книгой и её экземплярами.'
                    : 'Просмотр информации о книге.'}
                </p>
              )}

              {isReader && myLoan && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-blue-800">У вас уже есть эта книга</p>
                    <span className="badge badge-success">
                      {LOAN_STATUS_CONFIG[myLoan.status]?.label || myLoan.status}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    Вернуть до: <span className="font-medium">{formatDate(myLoan.dueDate)}</span>
                  </p>
                  <button
                    className="btn-outline btn-secondary mt-3 w-full"
                    disabled={action.isPending}
                    onClick={() => action.mutate({
                      run: () => api.patch(`/loans/${myLoan.id}/return`),
                      success: 'Книга возвращена',
                    })}
                  >
                    <i className="bi bi-arrow-return-left mr-1" /> Вернуть книгу
                  </button>
                </div>
              )}

              {isReader && inQueue && myQueue && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-yellow-800">Вы в очереди на эту книгу</p>
                    <span className="badge badge-warning">
                      {QUEUE_STATUS_CONFIG[myQueue.status]?.label || myQueue.status}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Ваша позиция: <span className="font-medium">#{myQueue.position}</span>
                  </p>
                  {myQueue.status === 'NOTIFIED' && (
                    <p className="text-sm text-yellow-700 mt-1">
                      Книга зарезервирована для вас! Заберите в течение 48 часов.
                    </p>
                  )}
                  <button
                    className="btn-outline btn-secondary mt-3 w-full"
                    disabled={action.isPending}
                    onClick={() => action.mutate({
                      run: () => api.delete(`/queue/${myQueue.id}`),
                      success: 'Вы покинули очередь',
                    })}
                  >
                    <i className="bi bi-x-circle mr-1" /> Покинуть очередь
                  </button>
                </div>
              )}

              {isReader && !myLoan && !inQueue && (
                <>
                  {availableCopy ? (
                    <button
                      className="btn-primary w-full py-3 text-lg"
                      disabled={action.isPending}
                      onClick={() => action.mutate({
                        run: () => api.post('/loans', { copyId: availableCopy.id }),
                        success: 'Книга взята. Приятного чтения!',
                      })}
                    >
                      <i className="bi bi-book mr-2" /> Взять книгу
                    </button>
                  ) : (
                    <button
                      className="btn-outline w-full py-3 text-lg"
                      disabled={action.isPending}
                      onClick={() => action.mutate({
                        run: () => api.post('/queue', { bookId: book.id }),
                        success: 'Вы встали в очередь на книгу',
                      })}
                    >
                      <i className="bi bi-clock mr-2" /> Встать в очередь
                    </button>
                  )}
                  <p className="text-center text-sm text-secondary-500">
                    {availableCopy
                      ? 'Книга доступна для немедленного получения'
                      : 'Все экземпляры на руках. Вы будете уведомлены, когда книга освободится.'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="card">
            <div className="card-body">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-secondary-500">Добавлена в каталог</dt>
                  <dd className="font-medium text-secondary-900">{formatDate(book.createdAt, 'dd.MM.yyyy')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-secondary-500">Всего экземпляров</dt>
                  <dd className="font-medium text-secondary-900">{book.copiesCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-secondary-500">Доступно</dt>
                  <dd className="font-medium text-green-600">{availableCopies}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <BookFormModal
        open={isEditBookOpen}
        onClose={() => setIsEditBookOpen(false)}
        book={book}
      />

      <CopyFormModal
        open={isCreateCopyOpen}
        onClose={() => setIsCreateCopyOpen(false)}
        bookId={book.id}
      />

      <CopyFormModal
        open={Boolean(editingCopy)}
        onClose={() => setEditingCopy(null)}
        bookId={book.id}
        copy={editingCopy}
      />
    </div>
  );
}
