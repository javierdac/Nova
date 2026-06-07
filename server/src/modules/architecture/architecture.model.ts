import { Schema, model, type InferSchemaType } from 'mongoose';

const architectureSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: {
      type: String,
      enum: ['service', 'api', 'database', 'queue', 'cache', 'external', 'frontend', 'job'],
      required: true,
      index: true,
    },
    description: { type: String, maxlength: 2000 },
    lifecycle: { type: String, enum: ['planned', 'active', 'deprecated', 'retired'], default: 'active', index: true },
    tier: { type: String, enum: ['tier1', 'tier2', 'tier3'], default: 'tier2', index: true },
    repoUrl: { type: String },
    docsUrl: { type: String },
    runbookUrl: { type: String },
    language: { type: String },
    // Ownership
    ownerTeam: { type: Schema.Types.ObjectId, ref: 'Team', index: true },
    ownerUser: { type: Schema.Types.ObjectId, ref: 'User' },
    // Dependencies on other components (directed edges) for the graph view.
    dependencies: [{ type: Schema.Types.ObjectId, ref: 'ArchitectureComponent' }],
    // API-specific metadata.
    apiSpec: {
      protocol: { type: String, enum: ['rest', 'graphql', 'grpc', 'soap', 'websocket'] },
      version: { type: String },
      baseUrl: { type: String },
    },
    // Database-specific metadata.
    dbSpec: {
      engine: { type: String },
      version: { type: String },
      multiTenant: { type: Boolean },
    },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'architecturecomponents' },
);

// `language_override` points the text index at a non-existent field so the
// component's own `language` field (e.g. "TypeScript") is NOT misread by Mongo
// as a per-document text-search language override.
architectureSchema.index({ name: 'text', description: 'text' }, { language_override: 'searchLanguage' });

export type ArchitectureDoc = InferSchemaType<typeof architectureSchema>;
export const ArchitectureModel = model<ArchitectureDoc>('ArchitectureComponent', architectureSchema);
