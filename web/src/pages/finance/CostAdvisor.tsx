import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCostAdvice } from '@/api/finance';
import { useAIStatus } from '@/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiError } from '@/lib/api';

export default function CostAdvisor() {
  const { t } = useTranslation();
  const [run, setRun] = useState(false);
  const status = useAIStatus();
  const { data, isFetching, isError, error } = useCostAdvice(run);

  return (
    <div>
      <PageHeader
        title={t('pages.costAdvisor.title')}
        subtitle={t('pages.costAdvisor.subtitle')}
        action={<Badge variant={status.data?.enabled ? 'success' : 'warning'}>{status.data?.enabled ? t('finance.openaiConnected') : t('finance.heuristicMode')}</Badge>}
      />
      <IntegrationNotice sources={['cloud', 'pagerduty']} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> {t('pages.costAdvisor.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!run ? (
            <Button onClick={() => setRun(true)}><Sparkles className="h-4 w-4" /> {t('finance.analyzeCosts')}</Button>
          ) : isFetching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.analyzing')}</div>
          ) : isError ? (
            <p className="text-sm text-red-400">{apiError(error)}</p>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant={data?.source === 'openai' ? 'success' : 'secondary'}>{data?.source === 'openai' ? 'OpenAI' : t('finance.heuristicMode')}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setRun(false)}>{t('common.reset')}</Button>
              </div>
              <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">{data?.content}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
