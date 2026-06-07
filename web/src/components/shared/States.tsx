import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-red-400">
      <AlertTriangle className="h-6 w-6" />
      <span className="text-sm">{message ?? t('common.error')}</span>
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
      <Inbox className="h-6 w-6" />
      <span className="text-sm">{message ?? t('common.empty')}</span>
    </div>
  );
}
