import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateFunnel, useUpdateFunnel } from '@/hooks/useFunnels';
import type { Funnel } from '@/types/database';

const funnelSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  google_sheet_url: z.string().url('URL inválida').optional().or(z.literal('')),
  sheet_name: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
});

type FunnelFormData = z.infer<typeof funnelSchema>;

interface FunnelFormModalProps {
  funnel?: Funnel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FunnelFormModal({ funnel, open, onOpenChange }: FunnelFormModalProps) {
  const isEditing = !!funnel;
  const createFunnel = useCreateFunnel();
  const updateFunnel = useUpdateFunnel();

  const form = useForm<FunnelFormData>({
    resolver: zodResolver(funnelSchema),
    defaultValues: isEditing
      ? {
          name: funnel.name,
          google_sheet_url: funnel.google_sheet_url || '',
          sheet_name: funnel.sheet_name || '',
          active: funnel.active,
        }
      : {
          name: '',
          google_sheet_url: '',
          sheet_name: '',
          active: true,
        },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && funnel) {
        form.reset({
          name: funnel.name,
          google_sheet_url: funnel.google_sheet_url || '',
          sheet_name: funnel.sheet_name || '',
          active: funnel.active,
        });
      } else {
        form.reset({
          name: '',
          google_sheet_url: '',
          sheet_name: '',
          active: true,
        });
      }
    }
  }, [open, funnel, isEditing, form]);

  const onSubmit = async (data: FunnelFormData) => {
    const funnelData = {
      name: data.name,
      google_sheet_url: data.google_sheet_url || null,
      sheet_name: data.sheet_name || null,
      column_mapping: null,
      active: data.active,
    };

    if (isEditing && funnel) {
      updateFunnel.mutate(
        { id: funnel.id, ...funnelData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createFunnel.mutate(funnelData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createFunnel.isPending || updateFunnel.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Funil' : 'Novo Funil'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="google_sheet_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Google Sheets (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://docs.google.com/spreadsheets/d/..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sheet_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da aba (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Leads" {...field} />
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
                    <p className="text-sm text-muted-foreground">
                      Funil disponível para uso
                    </p>
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
