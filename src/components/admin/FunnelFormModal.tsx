import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useCreateFunnel, useUpdateFunnel } from '@/hooks/useFunnels';
import { useTestSheetConnection } from '@/hooks/useSheetSync';
import { SheetColumnMapper } from './SheetColumnMapper';
import type { Funnel } from '@/types/database';
import { Loader2, CheckCircle2, Link2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const funnelSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  google_sheet_url: z.string().url('URL inválida').optional().or(z.literal('')),
  sheet_name: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
  auto_sync_enabled: z.boolean().default(false),
});

type FunnelFormData = z.infer<typeof funnelSchema>;

interface ColumnMapping {
  full_name?: string;
  phone?: string;
  email?: string;
  state?: string;
  instagram?: string;
  niche?: string;
  business_name?: string;
  business_position?: string;
  revenue?: string;
  main_pain?: string;
  has_partner?: string;
  knows_specialist_since?: string;
  date_column?: string;
}

interface FunnelFormModalProps {
  funnel?: Funnel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FunnelFormModal({ funnel, open, onOpenChange }: FunnelFormModalProps) {
  const isEditing = !!funnel;
  const createFunnel = useCreateFunnel();
  const updateFunnel = useUpdateFunnel();
  const testConnection = useTestSheetConnection();
  
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [connectionTested, setConnectionTested] = useState(false);
  const [importFromDate, setImportFromDate] = useState<Date>(new Date(2026, 0, 1));

  const form = useForm<FunnelFormData>({
    resolver: zodResolver(funnelSchema),
    defaultValues: isEditing
      ? {
          name: funnel.name,
          google_sheet_url: funnel.google_sheet_url || '',
          sheet_name: funnel.sheet_name || '',
          active: funnel.active,
          auto_sync_enabled: funnel.auto_sync_enabled ?? false,
        }
      : {
          name: '',
          google_sheet_url: '',
          sheet_name: '',
          active: true,
          auto_sync_enabled: false,
        },
  });

  const watchSheetUrl = form.watch('google_sheet_url');
  const watchSheetName = form.watch('sheet_name');
  const hasSheetConfig = !!watchSheetUrl && !!watchSheetName;

  useEffect(() => {
    if (open) {
      if (isEditing && funnel) {
        form.reset({
          name: funnel.name,
          google_sheet_url: funnel.google_sheet_url || '',
          sheet_name: funnel.sheet_name || '',
          active: funnel.active,
          auto_sync_enabled: funnel.auto_sync_enabled ?? false,
        });
        setColumnMapping((funnel.column_mapping as ColumnMapping) || {});
        setImportFromDate(funnel.import_from_date ? new Date(funnel.import_from_date + 'T00:00:00') : new Date(2026, 0, 1));
      } else {
        form.reset({
          name: '',
          google_sheet_url: '',
          sheet_name: '',
          active: true,
          auto_sync_enabled: false,
        });
        setColumnMapping({});
        setImportFromDate(new Date(2026, 0, 1));
      }
      setConnectionTested(false);
    }
  }, [open, funnel, isEditing, form]);

  // Reset connection tested when URL or sheet name changes
  useEffect(() => {
    setConnectionTested(false);
  }, [watchSheetUrl, watchSheetName]);

  const handleTestConnection = async () => {
    if (!watchSheetUrl || !watchSheetName) return;

    try {
      const result = await testConnection.mutateAsync({
        sheetUrl: watchSheetUrl,
        sheetName: watchSheetName,
      });

      if (result.success) {
        setConnectionTested(true);
      }
    } catch {
      // Errors are handled (toast) by the mutation onError; avoid unhandled rejections.
    }
  };

  const onSubmit = async (data: FunnelFormData) => {
    const mappingToSave = hasSheetConfig && Object.keys(columnMapping).length > 0 
      ? columnMapping as Record<string, string>
      : null;

    const importDateStr = format(importFromDate, 'yyyy-MM-dd');

    if (isEditing && funnel) {
      updateFunnel.mutate(
        { 
          id: funnel.id,
          name: data.name,
          google_sheet_url: data.google_sheet_url || null,
          sheet_name: data.sheet_name || null,
          column_mapping: mappingToSave,
          active: data.active,
          auto_sync_enabled: data.auto_sync_enabled,
          import_from_date: importDateStr,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createFunnel.mutate(
        {
          name: data.name,
          google_sheet_url: data.google_sheet_url || null,
          sheet_name: data.sheet_name || null,
          column_mapping: mappingToSave,
          active: data.active,
          auto_sync_enabled: data.auto_sync_enabled,
          last_sync_at: null,
          sync_interval_minutes: 30,
          import_from_date: importDateStr,
        }, 
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isPending = createFunnel.isPending || updateFunnel.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Funil' : 'Novo Funil'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do funil" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription>
                      Funil disponível para uso
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            {/* Google Sheets Integration */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Integração Google Sheets
              </h3>

              <FormField
                control={form.control}
                name="google_sheet_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Planilha</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://docs.google.com/spreadsheets/d/..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      A planilha deve estar compartilhada com a Service Account do sistema
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="sheet_name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Nome da Aba</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Leads" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant={connectionTested ? 'outline' : 'secondary'}
                    onClick={handleTestConnection}
                    disabled={!hasSheetConfig || testConnection.isPending}
                  >
                    {testConnection.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : connectionTested ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    {connectionTested ? 'Conectado' : 'Testar Conexão'}
                  </Button>
                </div>
              </div>

              {/* Column Mapping */}
              {hasSheetConfig && (
                <SheetColumnMapper
                  sheetUrl={watchSheetUrl!}
                  sheetName={watchSheetName!}
                  value={columnMapping}
                  onChange={setColumnMapping}
                />
              )}

              {/* Import From Date */}
              {hasSheetConfig && (
                <div className="space-y-2">
                  <FormLabel>Importar a partir de</FormLabel>
                  <FormDescription>
                    Somente leads com data igual ou posterior serão importados
                  </FormDescription>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !importFromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {importFromDate ? format(importFromDate, "dd/MM/yyyy") : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={importFromDate}
                        onSelect={(date) => date && setImportFromDate(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {hasSheetConfig && (
                <FormField
                  control={form.control}
                  name="auto_sync_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                      <div className="space-y-0.5">
                        <FormLabel>Sincronização Automática</FormLabel>
                        <FormDescription>
                          Importar leads automaticamente a cada 30 minutos
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
