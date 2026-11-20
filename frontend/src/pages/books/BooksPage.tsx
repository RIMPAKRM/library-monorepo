import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { IBook, IPaginatedResponse, IQueryParams } from '@/types';
import { cn } from '@/utils/helpers';
import { debounce } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import { BookFormModal } from '@/components/books/BookFormModal';

interface BooksPageData extends IPaginatedResponse<IBook> {}

export function BooksPage() {
  const { hasRole } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const limit = 12;

  const params: IQueryParams = {
    page,
    limit,
    search: search || undefined,
  };

  const { data, isLoading } = useQuery<BooksPageData>({
    queryKey: ['books', params],
    queryFn: () => api.getPaginated<IBook>('/books', params),
    placeholderData: (previous) => previous,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    []
  );

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Каталог книг</h1>
          <p className="text-secondary-500 mt-1">
            {data?.total || 0} книг в каталоге
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {hasRole(['LIBRARIAN', 'MODERATOR']) && (
            <button className="btn-primary whitespace-nowrap" onClick={() => setIsCreateOpen(true)}>
              <i className="bi bi-plus-lg" /> Добавить книгу
            </button>
          )}
          <div className="relative max-w-md w-full">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              placeholder="Поиск по названию, автору, ISBN..."
              value={search}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-[3/4] bg-secondary-100" />
              <div className="card-body space-y-3">
                <div className="h-4 bg-secondary-200 rounded w-3/4" />
                <div className="h-3 bg-secondary-200 rounded w-1/2" />
                <div className="h-3 bg-secondary-200 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-12">
          <i className="bi bi-book text-6xl text-secondary-300 mb-4" />
          <h3 className="text-lg font-medium text-secondary-900">Книг не найдено</h3>
          <p className="text-secondary-500 mt-1">Попробуйте изменить запрос поиска</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data!.data.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Pagination */}
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

      <BookFormModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

function BookCard({ book }: { book: IBook }) {
  const available = book.availableCopiesCount > 0;
  const statusConfig = available 
    ? { label: `${book.availableCopiesCount} из ${book.copiesCount} доступно`, color: 'success' }
    : { label: 'Нет в наличии', color: 'danger' };

  return (
    <Link to={`/books/${book.id}`} className="card h-full flex flex-col group">
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-secondary-100 overflow-hidden">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="bi bi-book text-5xl text-secondary-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={cn(
            'badge',
            available ? 'badge-success' : 'badge-danger'
          )}>
            {available ? 'В наличии' : 'Нет в наличии'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="card-body flex flex-col flex-1">
        <h3 className="font-semibold text-secondary-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {book.title}
        </h3>
        <p className="text-sm text-secondary-500 mt-1 line-clamp-1">
          {book.author}
        </p>
        {book.isbn && (
          <p className="text-xs text-secondary-400 mt-1">
            ISBN: {book.isbn}
          </p>
        )}
        <div className="mt-auto pt-3 border-t border-secondary-100 flex items-center justify-between">
          <span className={cn(
            'text-xs font-medium',
            available ? 'text-green-600' : 'text-red-600'
          )}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </Link>
  );
}