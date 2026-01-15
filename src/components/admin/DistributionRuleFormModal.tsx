import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDistributionRule, useUpdateDistributionRule, DistributionRule } from '@/hooks/useDistributionRules';
import { useFunnels } from '@/hooks/useFunnels';
import { useUsersByRole } from '@/hooks/useUsers';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  funnel_id: z.string().nullable(),
  classifications: z.array(z.string()),
  sdr_ids: z.array(z.string()).min(1, 'Selecione pelo menos um SDR'),
  max_leads_per_sdr: z.number().min(1).max(1000),
  active: z.boolean(),
  schedule_enabled: z.boolean(),
  schedule_days: z.array(z.number()),
  schedule_time: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const CLASSIFICATIONS = [
  { id: 'diamante', label: 'Diamante' },
  { id: 'ouro', label: 'Ouro' },
  { id: 'prata', label: 'Prata' },
  { id: 'bronze', label: 'Bronze' },
];

const DAYS = [
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
];

interface DistributionRuleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: DistributionRule | null;
}

export function DistributionRuleFormModal({
  open,
  onOpenChange,
  rule,
}: DistributionRuleFormModalProps) {
  const { data: funnels } = useFunnels();
  const { data: sdrs } = useUsersByRole('sdr');
  const createRule = useCreateDistributionRule();
  const updateRule = useUpdateDistributionRule();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      funnel_id: null,
      classifications: [],
      sdr_ids: [],
      max_leads_per_sdr: 50,
      active: true,
      schedule_enabled: false,
      schedule_days: [1, 2, 3, 4, 5],
      schedule_time: '09:00',
    },
  });

  useEffect(() => {
    if (rule) {
      form.reset({
        name: rule.name,
        funnel_id: rule.funnel_id,
        classifications: rule.classifications || [],
        sdr_ids: rule.sdr_ids || [],
        max_leads_per_sdr: rule.max_leads_per_sdr,
        active: rule.active,
        schedule_enabled: rule.schedule_enabled,
        schedule_days: rule.schedule_days || [],
        schedule_time: rule.schedule_time?.slice(0, 5) || '09:00',
      });
    } else {
      form.reset({
        name: '',
        funnel_id: null,
        classifications: [],
        sdr_ids: sdrs?.map(s => s.id) || [],
        max_leads_per_sdr: 50,
        active: true,
        schedule_enabled: false,
        schedule_days: [1, 2, 3, 4, 5],
        schedule_time: '09:00',
      });
    }
  }, [rule, sdrs, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      sdr_ids: values.sdr_ids,
      funnel_id: values.funnel_id === 'all' ? null : values.funnel_id,
      classifications: values.classifications,
      max_leads_per_sdr: values.max_leads_per_sdr,
      active: values.active,
      schedule_enabled: values.schedule_enabled,
      schedule_days: values.schedule_days,
      schedule_time: values.schedule_time,
    };

    if (rule) {
      await updateRule.mutateAsync({ id: rule.id, ...payload });
    } else {
      await createRule.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isLoading = createRule.isPending || updateRule.isPending;
  const scheduleEnabled = form.watch('schedule_enabled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rule ? 'Editar Regra de Distribuição' : 'Nova Regra de Distribuição'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Regra</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Distribuição Diária" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="funnel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funil</FormLabel>
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
                    Filtrar leads de um funil específico
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classifications"
              render={() => (
                <FormItem>
                  <FormLabel>Classificações</FormLabel>
                  <FormDescription>
                    Deixe vazio para incluir todas as classificações
                  </FormDescription>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {CLASSIFICATIONS.map((classification) => (
                      <FormField
                        key={classification.id}
                        control={form.control}
                        name="classifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(classification.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, classification.id]);
                                  } else {
                                    field.onChange(field.value.filter((v) => v !== classification.id));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {classification.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sdr_ids"
              render={() => (
                <FormItem>
                  <FormLabel>SDRs Participantes</FormLabel>
                  <FormDescription>
                    Selecione os SDRs que receberão leads
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {sdrs?.map((sdr) => (
                      <FormField
                        key={sdr.id}
                        control={form.control}
                        name="sdr_ids"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(sdr.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, sdr.id]);
                                  } else {
                                    field.onChange(field.value.filter((v) => v !== sdr.id));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer text-sm">
                              {sdr.name}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_leads_per_sdr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máximo de Leads por SDR</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                    />
                  </FormControl>
                  <FormDescription>
                    Limite de leads em atendimento por SDR
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="schedule_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Agendamento Automático</FormLabel>
                    <FormDescription>
                      Executar distribuição automaticamente
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {scheduleEnabled && (
              <>
                <FormField
                  control={form.control}
                  name="schedule_days"
                  render={() => (
                    <FormItem>
                      <FormLabel>Dias da Semana</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {DAYS.map((day) => (
                          <FormField
                            key={day.id}
                            control={form.control}
                            name="schedule_days"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-1 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, day.id]);
                                      } else {
                                        field.onChange(field.value.filter((v) => v !== day.id));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer text-sm">
                                  {day.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schedule_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Regra Ativa</FormLabel>
                    <FormDescription>
                      Permite execução manual ou agendada
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
