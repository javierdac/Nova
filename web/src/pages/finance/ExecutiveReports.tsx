import { useState } from 'react';
import { FileText, Loader2, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWeeklyCostReport } from '@/api/finance';
import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationNotice } from '@/components/shared/IntegrationNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiError } from '@/lib/api';
import { exportToPDF } from '@/lib/export';

export default function ExecutiveReports() {
  const { t } = useTranslation();
  const [run, setRun] = useState(false);
  const { data, isFetching, isError, error } = useWeeklyCostReport(run);

  const printReport = () => {
    if (!data) return;
    const html = `<h1>${t('finance.reportTitle')}</h1><p class="muted">${t('finance.generatedBy')}${data.source}</p><pre>${data.content}</pre>`;
    exportToPDF(t('finance.reportTitle'), html);
  };

  return (
    <div>
      <PageHeader title={t('pages.executiveReports.title')} subtitle={t('pages.executiveReports.subtitle')} />
      <IntegrationNotice sources={['cloud', 'pagerduty']} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> {t('pages.executiveReports.title')}</CardTitle>
          {data && <Button variant="outline" size="sm" onClick={printReport}><Printer className="h-4 w-4" /> {t('common.exportPdf')}</Button>}
        </CardHeader>
        <CardContent>
          {!run ? (
            <Button onClick={() => setRun(true)}><FileText className="h-4 w-4" /> {t('finance.generateReport')}</Button>
          ) : isFetching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.analyzing')}</div>
          ) : isError ? (
            <p className="text-sm text-red-400">{apiError(error)}</p>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant={data?.source === 'openai' ? 'success' : 'secondary'}>{data?.source === 'openai' ? 'OpenAI' : t('finance.heuristicMode')}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setRun(false)}>{t('common.generate')}</Button>
              </div>
              <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">{data?.content}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
