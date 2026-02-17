import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFunnels } from '@/hooks/useFunnels';
import { useCreateSDRCapacity, useUpdateSDRCapacity, SDRCapacity } from '@/hooks/useSDRCapacities';

interface SDRCapacityFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capacity: SDRCapacity | null;
  sdrId: string;
  sdrName: string;
}

export function SDRCapacityFormModal({
  open,
  onOpenChange,
  capacity,
  sdrId,
  sdrName,
}: SDRCapacityFormModalProps) {
  const { data: funnels } = useFunnels();
  const createCapacity = useCreateSDRCapacity();
  const updateCapacity = useUpdateSDRCapacity();

  const [funnelId, setFunnelId] = useState<string>('');
  const [maxLeads, setMaxLeads] = useState<number>(50);
  const [percentage, setPercentage] = useState<number | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (capacity) {
      setFunnelId(capacity.funnel_id || '');
      setMaxLeads(capacity.max_leads || 50);
      setPercentage(capacity.percentage);
      setActive(capacity.active ?? true);
    } else {
      setFunnelId('');
      setMaxLeads(50);
      setPercentage(null);
      setActive(true);
    }
  }, [capacity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      sdr_id: sdrId,
      funnel_id: funnelId || null,
      max_leads: maxLeads,
      percentage: percentage,
      active,
    };

    if (capacity) {
      await updateCapacity.mutateAsync({ id: capacity.id, ...data });
    } else {
      await createCapacity.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const isLoading = createCapacity.isPending || updateCapacity.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {capacity ? 'Editar Capacidade' : 'Nova Capacidade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>SDR</Label>
            <Input value={sdrName} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="funnel">Funil (opcional)</Label>
            <Select value={funnelId || '__none__'} onValueChange={(v) => setFunnelId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Geral (todos os funis)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Geral (todos os funis)</SelectItem>
                {funnels?.filter(f => f.active).map((funnel) => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Deixe vazio para configurar capacidade global
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxLeads">Máximo de Leads</Label>
            <Input
              id="maxLeads"
              type="number"
              min={1}
              value={maxLeads}
              onChange={(e) => setMaxLeads(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Limite máximo de leads que este SDR pode receber (distribuição automática)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Percentual de Distribuição (%)</Label>
            <Input
              id="percentage"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={percentage ?? ''}
              onChange={(e) => setPercentage(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Opcional"
            />
            <p className="text-xs text-muted-foreground">
              Percentual de leads que este SDR deve receber. Deixe vazio para distribuição igualitária.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Ativo</Label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
