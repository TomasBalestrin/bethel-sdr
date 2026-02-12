import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useFetchSheetHeaders } from '@/hooks/useSheetSync';

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

interface SheetColumnMapperProps {
  sheetUrl: string;
  sheetName: string;
  value: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}

const SYSTEM_FIELDS = [
  { key: 'full_name', label: 'Nome Completo', required: true },
  { key: 'phone', label: 'Telefone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'state', label: 'Estado', required: false },
  { key: 'instagram', label: 'Instagram', required: false },
  { key: 'niche', label: 'Nicho', required: false },
  { key: 'business_name', label: 'Nome do Negócio', required: false },
  { key: 'business_position', label: 'Cargo', required: false },
  { key: 'revenue', label: 'Faturamento', required: false },
  { key: 'main_pain', label: 'Principal Desafio', required: false },
  { key: 'has_partner', label: 'Tem Sócio', required: false },
  { key: 'knows_specialist_since', label: 'Conhece Desde', required: false },
  { key: 'date_column', label: 'Coluna de Data', required: false },
] as const;

export function SheetColumnMapper({
  sheetUrl,
  sheetName,
  value,
  onChange,
}: SheetColumnMapperProps) {
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [hasLoadedHeaders, setHasLoadedHeaders] = useState(false);
  
  const fetchHeaders = useFetchSheetHeaders();

  const canFetchHeaders = sheetUrl && sheetName;

  const handleFetchHeaders = async () => {
    if (!canFetchHeaders) return;

    const result = await fetchHeaders.mutateAsync({ sheetUrl, sheetName });
    if (result.headers) {
      setSheetHeaders(result.headers);
      setHasLoadedHeaders(true);
      
      // Auto-map columns with similar names
      const autoMapping: ColumnMapping = { ...value };
      const headersLower = result.headers.map(h => h.toLowerCase().trim());
      
      SYSTEM_FIELDS.forEach(field => {
        if (!autoMapping[field.key as keyof ColumnMapping]) {
          const matchIndex = headersLower.findIndex(h => {
            const fieldLabel = field.label.toLowerCase();
            const fieldKey = field.key.toLowerCase().replace('_', ' ');
            return h.includes(fieldLabel) || h.includes(fieldKey) || 
                   fieldLabel.includes(h) || fieldKey.includes(h);
          });
          
          if (matchIndex >= 0) {
            autoMapping[field.key as keyof ColumnMapping] = result.headers[matchIndex];
          }
        }
      });
      
      onChange(autoMapping);
    }
  };

  // Reset headers when URL or sheet name changes
  useEffect(() => {
    setHasLoadedHeaders(false);
    setSheetHeaders([]);
  }, [sheetUrl, sheetName]);

  const handleMappingChange = (fieldKey: string, headerValue: string) => {
    const newMapping = { ...value };
    if (headerValue === '__none__') {
      delete newMapping[fieldKey as keyof ColumnMapping];
    } else {
      newMapping[fieldKey as keyof ColumnMapping] = headerValue;
    }
    onChange(newMapping);
  };

  const isFullNameMapped = !!value.full_name;
  const hasContactInfo = !!(value.phone || value.email);
  const isValid = isFullNameMapped;

  if (!canFetchHeaders) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50">
        Configure a URL da planilha e o nome da aba para mapear as colunas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Mapeamento de Colunas</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFetchHeaders}
          disabled={fetchHeaders.isPending}
        >
          {fetchHeaders.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {hasLoadedHeaders ? 'Atualizar Colunas' : 'Carregar Colunas'}
        </Button>
      </div>

      {!hasLoadedHeaders ? (
        <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50 text-center">
          Clique em "Carregar Colunas" para buscar as colunas da planilha
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {isValid ? (
              <Badge variant="default" className="bg-green-500">
                <Check className="h-3 w-3 mr-1" />
                Mapeamento válido
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Campo obrigatório: Nome Completo
              </Badge>
            )}
            {!hasContactInfo && (
              <Badge variant="secondary">
                Recomendado: Mapear Telefone ou Email
              </Badge>
            )}
          </div>

          <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
            {SYSTEM_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <Label className="w-40 text-sm flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={value[field.key as keyof ColumnMapping] || '__none__'}
                  onValueChange={(val) => handleMappingChange(field.key, val)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Não mapear</span>
                    </SelectItem>
                    {sheetHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
