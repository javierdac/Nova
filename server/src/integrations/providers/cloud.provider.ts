import type { IntegrationDoc } from '../integration.model.js';

/**
 * A normalized cloud-billing line (one provider × service × month). The connector
 * turns these into Nova CloudCost rows. Same swap boundary as the other providers:
 * dummy vs live share one shape, so flipping `mode` is a one-field change.
 *
 * `provider` must be one of CloudCost's CLOUD_PROVIDERS (AWS/GCP here).
 * Real sources: AWS Cost Explorer / CUR, GCP Billing BigQuery export.
 */
export interface CloudBillingLine {
  externalId: string; // stable per row, e.g. "aws-2026-04-compute"
  provider: 'AWS' | 'GCP';
  service: string;
  year: number;
  month: number; // 1..12
  amount: number; // USD
  teamHint: string; // owning team → Nova Team
  note: string;
  url: string;
}

/**
 * Deterministic fake billing export: AWS + GCP, three months, with month-over-month
 * growth so the dashboard's growth alerts have something to flag. Spanish notes for
 * the demo. Fixed values keep syncs idempotent.
 */
export const dummyCloudProvider: CloudProvider = {
  async fetchBilling() {
    // base monthly cost per (provider, service); grows ~6-12% each month.
    const lines: Array<{ provider: 'AWS' | 'GCP'; service: string; base: number; growth: number; teamHint: string; note: string }> = [
      { provider: 'AWS', service: 'EC2 + EKS (cómputo)', base: 8200, growth: 0.08, teamHint: 'Platform', note: 'Escalado de cómputo por crecimiento de tráfico.' },
      { provider: 'AWS', service: 'RDS (base de datos)', base: 3100, growth: 0.05, teamHint: 'Platform', note: 'Instancia primaria + réplica de lectura.' },
      { provider: 'AWS', service: 'S3 + CloudFront', base: 1400, growth: 0.06, teamHint: 'Product Engineering', note: 'Almacenamiento de assets y CDN.' },
      { provider: 'GCP', service: 'BigQuery (analítica)', base: 2600, growth: 0.12, teamHint: 'Platform', note: 'Crecimiento fuerte: revisar consultas sin particionar.' },
      { provider: 'GCP', service: 'GKE (cómputo)', base: 1900, growth: 0.07, teamHint: 'Product Engineering', note: 'Cluster de servicios de producto.' },
    ];
    const months = [
      { year: 2026, month: 4 },
      { year: 2026, month: 5 },
      { year: 2026, month: 6 },
    ];

    const rows: CloudBillingLine[] = [];
    for (const l of lines) {
      const slug = l.service.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      months.forEach((mo, idx) => {
        const amount = Math.round(l.base * (1 + l.growth) ** idx);
        rows.push({
          externalId: `${l.provider.toLowerCase()}-${mo.year}-${String(mo.month).padStart(2, '0')}-${slug}`,
          provider: l.provider,
          service: l.service,
          year: mo.year,
          month: mo.month,
          amount,
          teamHint: l.teamHint,
          note: l.note,
          url: `https://billing.${l.provider.toLowerCase()}.example.com/${mo.year}/${mo.month}`,
        });
      });
    }
    return rows;
  },
};

export interface CloudProvider {
  fetchBilling(integration: IntegrationDoc): Promise<CloudBillingLine[]>;
}

/** Live provider stub — implement with AWS Cost Explorer / GCP Billing export. */
export const liveCloudProvider: CloudProvider = {
  async fetchBilling() {
    throw new Error('Cloud billing live provider not configured yet. Set credentials and implement fetchBilling().');
  },
};
