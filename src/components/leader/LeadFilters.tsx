import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFunnels } from '@/hooks/useFunnels';
import { useNiches } from '@/hooks/useNiches';
import { useUsersByRole } from '@/hooks/useUsers';
import { 
  LeaderDashboardFilters, 
  BRAZILIAN_STATES, 
  REVENUE_RANGES 
} from '@/hooks/useLeaderDashboard';

const CLASSIFICATIONS = [
  { id: 'diamante', label: 'Diamante' },
  { id: 'ouro', label: 'Ouro' },
  { id: 'prata', label: 'Prata' },
  { id: 'bronze', label: 'Bronze' },
];

interface LeadFiltersProps {
  filters: LeaderDashboardFilters;
  onFiltersChange: (filters: LeaderDashboardFilters) => void;
}

export function LeadFilters({ filters, onFiltersChange }: LeadFiltersProps) {
  const { data: funnels } = useFunnels();
  const { data: niches } = useNiches();
  const { data: sdrs } = useUsersByRole('sdr');

  const updateFilter = <K extends keyof LeaderDashboardFilters>(
    key: K, 
    value: LeaderDashboardFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleClassification = (classificationId: string) => {
    const current = filters.classification || [];
    const updated = current.includes(classificationId)
      ? current.filter((c) => c !== classificationId)
      : [...current, classificationId];
    updateFilter('classification', updated);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filtros Avançados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Funnel */}
          <div className="space-y-2">
            <Label>Funil de Origem</Label>
            <Select 
              value={filters.funnelId || 'all'} 
              onValueChange={(v) => updateFilter('funnelId', v === 'all' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os funis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funis</SelectItem>
                {funnels?.filter(f => f.active && !f.name.toLowerCase().includes('indicação')).map((funnel) => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Niche */}
          <div className="space-y-2">
            <Label>Nicho</Label>
            <Select 
              value={filters.niche || 'all'} 
              onValueChange={(v) => updateFilter('niche', v === 'all' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os nichos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os nichos</SelectItem>
                {niches?.map((niche) => (
                  <SelectItem key={niche.id} value={niche.name}>
                    {niche.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select 
              value={filters.state || 'all'} 
              onValueChange={(v) => updateFilter('state', v === 'all' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {BRAZILIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Business Position */}
          <div className="space-y-2">
            <Label>Posição no Negócio</Label>
            <Select 
              value={filters.businessPosition || 'all'} 
              onValueChange={(v) => updateFilter('businessPosition', v === 'all' ? undefined : v as 'dono' | 'nao_dono')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="dono">Dono</SelectItem>
                <SelectItem value="nao_dono">Não Dono</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Revenue Range */}
          <div className="space-y-2">
            <Label>Faturamento</Label>
            <Select 
              value={
                filters.revenueMin !== undefined 
                  ? `${filters.revenueMin}-${filters.revenueMax || 'max'}` 
                  : 'all'
              } 
              onValueChange={(v) => {
                if (v === 'all') {
                  updateFilter('revenueMin', undefined);
                  updateFilter('revenueMax', undefined);
                } else {
                  const [min, max] = v.split('-');
                  updateFilter('revenueMin', Number(min));
                  updateFilter('revenueMax', max === 'max' ? undefined : Number(max));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os faturamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os faturamentos</SelectItem>
                {REVENUE_RANGES.map((range) => (
                  <SelectItem 
                    key={range.label} 
                    value={`${range.min}-${range.max || 'max'}`}
                  >
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SDR */}
          <div className="space-y-2">
            <Label>SDR Responsável</Label>
            <Select 
              value={filters.sdrId || 'all'} 
              onValueChange={(v) => updateFilter('sdrId', v === 'all' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os SDRs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os SDRs</SelectItem>
                {sdrs?.map((sdr) => (
                  <SelectItem key={sdr.user_id} value={sdr.user_id}>
                    {sdr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Distribution Status */}
          <div className="space-y-2">
            <Label>Status de Distribuição</Label>
            <Select 
              value={filters.distributionStatus || 'all'} 
              onValueChange={(v) => updateFilter('distributionStatus', v as 'distributed' | 'not_distributed' | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="distributed">Distribuídos</SelectItem>
                <SelectItem value="not_distributed">Não Distribuídos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entry Date Range */}
          <div className="space-y-2">
            <Label>Data de Entrada</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.entryStartDate 
                      ? format(new Date(filters.entryStartDate), 'dd/MM/yy', { locale: ptBR })
                      : 'De'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.entryStartDate ? new Date(filters.entryStartDate) : undefined}
                    onSelect={(date) => updateFilter('entryStartDate', date?.toISOString())}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.entryEndDate 
                      ? format(new Date(filters.entryEndDate), 'dd/MM/yy', { locale: ptBR })
                      : 'Até'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.entryEndDate ? new Date(filters.entryEndDate) : undefined}
                    onSelect={(date) => updateFilter('entryEndDate', date?.toISOString())}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Distribution Date Range */}
          <div className="space-y-2">
            <Label>Data de Distribuição</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.distributedStartDate 
                      ? format(new Date(filters.distributedStartDate), 'dd/MM/yy', { locale: ptBR })
                      : 'De'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.distributedStartDate ? new Date(filters.distributedStartDate) : undefined}
                    onSelect={(date) => updateFilter('distributedStartDate', date?.toISOString())}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.distributedEndDate 
                      ? format(new Date(filters.distributedEndDate), 'dd/MM/yy', { locale: ptBR })
                      : 'Até'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.distributedEndDate ? new Date(filters.distributedEndDate) : undefined}
                    onSelect={(date) => updateFilter('distributedEndDate', date?.toISOString())}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Classifications */}
        <div className="mt-4 space-y-2">
          <Label>Classificações</Label>
          <div className="flex flex-wrap gap-2">
            {CLASSIFICATIONS.map((classification) => (
              <div 
                key={classification.id}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id={`classification-${classification.id}`}
                  checked={(filters.classification || []).includes(classification.id)}
                  onCheckedChange={() => toggleClassification(classification.id)}
                />
                <label 
                  htmlFor={`classification-${classification.id}`}
                  className="text-sm cursor-pointer"
                >
                  {classification.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
