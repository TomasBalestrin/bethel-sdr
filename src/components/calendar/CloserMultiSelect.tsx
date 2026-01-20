import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Closer {
  user_id: string;
  name: string;
}

interface CloserMultiSelectProps {
  closers: Closer[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  className?: string;
}

export function CloserMultiSelect({ 
  closers, 
  selectedIds, 
  onSelectionChange,
  className 
}: CloserMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const allSelected = closers.length > 0 && selectedIds.length === closers.length;
  const noneSelected = selectedIds.length === 0;
  const someSelected = selectedIds.length > 0 && selectedIds.length < closers.length;

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(closers.map((c) => c.user_id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getLabel = () => {
    if (allSelected) return 'Todos os closers';
    if (noneSelected) return 'Selecionar closers';
    if (selectedIds.length === 1) {
      const closer = closers.find((c) => c.user_id === selectedIds[0]);
      return closer?.name || '1 closer';
    }
    return `${selectedIds.length} closers`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('min-w-[200px] justify-between', className)}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{getLabel()}</span>
          </div>
          <div className="flex items-center gap-1">
            {someSelected && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {selectedIds.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <div className="flex items-center justify-between p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-8 text-xs"
            disabled={allSelected}
          >
            <Check className="h-3 w-3 mr-1" />
            Todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-8 text-xs text-muted-foreground"
            disabled={noneSelected}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>
        <ScrollArea className="max-h-[200px]">
          <div className="p-2 space-y-1">
            {closers.map((closer) => {
              const isSelected = selectedIds.includes(closer.user_id);
              return (
                <div
                  key={closer.user_id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                  )}
                  onClick={() => handleToggle(closer.user_id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(closer.user_id)}
                  />
                  <span className="text-sm">{closer.name}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {allSelected && closers.length > 0 && (
          <div className="p-2 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              📋 Modo Lista ativado
            </p>
          </div>
        )}
        {someSelected && (
          <div className="p-2 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              📅 Modo Agenda ativado
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
