import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { CLOUD_PROVIDERS } from '../../modules/finance/models/cloudCost.model.js';
import type { IntegrationDoc } from '../integration.model.js';

type CloudProviderName = (typeof CLOUD_PROVIDERS)[number];

/**
 * A normalized cloud-billing line (one provider × service × month). The connector
 * turns these into Nova CloudCost rows. Same swap boundary as the other providers:
 * dummy vs live share one shape, so flipping `mode` is a one-field change.
 *
 * `provider` must be one of CloudCost's CLOUD_PROVIDERS.
 * Real sources: AWS Cost Explorer / CUR, GCP Billing BigQuery export, o un FinOps
 * tool — todos pueden exponerse como un export JSON que el live provider consume.
 */
export interface CloudBillingLine {
  externalId: string; // stable per row, e.g. "aws-2026-04-compute"
  provider: CloudProviderName;
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

const VALID_PROVIDERS = new Set<string>(CLOUD_PROVIDERS);

/** Fila tal cual la entrega el export de facturación (JSON). */
interface BillingRow {
  provider?: string;
  service?: string;
  year?: number;
  month?: number;
  amount?: number;
  team?: string;
  note?: string;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function resolveCfg(integration: IntegrationDoc) {
  const cfg = (integration.config ?? {}) as { billingUrl?: string; token?: string };
  return { url: cfg.billingUrl || env.CLOUD_BILLING_URL, token: cfg.token || env.CLOUD_BILLING_TOKEN };
}

/**
 * Live provider: lee un export de facturación en JSON desde un endpoint HTTP
 * (CUR de AWS, export de BigQuery de GCP, o un FinOps tool como Vantage/CloudHealth).
 * Espera un array de filas `{ provider, service, year, month, amount, team?, note? }`
 * (o `{ rows: [...] }`). Mapea a la misma forma que el dummy → connector sin cambios.
 *
 * Nota: llamar directo a AWS Cost Explorer (SigV4) o a la BigQuery API de GCP es un
 * refinamiento posterior (requiere SDKs/credenciales por nube); el export JSON es el
 * camino agnóstico y cubre todos los proveedores a la vez.
 */
export const liveCloudProvider: CloudProvider = {
  async fetchBilling(integration) {
    const { url, token } = resolveCfg(integration);
    if (!url) {
      throw new Error('Falta CLOUD_BILLING_URL (endpoint de export de facturación) para el modo live.');
    }

    let res: Response;
    try {
      res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' } });
    } catch (e) {
      throw new Error(`No se pudo conectar al endpoint de facturación: ${(e as Error).message}`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Endpoint de facturación ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as BillingRow[] | { rows?: BillingRow[] };
    const rows = Array.isArray(json) ? json : json.rows;
    if (!Array.isArray(rows)) {
      throw new Error('El export de facturación debe ser un array de filas (o { rows: [...] }).');
    }

    const out: CloudBillingLine[] = [];
    let skipped = 0;
    for (const r of rows) {
      const provider = String(r.provider ?? '');
      if (!VALID_PROVIDERS.has(provider) || !r.service || !r.year || !r.month || typeof r.amount !== 'number') {
        skipped += 1;
        continue;
      }
      out.push({
        externalId: `${provider.toLowerCase()}-${r.year}-${String(r.month).padStart(2, '0')}-${slug(r.service)}`,
        provider: provider as CloudProviderName,
        service: r.service,
        year: r.year,
        month: r.month,
        amount: r.amount,
        teamHint: r.team ?? '',
        note: r.note ?? '',
        url,
      });
    }

    logger.info({ rows: out.length, skipped }, 'Cloud billing live sync: filas mapeadas');
    return out;
  },
};
