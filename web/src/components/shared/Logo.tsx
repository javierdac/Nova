import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Nova brand mark — the geometric octopus inside a white rounded badge so it
 * stays legible on both dark and light surfaces. Use `className` to size the
 * badge (it is square; the mark scales to fit).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      <img
        src="/octopus.png"
        alt="Nova"
        className="h-[78%] w-[78%] object-contain"
        draggable={false}
      />
    </div>
  );
}

/** Full-screen branded splash used while the app boots / lazy routes load. */
export function BrandSplash({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background">
      <Logo className="h-16 w-16 rounded-2xl" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{label ?? 'Cargando Nova…'}</span>
      </div>
    </div>
  );
}
