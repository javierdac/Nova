import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAIStatus, useAIInsight, useTeams } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiError } from '@/lib/api';

const INSIGHT_KINDS = ['weekly-summary', 'burnout', 'tech-debt', 'roadmap-risk', 'health-report'];

function InsightPanel({ kind }: { kind: string }) {
  const { t } = useTranslation();
  const [run, setRun] = useState(false);
  const { data, isFetching, isError, error } = useAIInsight(kind, undefined, run);
  return (
    <div>
      {!run ? (
        <Button variant="outline" size="sm" onClick={() => setRun(true)}><Sparkles className="h-4 w-4" /> {t('common.generate')}</Button>
      ) : isFetching ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.analyzing')}</div>
      ) : isError ? (
        <p className="text-sm text-red-400">{apiError(error)}</p>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant={data?.source === 'openai' ? 'success' : 'secondary'}>{data?.source === 'openai' ? 'OpenAI' : t('finance.heuristicMode')}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setRun(false)}>{t('common.reset')}</Button>
          </div>
          <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">{data?.content}</pre>
        </div>
      )}
    </div>
  );
}

export default function AIInsights() {
  const { t } = useTranslation();
  const status = useAIStatus();
  useTeams({ limit: 1 });
  return (
    <div>
      <PageHeader
        title={t('pages.aiInsights.title')}
        subtitle={t('pages.aiInsights.subtitle')}
        action={<Badge variant={status.data?.enabled ? 'success' : 'warning'}>{status.data?.enabled ? t('finance.openaiConnected') : t('finance.heuristicMode')}</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {INSIGHT_KINDS.map((kind) => (
          <Card key={kind}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />{t(`aiInsights.items.${kind}.title`)}</CardTitle>
              <p className="text-sm text-muted-foreground">{t(`aiInsights.items.${kind}.desc`)}</p>
            </CardHeader>
            <CardContent><InsightPanel kind={kind} /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
