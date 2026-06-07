import { useTranslation } from 'react-i18next';
import { useScorecard, type Dimension } from '@/api/leadership';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState, ErrorState } from '@/components/shared/States';
import { Card, CardContent } from '@/components/ui/card';
import { ChartCard, TrendLine } from '@/components/charts/Charts';
import { apiError } from '@/lib/api';

const toneFor = (score: number, target: number) =>
  score >= target ? 'bg-green-500' : score >= target - 15 ? 'bg-amber-500' : 'bg-red-500';

export default function Scorecard() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useScorecard();
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={apiError(error)} />;
  const d = data!;

  const ring = d.global >= d.target ? 'text-green-500' : d.global >= d.target - 15 ? 'text-amber-500' : 'text-red-500';
  const trendData = d.trend.map((p) => ({ date: p.label, score: p.score }));

  return (
    <div>
      <PageHeader title={t('pages.scorecard.title')} subtitle={t('pages.scorecard.subtitle')} />

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className={`text-6xl font-bold ${ring}`}>{d.global}</div>
            <div className="mt-1 text-sm text-muted-foreground">/ 100 · {t('scorecard.target')} {d.target}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {t('scorecard.weakest')}: <span className="font-medium">{t(`scorecard.dim.${d.weakest}`)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 pt-6">
            {d.dimensions.map((dim) => (
              <div key={dim.dimension}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{t(`scorecard.dim.${dim.dimension as Dimension}`)}</span>
                  <span className="text-muted-foreground">{dim.score} / 100</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${toneFor(dim.score, dim.target)}`} style={{ width: `${dim.score}%` }} />
                  {/* target marker */}
                  <div className="absolute top-0 h-full w-0.5 bg-foreground/40" style={{ left: `${dim.target}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <ChartCard title={t('scorecard.trendTitle')}>
        <TrendLine data={trendData} dataKey="score" />
      </ChartCard>
    </div>
  );
}
