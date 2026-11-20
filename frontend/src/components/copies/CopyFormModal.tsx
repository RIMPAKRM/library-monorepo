import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { BookCopyStatus, IBookCopy } from '@/types';
import { COPY_STATUS_CONFIG } from '@/constants';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/utils/apiError';

interface CopyFormModalProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  /** Если передан экземпляр — режим редактирования */
  copy?: IBookCopy | null;
}

const STATUS_OPTIONS: BookCopyStatus[] = [
  BookCopyStatus.AVAILABLE,
  BookCopyStatus.BORROWED,
  BookCopyStatus.RESERVED,
  BookCopyStatus.LOST,
];

export function CopyFormModal({ open, onClose, bookId, copy }: CopyFormModalProps) {
  const isEdit = Boolean(copy);
  const queryClient = useQueryClient();
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [status, setStatus] = useState<BookCopyStatus>(BookCopyStatus.AVAILABLE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setInventoryNumber(copy?.inventoryNumber || '');
    setStatus(copy?.status || BookCopyStatus.AVAILABLE);
    setError(null);
  }, [open, copy]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        inventoryNumber: inventoryNumber.trim(),
        status,
      };

      if (isEdit && copy) {
        return api.patch<IBookCopy>(`/copies/${copy.id}`, payload);
      }

      return api.post<IBookCopy>(`/books/${bookId}/copies`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['copies', bookId] });
      await queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      onClose();
    },
    onError: (err) => {
      setError(getApiErrorMessage(err));
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!inventoryNumber.trim()) {
      setError('Укажите инвентарный номер');
      return;
    }

    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Редактировать экземпляр' : 'Добавить экземпляр'}
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn-outline" onClick={onClose} disabled={mutation.isPending}>
            Отмена
          </button>
          <button
            type="submit"
            form="copy-form"
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
      <form id="copy-form" className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="copy-inventory">Инвентарный номер *</label>
          <input
            id="copy-inventory"
            className="input"
            value={inventoryNumber}
            onChange={(event) => setInventoryNumber(event.target.value)}
            placeholder="INV-007"
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="copy-status">Статус</label>
          <select
            id="copy-status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value as BookCopyStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {COPY_STATUS_CONFIG[option]?.label || option}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
