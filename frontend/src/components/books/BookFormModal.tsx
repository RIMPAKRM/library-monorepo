import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { IBook } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/apiError';

interface BookFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Если передана книга — режим редактирования */
  book?: IBook | null;
}

interface IBookFormState {
  title: string;
  author: string;
  isbn: string;
  description: string;
  coverUrl: string;
  copiesCount: string;
}

const EMPTY_FORM: IBookFormState = {
  title: '',
  author: '',
  isbn: '',
  description: '',
  coverUrl: '',
  copiesCount: '1',
};

export function BookFormModal({ open, onClose, book }: BookFormModalProps) {
  const isEdit = Boolean(book);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<IBookFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (book) {
      setForm({
        title: book.title,
        author: book.author,
        isbn: book.isbn || '',
        description: book.description || '',
        coverUrl: book.coverUrl || '',
        copiesCount: String(book.copiesCount),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [open, book]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        isbn: form.isbn.trim() || undefined,
        description: form.description.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
      };

      if (isEdit && book) {
        return api.patch<IBook>(`/books/${book.id}`, payload);
      }

      return api.post<IBook>('/books', {
        ...payload,
        copiesCount: Number(form.copiesCount) || 0,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      if (book) {
        await queryClient.invalidateQueries({ queryKey: ['book', book.id] });
        await queryClient.invalidateQueries({ queryKey: ['copies', book.id] });
      }
      onClose();
    },
    onError: (err) => {
      setError(getApiErrorMessage(err));
    },
  });

  const updateField = (field: keyof IBookFormState) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Укажите название книги');
      return;
    }

    if (!form.author.trim()) {
      setError('Укажите автора книги');
      return;
    }

    if (!isEdit) {
      const copies = Number(form.copiesCount);
      if (!Number.isInteger(copies) || copies < 0 || copies > 100) {
        setError('Количество экземпляров должно быть целым числом от 0 до 100');
        return;
      }
    }

    const isbn = form.isbn.trim();
    if (isbn && (isbn.length < 10 || isbn.length > 17)) {
      setError('ISBN должен содержать от 10 до 17 символов');
      return;
    }

    const coverUrl = form.coverUrl.trim();
    if (coverUrl) {
      try {
        // Проверяем, что значение является корректным URL
        new URL(coverUrl);
      } catch {
        setError('Ссылка на обложку должна быть корректным URL');
        return;
      }
    }

    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Редактировать книгу' : 'Добавить книгу'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn-outline" onClick={onClose} disabled={mutation.isPending}>
            Отмена
          </button>
          <button
            type="submit"
            form="book-form"
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" /> Сохранение...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg" /> {isEdit ? 'Сохранить' : 'Добавить'}
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="book-form" className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="book-title">Название *</label>
          <input
            id="book-title"
            className="input"
            value={form.title}
            onChange={updateField('title')}
            placeholder="Война и мир"
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="book-author">Автор *</label>
          <input
            id="book-author"
            className="input"
            value={form.author}
            onChange={updateField('author')}
            placeholder="Лев Толстой"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="book-isbn">ISBN</label>
            <input
              id="book-isbn"
              className="input"
              value={form.isbn}
              onChange={updateField('isbn')}
              placeholder="978-5-17-090839-4"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="label" htmlFor="book-copies">Экземпляры</label>
              <input
                id="book-copies"
                type="number"
                min={0}
                max={100}
                className="input"
                value={form.copiesCount}
                onChange={updateField('copiesCount')}
              />
              <p className="text-xs text-secondary-500 mt-1">
                Будут созданы с инвентарными номерами автоматически
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="book-cover">Ссылка на обложку</label>
          <input
            id="book-cover"
            className="input"
            value={form.coverUrl}
            onChange={updateField('coverUrl')}
            placeholder="https://example.com/cover.jpg"
          />
        </div>

        <div>
          <label className="label" htmlFor="book-description">Описание</label>
          <textarea
            id="book-description"
            className="input min-h-[110px]"
            value={form.description}
            onChange={updateField('description')}
            placeholder="Краткое описание книги"
          />
        </div>
      </form>
    </Modal>
  );
}
