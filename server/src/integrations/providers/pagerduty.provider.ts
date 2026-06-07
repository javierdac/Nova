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

/** Live provider stub — implement with the PagerDuty REST API (GET /incidents). */
export const livePagerDutyProvider: PagerDutyProvider = {
  async fetchIncidents() {
    throw new Error('PagerDuty live provider not configured yet. Set credentials and implement fetchIncidents().');
  },
};
