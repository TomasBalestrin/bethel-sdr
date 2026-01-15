import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateCRMColumn, useUpdateCRMColumn, useCRMColumns } from '@/hooks/useCRMColumns';
import type { CrmColumn } from '@/types/database';

const columnSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  position: z.number().int().positive('Posição deve ser um número positivo'),
  editable: z.boolean().default(true),
});

type ColumnFormData = z.infer<typeof columnSchema>;

interface CRMColumnFormModalProps {
  column?: CrmColumn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CRMColumnFormModal({ column, open, onOpenChange }: CRMColumnFormModalProps) {
  const isEditing = !!column;
  const { data: columns } = useCRMColumns();
  const createColumn = useCreateCRMColumn();
  const updateColumn = useUpdateCRMColumn();

  const nextPosition = (columns?.length || 0) + 1;

  const form = useForm<ColumnFormData>({
    resolver: zodResolver(columnSchema),
    defaultValues: isEditing
      ? {
          name: column.name,
          color: column.color,
          position: column.position,
          editable: column.editable,
        }
      : {
          name: '',
          color: '#64748b',
          position: nextPosition,
          editable: true,
        },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && column) {
        form.reset({
          name: column.name,
          color: column.color,
          position: column.position,
          editable: column.editable,
        });
      } else {
        form.reset({
          name: '',
          color: '#64748b',
          position: (columns?.length || 0) + 1,
          editable: true,
        });
      }
    }
  }, [open, column, isEditing, form, columns]);

  const onSubmit = async (data: ColumnFormData) => {
    const columnData = {
      name: data.name,
      color: data.color,
      position: data.position,
      editable: data.editable,
    };

    if (isEditing && column) {
      updateColumn.mutate(
        { id: column.id, ...columnData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createColumn.mutate(columnData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createColumn.isPending || updateColumn.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle>
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
                    <Input placeholder="Nome da coluna" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormControl>
                      <Input 
                        type="color" 
                        className="w-16 h-10 p-1 cursor-pointer"
                        {...field} 
                      />
                    </FormControl>
                    <Input 
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="#64748b"
                      className="flex-1"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posição</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="editable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Editável</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Permite edição da coluna
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
