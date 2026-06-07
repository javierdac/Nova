import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import type { IntegrationDoc } from '../integration.model.js';

/**
 * A normalized PagerDuty/Opsgenie incident. The connector turns these into Nova
 * Incidents (reliability + MTTR). Same swap boundary as GitHub/Jira: dummy vs
 * live share one shape, so flipping `mode` is a one-field change, no code edits.
 *
 * `urgency` (PagerDuty's own field) maps to Nova severity SEV1..SEV4.
 * `state` maps to Nova's incident status.
 */
export interface PagerDutyIncident {
  externalId: string; // PagerDuty incident id (e.g. "PT4KHLK")
  title: string;
  description: string;
  urgency: 'critical' | 'high' | 'low' | 'info';
  state: 'triggered' | 'acknowledged' | 'resolved';
  serviceHint: string; // PagerDuty service → Nova team
  detectedAt: string; // ISO
  resolvedAt?: string; // ISO, present when state === 'resolved'
  affectedUsers: number;
  url: string;
}

/**
 * Deterministic fake on-call feed. Spanish content so it reads naturally in the
 * demo. Fixed timestamps keep syncs idempotent and MTTR reproducible.
 */
export const dummyPagerDutyProvider: PagerDutyProvider = {
  async fetchIncidents() {
    const incidents: Omit<PagerDutyIncident, 'externalId' | 'url'>[] = [
      {
        title: 'Caída del checkout: errores 5xx en el gateway de pagos',
        description: 'El servicio de pagos devolvió 5xx de forma masiva tras un deploy. Se hizo rollback.',
        urgency: 'critical',
        state: 'resolved',
        serviceHint: 'Product Engineering',
        detectedAt: '2026-06-02T14:12:00.000Z',
        resolvedAt: '2026-06-02T14:54:00.000Z',
        affectedUsers: 3200,
      },
      {
        title: 'Latencia alta en la base de datos principal',
        description: 'Consultas lentas por un índice faltante; saturación de conexiones en horario pico.',
        urgency: 'high',
        state: 'resolved',
        serviceHint: 'Platform',
        detectedAt: '2026-06-04T09:30:00.000Z',
        resolvedAt: '2026-06-04T11:05:00.000Z',
        affectedUsers: 850,
      },
      {
        title: 'Fallo de login con proveedor SSO',
        description: 'El proveedor de identidad rechazó tokens válidos durante ~20 min.',
        urgency: 'high',
        state: 'acknowledged',
        serviceHint: 'Platform',
        detectedAt: '2026-06-06T08:45:00.000Z',
        affectedUsers: 410,
      },
      {
        title: 'Cola de notificaciones atrasada',
        description: 'El worker de emails acumuló backlog; los envíos llegan con demora.',
        urgency: 'low',
        state: 'triggered',
        serviceHint: 'Product Engineering',
        detectedAt: '2026-06-06T10:20:00.000Z',
        affectedUsers: 120,
      },
    ];
    return incidents.map((i, idx) => ({
      ...i,
      externalId: `pd-${5000 + idx}`,
      url: `https://acme.pagerduty.com/incidents/PT4KHL${idx}`,
    }));
  },
};

export interface PagerDutyProvider {
  fetchIncidents(integration: IntegrationDoc): Promise<PagerDutyIncident[]>;
}

const PD_API = 'https://api.pagerduty.com';
const LOOKBACK_DAYS = 90; // ventana de pull (sin cursor incremental todavía)
const PAGE_LIMIT = 100; // máximo que permite PagerDuty por página
const MAX_PAGES = 5; // tope de seguridad → hasta 500 incidentes por sync

/** Shape parcial del incidente que devuelve la REST API v2 de PagerDuty. */
interface PagerDutyApiIncident {
  id: string;
  title: string;
  description?: string;
  status: 'triggered' | 'acknowledged' | 'resolved';
  urgency: 'high' | 'low';
  created_at: string;
  last_status_change_at?: string;
  html_url: string;
  service?: { summary?: string };
  priority?: { summary?: string } | null;
}

/** Prioridad configurada (P1..P5) o, si no hay, la urgencia → severidad de Nova. */
function severityFrom(inc: PagerDutyApiIncident): PagerDutyIncident['urgency'] {
  const p = inc.priority?.summary?.toUpperCase() ?? '';
  if (p.includes('P1')) return 'critical';
  if (p.includes('P2')) return 'high';
  if (p.includes('P3')) return 'low';
  if (p.includes('P4') || p.includes('P5')) return 'info';
  return inc.urgency === 'high' ? 'high' : 'low';
}

/** Token desde la config de la integración (futuro: cifrada) o desde env. */
function resolveToken(integration: IntegrationDoc): string | undefined {
  const cfg = (integration.config ?? {}) as { apiToken?: string };
  return cfg.apiToken || env.PAGERDUTY_API_TOKEN;
}

/**
 * Live provider: PagerDuty REST API (GET /incidents).
 * Auth con API token (`Authorization: Token token=<KEY>`), paginado, ventana de
 * 90 días. Devuelve la misma forma que el dummy, así el connector no cambia.
 */
export const livePagerDutyProvider: PagerDutyProvider = {
  async fetchIncidents(integration) {
    const token = resolveToken(integration);
    if (!token) {
      throw new Error('Falta PAGERDUTY_API_TOKEN. Configurá la credencial para usar el modo live.');
    }

    const since = new Date(Date.now() - LOOKBACK_DAYS * 864e5).toISOString();
    const out: PagerDutyIncident[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        since,
        limit: String(PAGE_LIMIT),
        offset: String(page * PAGE_LIMIT),
        sort_by: 'created_at:desc',
        time_zone: 'UTC',
      });
      for (const s of ['triggered', 'acknowledged', 'resolved']) params.append('statuses[]', s);

      const res = await fetch(`${PD_API}/incidents?${params.toString()}`, {
        headers: {
          Authorization: `Token token=${token}`,
          Accept: 'application/vnd.pagerduty+json;version=2',
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`PagerDuty API ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as { incidents?: PagerDutyApiIncident[]; more?: boolean };
      for (const inc of data.incidents ?? []) {
        out.push({
          externalId: inc.id,
          title: inc.title,
          description: inc.description ?? inc.title,
          urgency: severityFrom(inc),
          state: inc.status,
          serviceHint: inc.service?.summary ?? '',
          detectedAt: inc.created_at,
          resolvedAt: inc.status === 'resolved' ? inc.last_status_change_at : undefined,
          affectedUsers: 0, // PagerDuty no expone usuarios afectados en /incidents.
          url: inc.html_url,
        });
      }
      if (!data.more) break;
    }

    logger.info({ count: out.length, since }, 'PagerDuty live sync: incidentes traídos');
    return out;
  },
};
