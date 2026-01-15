import { BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/shared/EmptyState';

export default function Relatorios() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análise de performance da equipe</p>
        </div>

        <EmptyState
          icon={BarChart3}
          title="Relatórios em breve"
          description="Os relatórios detalhados estarão disponíveis em breve."
        />
      </div>
    </AppLayout>
  );
}
