import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const toneMap = {
  default: 'text-primary bg-primary/10',
  success: 'text-emerald-500 bg-emerald-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  danger: 'text-red-500 bg-red-500/10',
};

export function StatCard({ label, value, sub, icon: Icon, tone = 'default' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        {Icon && (
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', toneMap[tone])}>
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
