import { Fragment } from 'react';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface SourceLink {
  to: string;
  label: string;
}

/**
 * Informational banner shown right below the page header on any screen that
 * displays data which is entered/managed on a *different* screen (as opposed to
 * an external integration — for that use {@link IntegrationNotice}). States
 * where the data comes from and links to the screen(s) that own it.
 */
export function SourceNotice({ message, links }: { message: string; links: SourceLink[] }) {
  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>
        {message}{' '}
        {links.map((l, i) => (
          <Fragment key={l.to}>
            {i > 0 && <span className="text-muted-foreground/60"> · </span>}
            <Link to={l.to} className="font-medium text-primary hover:underline">
              {l.label}
            </Link>
          </Fragment>
        ))}
      </span>
    </div>
  );
}
