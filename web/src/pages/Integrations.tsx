import { Github, RefreshCw, Loader2, CheckCircle2, AlertCircle, CircleDashed, Siren, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIntegrations, useIntegrationMutations, type Integration } from '@/api/integrations';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { apiError } from '@/lib/api';
import { formatRelative } from '@/lib/utils';

const META: Record<string, { name: string; icon: typeof Github; desc: string }> = {
  github: { name: 'GitHub', icon: Github, desc: 'github.desc' },
  jira: { name: 'Jira', icon: CircleDashed, desc: 'jira.desc' },
  pagerduty: { name: 'PagerDuty', icon: Siren, desc: 'pagerduty.desc' },
  cloud: { name: 'Cloud Billing (AWS/GCP)', icon: Cloud, desc: 'cloud.desc' },
};

function StatusBadge({ status }: { status: Integration['status'] }) {
  const { t } = useTranslation();
  if (status === 'connected') return <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />{t('integrations.connected')}</Badge>;
  if (status === 'error') return <Badge variant="danger"><AlertCircle className="mr-1 h-3 w-3" />{t('integrations.error')}</Badge>;
  return <Badge variant="secondary">{t('integrations.disconnected')}</Badge>;
}

function IntegrationCard({ it }: { it: Integration }) {
  const { t } = useTranslation();
  const { sync, configure } = useIntegrationMutations();
  const meta = META[it.provider];
  const Icon = meta.icon;
  const syncing = sync.isPending && sync.variables === it.provider;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-5 w-5" />{meta.name}</CardTitle>
          <StatusBadge status={it.status} />
        </div>
        <p className="text-sm text-muted-foreground">{t(`integrations.${meta.desc}`)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('integrations.mode')}:</span>
            <Select
              className="h-8 w-auto py-1 leading-none"
              value={it.mode}
              onChange={(e) => configure.mutate({ provider: it.provider, body: { mode: e.target.value } })}
            >
              <option value="dummy">{t('integrations.dummy')}</option>
              <option value="live">{t('integrations.live')}</option>
            </Select>
          </div>
          <span className="text-muted-foreground">
            {t('integrations.lastSync')}: {it.lastSyncAt ? formatRelative(it.lastSyncAt) : '—'}
          </span>
        </div>

        {it.lastRun && it.lastRun.status === 'success' && (
          <p className="text-xs text-muted-foreground">
            {t('integrations.lastRunOk', { created: it.lastRun.created, updated: it.lastRun.updated, ms: it.lastRun.durationMs })}
          </p>
        )}
        {it.status === 'error' && it.lastError && <p className="text-xs text-red-400">{it.lastError}</p>}

        <Button onClick={() => sync.mutate(it.provider)} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t('integrations.syncNow')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useIntegrations();

  return (
    <div>
      <PageHeader title={t('pages.integrations.title')} subtitle={t('pages.integrations.subtitle')} />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={apiError(error)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data?.map((it) => <IntegrationCard key={it.provider} it={it} />)}
        </div>
      )}
      <p className="mt-6 max-w-2xl text-xs text-muted-foreground">{t('integrations.hint')}</p>
    </div>
  );
}
