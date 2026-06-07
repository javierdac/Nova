import { Schema, type Model } from 'mongoose';

/** Systems that can own a record. `manual` = created/edited in the Nova UI. */
export const SOURCE_SYSTEMS = ['manual', 'github', 'jira', 'pagerduty', 'cloud'] as const;
export type SourceSystem = (typeof SOURCE_SYSTEMS)[number];

/**
 * Provenance sub-document. Embedded into any domain model that can receive data
 * from an external system so syncs can upsert idempotently and the UI can show
 * "synced from X" without clobbering manually-edited records.
 */
export const sourceSchema = new Schema(
  {
    system: { type: String, enum: SOURCE_SYSTEMS, default: 'manual', index: true },
    externalId: { type: String, index: true },
    externalUrl: { type: String },
    lastSyncedAt: { type: Date },
  },
  { _id: false },
);

/**
 * Idempotent upsert keyed by (source.system, externalId). Re-running a sync
 * never duplicates; only the fields in `data` are written, so manual edits to
 * other fields survive. Returns whether the row was created or updated.
 */
export async function upsertBySource<T>(
  model: Model<T>,
  system: SourceSystem,
  externalId: string,
  data: Record<string, unknown>,
  externalUrl?: string,
): Promise<{ created: boolean; updated: boolean }> {
  const res = await model.updateOne(
    { 'source.system': system, 'source.externalId': externalId },
    {
      $set: {
        ...data,
        'source.system': system,
        'source.externalId': externalId,
        'source.externalUrl': externalUrl,
        'source.lastSyncedAt': new Date(),
      },
    },
    { upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  return { created: (res.upsertedCount ?? 0) > 0, updated: (res.modifiedCount ?? 0) > 0 };
}
