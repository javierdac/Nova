import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SyncRun {
  _id: string;
  provider: string;
  status: 'success' | 'error';
  mode: 'dummy' | 'live';
  created: number;
  updated: number;
  durationMs: number;
  error?: string;
  createdAt: string;
}

export interface Integration {
  provider: 'github' | 'jira';
  status: 'connected' | 'disconnected' | 'error';
  mode: 'dummy' | 'live';
  lastSyncAt: string | null;
  lastError: string | null;
  lastRun: SyncRun | null;
}

export const useIntegrations = () =>
  useQuery({ queryKey: ['integrations'], queryFn: async () => (await api.get('/integrations')).data.data as Integration[] });

export const useIntegrationMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['integrations'] });
  return {
    sync: useMutation({
      mutationFn: (provider: string) => api.post(`/integrations/${provider}/sync`),
      onSuccess: invalidate,
    }),
    configure: useMutation({
      mutationFn: ({ provider, body }: { provider: string; body: { mode?: string; status?: string } }) =>
        api.patch(`/integrations/${provider}`, body),
      onSuccess: invalidate,
    }),
  };
};
