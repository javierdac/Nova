import { Info } from 'lucide-react';

/**
 * Lightweight hover hint: an info icon with a styled popover on hover/focus.
 * Includes a native `title` as a fallback if the styled tooltip is clipped.
 */
export function InfoHint({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`group relative inline-flex align-middle ${className ?? ''}`} tabIndex={0} title={text}>
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" aria-hidden />
      <span className="sr-only">{text}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-64 -translate-x-1/2 rounded-md border bg-card px-3 py-2 text-xs font-normal leading-relaxed text-card-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
