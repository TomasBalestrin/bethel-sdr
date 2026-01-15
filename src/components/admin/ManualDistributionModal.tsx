import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExecuteDistribution, useNewLeadsCount, DistributeResult } from '@/hooks/useDistributionRules';
import { useFunnels } from '@/hooks/useFunnels';
import { useUsersByRole } from '@/hooks/useUsers';
import { Loader2, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  funnel_id: z.string().nullable(),
  classifications: z.array(z.string()),
  sdr_ids: z.array(z.string()).min(1, 'Selecione pelo menos um SDR'),
  limit: z.number().min(1).max(1000).optional(),
  considerWorkload: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const CLASSIFICATIONS = [
  { id: 'diamante', label: 'Diamante' },
  { id: 'ouro', label: 'Ouro' },
  { id: 'prata', label: 'Prata' },
  { id: 'bronze', label: 'Bronze' },
];

interface ManualDistributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualDistributionModal({
  open,
  onOpenChange,
}: ManualDistributionModalProps) {
  const { data: funnels } = useFunnels();
  const { data: sdrs } = useUsersByRole('sdr');
  const executeDistribution = useExecuteDistribution();
  
  const [step, setStep] = useState<'config' | 'preview' | 'result'>('config');
  const [previewData, setPreviewData] = useState<DistributeResult | null>(null);
  const [resultData, setResultData] = useState<DistributeResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      funnel_id: null,
      classifications: [],
      sdr_ids: [],
      limit: undefined,
      considerWorkload: true,
    },
  });

  const watchedFunnelId = form.watch('funnel_id');
  const watchedClassifications = form.watch('classifications');
  
  const { data: newLeadsCount } = useNewLeadsCount(
    watchedFunnelId === 'all' ? undefined : watchedFunnelId || undefined,
    watchedClassifications.length > 0 ? watchedClassifications : undefined
  );

  const handlePreview = async (values: FormValues) => {
    const result = await executeDistribution.mutateAsync({
      funnelId: values.funnel_id === 'all' ? undefined : values.funnel_id || undefined,
      classifications: values.classifications.length > 0 ? values.classifications : undefined,
      sdrIds: values.sdr_ids,
      limit: values.limit,
      considerWorkload: values.considerWorkload,
      dryRun: true,
    });
    setPreviewData(result);
    setStep('preview');
  };

  const handleExecute = async () => {
    const values = form.getValues();
    const result = await executeDistribution.mutateAsync({
      funnelId: values.funnel_id === 'all' ? undefined : values.funnel_id || undefined,
      classifications: values.classifications.length > 0 ? values.classifications : undefined,
      sdrIds: values.sdr_ids,
      limit: values.limit,
      considerWorkload: values.considerWorkload,
      dryRun: false,
    });
    setResultData(result);
    setStep('result');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('config');
      setPreviewData(null);
      setResultData(null);
      form.reset();
    }, 200);
  };

  const isLoading = executeDistribution.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'config' && 'Distribuição Manual de Leads'}
            {step === 'preview' && 'Preview da Distribuição'}
            {step === 'result' && 'Distribuição Concluída'}
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePreview)} className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">{newLeadsCount || 0}</span>
                  <span className="text-muted-foreground">leads disponíveis para distribuição</span>
                </div>
              </div>

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
                          <SelectValue placeholder="Todos os funis" />
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
                    <FormLabel>SDRs</FormLabel>
                    <div className="flex justify-between items-center mb-2">
                      <FormDescription>
                        Selecione os SDRs que receberão leads
                      </FormDescription>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => form.setValue('sdr_ids', sdrs?.map(s => s.id) || [])}
                      >
                        Selecionar todos
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
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
                name="limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de Leads (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Sem limite"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo de leads a distribuir nesta execução
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="considerWorkload"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Considerar Carga de Trabalho</FormLabel>
                      <FormDescription>
                        Priorizar SDRs com menos leads ativos
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !newLeadsCount}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Visualizar Distribuição
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === 'preview' && previewData && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{previewData.distributed}</div>
                  <div className="text-sm text-muted-foreground">Leads a distribuir</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{previewData.skipped}</div>
                  <div className="text-sm text-muted-foreground">Não atribuídos</div>
                </div>
              </div>
            </div>

            {previewData.assignments.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Distribuição:</h4>
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    {previewData.assignments.map((assignment, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="truncate flex-1">{assignment.leadName}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Badge variant="secondary" className="flex-shrink-0">
                          {assignment.sdrName}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('config')}>
                Voltar
              </Button>
              <Button onClick={handleExecute} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Distribuição
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && resultData && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold">Distribuição Concluída!</h3>
              <p className="text-muted-foreground">
                {resultData.distributed} leads foram distribuídos com sucesso
              </p>
            </div>

            {resultData.skipped > 0 && (
              <p className="text-sm text-amber-600">
                {resultData.skipped} leads não foram atribuídos (SDRs no limite)
              </p>
            )}

            <Button onClick={handleClose} className="mt-4">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
