import { useState, useCallback } from 'react';
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
  hasMore?: boolean;
  nextRow?: number;
  totalRows?: number;
  processedRows?: number;
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

interface SyncProgress {
  isActive: boolean;
  funnelId: string | null;
  totalRows: number;
  processedRows: number;
  imported: number;
  skipped: number;
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

// Hook for syncing a single funnel with progress tracking
export function useSyncFunnelWithProgress() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SyncProgress>({
    isActive: false,
    funnelId: null,
    totalRows: 0,
    processedRows: 0,
    imported: 0,
    skipped: 0,
  });

  const syncFunnel = useCallback(async (funnelId: string): Promise<SyncResult> => {
    let startRow = 2; // Start from row 2 (after header)
    let totalImported = 0;
    let totalSkipped = 0;
    let hasMore = true;
    let lastError: string | undefined;

    setProgress({
      isActive: true,
      funnelId,
      totalRows: 0,
      processedRows: 0,
      imported: 0,
      skipped: 0,
    });

    try {
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('import-leads-sheet', {
          body: {
            funnelId,
            action: 'import',
            startRow,
          },
        });

        if (error) {
          lastError = error.message;
          break;
        }

        const result = data as SyncResult;

        if (!result.success) {
          lastError = result.error;
          break;
        }

        totalImported += result.totalImported || 0;
        totalSkipped += result.totalSkipped || 0;
        hasMore = result.hasMore || false;

        setProgress(prev => ({
          ...prev,
          totalRows: result.totalRows || prev.totalRows,
          processedRows: result.processedRows || prev.processedRows,
          imported: totalImported,
          skipped: totalSkipped,
        }));

        if (hasMore && result.nextRow) {
          startRow = result.nextRow;
        }
      }

      // Invalidate queries after sync
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnels'] });

      if (lastError) {
        toast.error(`Erro na sincronização: ${lastError}`);
        return { success: false, error: lastError };
      }

      if (totalImported > 0) {
        toast.success(`${totalImported} leads importados com sucesso!`);
      } else if (totalSkipped > 0) {
        toast.info(`Nenhum lead novo encontrado. ${totalSkipped} já existentes.`);
      } else {
        toast.info('Sincronização concluída. Nenhum lead para importar.');
      }

      return {
        success: true,
        totalImported,
        totalSkipped,
      };
    } finally {
      setProgress(prev => ({ ...prev, isActive: false }));
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setProgress({
      isActive: false,
      funnelId: null,
      totalRows: 0,
      processedRows: 0,
      imported: 0,
      skipped: 0,
    });
  }, []);

  return { syncFunnel, progress, reset };
}

// Simpler hook for basic sync without progress (backward compatible)
export function useSyncFunnel() {
  const { syncFunnel, progress } = useSyncFunnelWithProgress();

  return useMutation({
    mutationFn: async ({ funnelId }: SyncFunnelParams): Promise<SyncResult> => {
      return syncFunnel(funnelId);
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
