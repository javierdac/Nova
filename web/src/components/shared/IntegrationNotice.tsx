import { Plug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type IntegrationSource = 'github' | 'jira' | 'pagerduty' | 'cloud';

/**
 * Informational banner shown right below the page header on any screen that
 * displays data ingested automatically from an external integration. Lists the
 * source system(s) and links to the Integrations page.
 */
export function IntegrationNotice({ sources }: { sources: IntegrationSource[] }) {
  const { t } = useTranslation();
  const names = sources.map((s) => t(`integrations.sources.${s}`)).join(', ');
  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <Plug className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>
        {t('integrations.notice', { sources: names })}{' '}
        <Link to="/integrations" className="font-medium text-primary hover:underline">
          {t('integrations.manageLink')}
        </Link>
      </span>
    </div>
  );
}
