import { Trophy, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RankingEntry } from '@/hooks/useReportsStats';

interface RankingTableProps {
  title: string;
  description: string;
  data?: RankingEntry[];
  isLoading?: boolean;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  secondaryLabel?: string;
}

export function RankingTable({
  title,
  description,
  data,
  isLoading,
  valueLabel = 'Valor',
  valueFormatter = (v) => v.toString(),
  secondaryLabel,
}: RankingTableProps) {
  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">{position + 1}</span>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse bg-muted h-10 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Nenhum dado disponível
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">{valueLabel}</TableHead>
              {secondaryLabel && (
                <TableHead className="text-right">{secondaryLabel}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((entry, index) => (
              <TableRow key={entry.id} className={index < 3 ? 'bg-muted/30' : ''}>
                <TableCell>{getMedalIcon(index)}</TableCell>
                <TableCell className="font-medium">{entry.name}</TableCell>
                <TableCell className="text-right font-semibold">
                  {valueFormatter(entry.value)}
                </TableCell>
                {secondaryLabel && entry.secondary !== undefined && (
                  <TableCell className="text-right text-muted-foreground">
                    {entry.secondary}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
