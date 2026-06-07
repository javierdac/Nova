import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/types';

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { t } = useTranslation();
  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? t('common.searchPlaceholder')} />
    </div>
  );
}

export function FilterSelect({ value, onChange, options, all }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; all?: string }) {
  const { t } = useTranslation();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-auto min-w-[140px]">
      <option value="">{all ?? t('common.all')}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export function Pagination({ meta, onPage }: { meta?: PaginationMeta; onPage: (page: number) => void }) {
  const { t } = useTranslation();
  if (!meta) return null;
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
      <span>{t('common.pageInfo', { page: meta.page, totalPages: meta.totalPages, total: meta.total })}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!meta.hasPrevPage} onClick={() => onPage(meta.page - 1)}>
          {t('common.previous')}
        </Button>
        <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => onPage(meta.page + 1)}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
}
