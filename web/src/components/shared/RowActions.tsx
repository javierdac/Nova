import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiError } from '@/lib/api';

/** Inline edit/delete buttons for a table row or card. */
export function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-1">
      {onEdit && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={t('common.edit')}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={onDelete} aria-label={t('common.delete')}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface ConfirmDeleteProps {
  open: boolean;
  label?: string;
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDelete({ open, label, pending, error, onClose, onConfirm }: ConfirmDeleteProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} title={t('common.confirmDelete')}>
      <p className="text-sm text-muted-foreground">
        {t('common.confirmDeletePre')}<span className="font-medium text-foreground">{label ?? t('common.thisItem')}</span>{t('common.confirmDeletePost')}
      </p>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={pending}>{t('common.delete')}</Button>
      </div>
    </Dialog>
  );
}

interface RemoveMutation {
  mutateAsync: (id: string) => Promise<unknown>;
  isPending: boolean;
}

/**
 * Standardizes the "click delete -> confirm -> remove" flow. Returns the
 * confirm-dialog props plus an `ask(id, label)` opener to wire onto RowActions.
 */
export function useRowDelete(remove: RemoveMutation) {
  const [target, setTarget] = useState<{ id: string; label: string } | null>(null);
  const [error, setError] = useState('');

  const confirm = async () => {
    if (!target) return;
    setError('');
    try {
      await remove.mutateAsync(target.id);
      setTarget(null);
    } catch (err) {
      setError(apiError(err));
    }
  };

  return {
    ask: (id: string, label: string) => {
      setError('');
      setTarget({ id, label });
    },
    dialogProps: {
      open: !!target,
      label: target?.label,
      pending: remove.isPending,
      error,
      onClose: () => setTarget(null),
      onConfirm: confirm,
    },
  };
}
