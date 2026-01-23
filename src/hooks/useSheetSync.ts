import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestConnectionParams {
  sheetUrl: string;
  sheetName: string;
}

interface FetchHeadersParams {
  sheetUrl: string;
  sheetName: string;
}

interface SyncFunnelParams {
  funnelId: string;
}

interface SyncResult {
  success: boolean;
  totalImported?: number;
  totalSkipped?: number;
  results?: Array<{
    funnelId: string;
    funnelName: string;
    imported: number;
    skipped: number;
    errors: string[];
  }>;
  error?: string;
  headers?: string[];
  message?: string;
}

export function useTestSheetConnection() {
  return useMutation({
    mutationFn: async ({ sheetUrl, sheetName }: TestConnectionParams): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('import-leads-sheet', {
        body: {
          action: 'test-connection',
          sheetUrl,
          sheetName,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Conexão estabelecida com sucesso!');
    },
    onError: (error) => {
      console.error('Test connection error:', error);
      toast.error('Erro ao conectar com a planilha');
    },
  });
}

export function useFetchSheetHeaders() {
  return useMutation({
    mutationFn: async ({ sheetUrl, sheetName }: FetchHeadersParams): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('import-leads-sheet', {
        body: {
          action: 'fetch-headers',
          sheetUrl,
          sheetName,
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Fetch headers error:', error);
      toast.error('Erro ao buscar colunas da planilha');
    },
  });
}

export function useSyncFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ funnelId }: SyncFunnelParams): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('import-leads-sheet', {
        body: {
          funnelId,
          action: 'import',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      
      if (data.totalImported && data.totalImported > 0) {
        toast.success(`${data.totalImported} leads importados com sucesso!`);
      } else if (data.totalSkipped && data.totalSkipped > 0) {
        toast.info(`Nenhum lead novo encontrado. ${data.totalSkipped} já existentes.`);
      } else {
        toast.info('Sincronização concluída. Nenhum lead para importar.');
      }
    },
    onError: (error) => {
      console.error('Sync funnel error:', error);
      toast.error('Erro ao sincronizar leads da planilha');
    },
  });
}

export function useSyncAllFunnels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke('import-leads-sheet', {
        body: {
          syncAll: true,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      
      if (data.totalImported && data.totalImported > 0) {
        toast.success(`${data.totalImported} leads importados de ${data.results?.length || 0} funis!`);
      } else {
        toast.info('Sincronização concluída. Nenhum lead novo para importar.');
      }
    },
    onError: (error) => {
      console.error('Sync all funnels error:', error);
      toast.error('Erro ao sincronizar funis');
    },
  });
}
