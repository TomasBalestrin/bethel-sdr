import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useFunnels } from '@/hooks/useFunnels';
import { useImportLeads } from '@/hooks/useImportLeads';
import { toast } from 'sonner';

interface ImportCSVModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColumnMapping {
  full_name: string;
  phone: string;
  email: string;
  instagram: string;
  niche: string;
  revenue: string;
}

const SYSTEM_FIELDS = [
  { key: 'full_name', label: 'Nome Completo', required: true },
  { key: 'phone', label: 'Telefone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'instagram', label: 'Instagram', required: false },
  { key: 'niche', label: 'Nicho', required: false },
  { key: 'revenue', label: 'Faturamento', required: false },
];

export function ImportCSVModal({ open, onOpenChange }: ImportCSVModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    full_name: '',
    phone: '',
    email: '',
    instagram: '',
    niche: '',
    revenue: '',
  });
  const [selectedFunnel, setSelectedFunnel] = useState<string>('');

  const { data: funnels } = useFunnels();
  const importLeads = useImportLeads();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const parsed = lines.map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if ((char === ',' || char === ';') && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      if (parsed.length < 2) {
        toast.error('O arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados');
        return;
      }

      setCsvHeaders(parsed[0]);
      setCsvData(parsed.slice(1));
      setStep('mapping');
    };
    reader.readAsText(file);
  }, []);

  const handleMappingChange = (systemField: string, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [systemField]: csvColumn,
    }));
  };

  const getMappedData = () => {
    return csvData.slice(0, 5).map(row => {
      const mapped: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([systemField, csvColumn]) => {
        const columnIndex = csvHeaders.indexOf(csvColumn);
        if (columnIndex !== -1) {
          mapped[systemField] = row[columnIndex] || '';
        }
      });
      return mapped;
    });
  };

  const handleImport = async () => {
    if (!columnMapping.full_name) {
      toast.error('O campo "Nome Completo" é obrigatório');
      return;
    }

    const leads = csvData.map(row => {
      const lead: Record<string, any> = {};
      Object.entries(columnMapping).forEach(([systemField, csvColumn]) => {
        const columnIndex = csvHeaders.indexOf(csvColumn);
        if (columnIndex !== -1 && row[columnIndex]) {
          if (systemField === 'revenue') {
            const numValue = parseFloat(row[columnIndex].replace(/[^\d.,]/g, '').replace(',', '.'));
            lead[systemField] = isNaN(numValue) ? null : numValue;
          } else {
            lead[systemField] = row[columnIndex];
          }
        }
      });
      return lead as { full_name: string };
    }).filter(lead => lead.full_name);

    try {
      await importLeads.mutateAsync({
        leads,
        funnelId: selectedFunnel || undefined,
      });
      onOpenChange(false);
      resetState();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetState = () => {
    setStep('upload');
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMapping({
      full_name: '',
      phone: '',
      email: '',
      instagram: '',
      niche: '',
      revenue: '',
    });
    setSelectedFunnel('');
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetState();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Leads via CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de um arquivo CSV com os dados dos leads'}
            {step === 'mapping' && 'Mapeie as colunas do CSV para os campos do sistema'}
            {step === 'preview' && 'Revise os dados antes de importar'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Clique para selecionar um arquivo CSV</p>
                <p className="text-sm text-muted-foreground mt-2">ou arraste e solte aqui</p>
              </label>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Formato esperado:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Primeira linha deve conter os nomes das colunas</li>
                <li>• Campos separados por vírgula ou ponto-e-vírgula</li>
                <li>• Codificação UTF-8 recomendada</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Funil de destino (opcional)</Label>
                <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funil" />
                  </SelectTrigger>
                  <SelectContent>
                    {funnels?.map(funnel => (
                      <SelectItem key={funnel.id} value={funnel.id}>
                        {funnel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg divide-y">
                {SYSTEM_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center justify-between p-4">
                    <div>
                      <span className="font-medium">{field.label}</span>
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </div>
                    <Select
                      value={columnMapping[field.key as keyof ColumnMapping] || '__none__'}
                      onValueChange={(value) => handleMappingChange(field.key, value === '__none__' ? '' : value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecione coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não mapear</SelectItem>
                        {csvHeaders.map((header, index) => (
                          <SelectItem key={index} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={() => setStep('preview')} disabled={!columnMapping.full_name}>
                Continuar <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">
                <strong>{csvData.length}</strong> leads serão importados
                {selectedFunnel && funnels && (
                  <> para o funil <strong>{funnels.find(f => f.id === selectedFunnel)?.name}</strong></>
                )}
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {SYSTEM_FIELDS.filter(f => columnMapping[f.key as keyof ColumnMapping]).map(field => (
                      <TableHead key={field.key}>{field.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedData().map((row, index) => (
                    <TableRow key={index}>
                      {SYSTEM_FIELDS.filter(f => columnMapping[f.key as keyof ColumnMapping]).map(field => (
                        <TableCell key={field.key}>
                          {row[field.key] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvData.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                Mostrando 5 de {csvData.length} registros
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={importLeads.isPending}>
                {importLeads.isPending ? 'Importando...' : `Importar ${csvData.length} leads`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
