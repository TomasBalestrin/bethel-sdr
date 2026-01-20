import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useCreateQualificationRule, 
  useUpdateQualificationRule,
  QualificationRuleWithFunnel 
} from '@/hooks/useQualificationRules';
import { useFunnels } from '@/hooks/useFunnels';

const conditionSchema = z.object({
  field: z.string().min(1, 'Campo obrigatório'),
  operator: z.string().min(1, 'Operador obrigatório'),
  value: z.union([z.string(), z.number()]),
  logic: z.enum(['AND', 'OR']).optional(),
});

const formSchema = z.object({
  rule_name: z.string().min(1, 'Nome é obrigatório'),
  funnel_id: z.string().nullable(),
  conditions: z.array(conditionSchema).min(1, 'Adicione pelo menos uma condição'),
  qualification_label: z.string().min(1, 'Label obrigatório'),
  classification: z.string().nullable(),
  priority: z.number().min(1).max(100),
  active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const FIELDS = [
  { id: 'revenue', label: 'Faturamento' },
  { id: 'business_position', label: 'Posição no Negócio' },
  { id: 'niche', label: 'Nicho' },
  { id: 'state', label: 'Estado' },
  { id: 'has_partner', label: 'Tem Sócio' },
  { id: 'knows_specialist_since', label: 'Tempo que Conhece' },
  { id: 'main_pain', label: 'Principal Dor' },
];

const OPERATORS = [
  { id: 'equals', label: 'Igual a' },
  { id: 'not_equals', label: 'Diferente de' },
  { id: 'greater_than', label: 'Maior que' },
  { id: 'less_than', label: 'Menor que' },
  { id: 'contains', label: 'Contém' },
  { id: 'not_contains', label: 'Não contém' },
];

const CLASSIFICATIONS = [
  { id: 'diamante', label: 'Diamante' },
  { id: 'ouro', label: 'Ouro' },
  { id: 'prata', label: 'Prata' },
  { id: 'bronze', label: 'Bronze' },
];

interface QualificationRuleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: QualificationRuleWithFunnel | null;
  defaultFunnelId?: string;
}

export function QualificationRuleFormModal({
  open,
  onOpenChange,
  rule,
  defaultFunnelId,
}: QualificationRuleFormModalProps) {
  const { data: funnels } = useFunnels();
  const createRule = useCreateQualificationRule();
  const updateRule = useUpdateQualificationRule();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rule_name: '',
      funnel_id: null,
      conditions: [{ field: 'revenue', operator: 'greater_than', value: '', logic: undefined }],
      qualification_label: '',
      classification: null,
      priority: 1,
      active: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'conditions',
  });

  useEffect(() => {
    if (rule) {
      form.reset({
        rule_name: rule.rule_name,
        funnel_id: rule.funnel_id,
        conditions: rule.conditions.length > 0 ? rule.conditions : [{ field: 'revenue', operator: 'greater_than', value: '', logic: undefined }],
        qualification_label: rule.qualification_label,
        classification: rule.classification,
        priority: rule.priority,
        active: rule.active,
      });
    } else {
      form.reset({
        rule_name: '',
        funnel_id: defaultFunnelId || null,
        conditions: [{ field: 'revenue', operator: 'greater_than', value: '', logic: undefined }],
        qualification_label: '',
        classification: null,
        priority: 1,
        active: true,
      });
    }
  }, [rule, defaultFunnelId, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      rule_name: values.rule_name,
      funnel_id: values.funnel_id === 'all' ? null : values.funnel_id,
      conditions: values.conditions.map((c, i) => ({
        field: c.field,
        operator: c.operator as 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains',
        value: c.value,
        logic: i > 0 ? (c.logic || 'AND') : undefined,
      })),
      qualification_label: values.qualification_label,
      classification: values.classification === 'none' ? null : values.classification,
      priority: values.priority,
      active: values.active,
    };

    if (rule) {
      await updateRule.mutateAsync({ 
        id: rule.id, 
        rule_name: payload.rule_name,
        funnel_id: payload.funnel_id,
        conditions: payload.conditions as any,
        qualification_label: payload.qualification_label,
        classification: payload.classification as any,
        priority: payload.priority,
        active: payload.active,
      });
    } else {
      await createRule.mutateAsync(payload as any);
    }
    onOpenChange(false);
  };

  const isLoading = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rule ? 'Editar Regra de Qualificação' : 'Nova Regra de Qualificação'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rule_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Regra</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Lead Diamante" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>Menor número = maior prioridade</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="funnel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funil Aplicável</FormLabel>
                  <Select
                    value={field.value || 'all'}
                    onValueChange={(value) => field.onChange(value === 'all' ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos os funis</SelectItem>
                      {funnels?.map((funnel) => (
                        <SelectItem key={funnel.id} value={funnel.id}>
                          {funnel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Regras por funil são independentes entre si
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditions Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Condições</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ field: 'revenue', operator: 'greater_than', value: '', logic: 'AND' })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((condition, index) => (
                  <div key={condition.id} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    {index > 0 && (
                      <FormField
                        control={form.control}
                        name={`conditions.${index}.logic`}
                        render={({ field }) => (
                          <Select
                            value={field.value || 'AND'}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">E</SelectItem>
                              <SelectItem value="OR">OU</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.field`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Campo" />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELDS.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.operator`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Operador" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.id} value={op.id}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.value`}
                      render={({ field }) => (
                        <Input
                          placeholder="Valor"
                          className="flex-1"
                          {...field}
                          onChange={(e) => {
                            const numValue = parseFloat(e.target.value);
                            field.onChange(isNaN(numValue) ? e.target.value : numValue);
                          }}
                        />
                      )}
                    />

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <FormMessage>{form.formState.errors.conditions?.message}</FormMessage>
            </div>

            {/* Result */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="qualification_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label de Qualificação</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Lead Qualificado, Não-Fit" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use "Bronze" ou "Não-Fit" para limpeza automática
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classificação (opcional)</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {CLASSIFICATIONS.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Regra Ativa</FormLabel>
                    <FormDescription>
                      Regras inativas não serão aplicadas
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {rule ? 'Salvar' : 'Criar Regra'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
