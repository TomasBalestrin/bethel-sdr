import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #3b82f6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottom: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    padding: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: '23%',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    border: '1px solid #e2e8f0',
  },
  metricLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
  },
});

interface SDRData {
  name: string;
  leadsRecebidos: number;
  leadsContatados: number;
  taxaContato: number;
  agendamentos: number;
  taxaAgendamento: number;
}

interface CloserData {
  name: string;
  agendamentos: number;
  realizadas: number;
  taxaComparecimento: number;
  conversoes: number;
  taxaConversao: number;
  valorTotal: number;
}

interface FunnelData {
  name: string;
  totalLeads: number;
  leadsQualificados: number;
  agendamentos: number;
  conversoes: number;
  taxaConversao: number;
  valorTotal: number;
}

interface ReportPDFDocumentProps {
  reportType: 'sdr' | 'closer' | 'funnel';
  dateRange: { from: Date; to: Date };
  sdrData?: SDRData[];
  closerData?: CloserData[];
  funnelData?: FunnelData[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function ReportPDFDocument({
  reportType,
  dateRange,
  sdrData = [],
  closerData = [],
  funnelData = [],
}: ReportPDFDocumentProps) {
  const reportTitle = {
    sdr: 'Relatório de Performance SDR',
    closer: 'Relatório de Performance Closer',
    funnel: 'Relatório de Performance por Funil',
  }[reportType];

  const dateRangeText = `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{reportTitle}</Text>
          <Text style={styles.subtitle}>Período: {dateRangeText}</Text>
        </View>

        {/* SDR Report */}
        {reportType === 'sdr' && sdrData.length > 0 && (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total de SDRs</Text>
                <Text style={styles.metricValue}>{sdrData.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Leads Recebidos</Text>
                <Text style={styles.metricValue}>
                  {sdrData.reduce((sum, s) => sum + s.leadsRecebidos, 0)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Agendamentos</Text>
                <Text style={styles.metricValue}>
                  {sdrData.reduce((sum, s) => sum + s.agendamentos, 0)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Taxa Média Agendamento</Text>
                <Text style={styles.metricValue}>
                  {formatPercent(sdrData.reduce((sum, s) => sum + s.taxaAgendamento, 0) / sdrData.length)}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance por SDR</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableCellHeader}>SDR</Text>
                  <Text style={styles.tableCellHeader}>Leads</Text>
                  <Text style={styles.tableCellHeader}>Contatados</Text>
                  <Text style={styles.tableCellHeader}>Taxa Contato</Text>
                  <Text style={styles.tableCellHeader}>Agendamentos</Text>
                  <Text style={styles.tableCellHeader}>Taxa Agend.</Text>
                </View>
                {sdrData.map((sdr, index) => (
                  <View style={styles.tableRow} key={index}>
                    <Text style={styles.tableCell}>{sdr.name}</Text>
                    <Text style={styles.tableCell}>{sdr.leadsRecebidos}</Text>
                    <Text style={styles.tableCell}>{sdr.leadsContatados}</Text>
                    <Text style={styles.tableCell}>{formatPercent(sdr.taxaContato)}</Text>
                    <Text style={styles.tableCell}>{sdr.agendamentos}</Text>
                    <Text style={styles.tableCell}>{formatPercent(sdr.taxaAgendamento)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Closer Report */}
        {reportType === 'closer' && closerData.length > 0 && (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total de Closers</Text>
                <Text style={styles.metricValue}>{closerData.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Agendamentos</Text>
                <Text style={styles.metricValue}>
                  {closerData.reduce((sum, c) => sum + c.agendamentos, 0)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Conversões</Text>
                <Text style={styles.metricValue}>
                  {closerData.reduce((sum, c) => sum + c.conversoes, 0)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Receita Total</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(closerData.reduce((sum, c) => sum + c.valorTotal, 0))}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance por Closer</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableCellHeader}>Closer</Text>
                  <Text style={styles.tableCellHeader}>Agend.</Text>
                  <Text style={styles.tableCellHeader}>Realizadas</Text>
                  <Text style={styles.tableCellHeader}>Taxa Comp.</Text>
                  <Text style={styles.tableCellHeader}>Conversões</Text>
                  <Text style={styles.tableCellHeader}>Valor</Text>
                </View>
                {closerData.map((closer, index) => (
                  <View style={styles.tableRow} key={index}>
                    <Text style={styles.tableCell}>{closer.name}</Text>
                    <Text style={styles.tableCell}>{closer.agendamentos}</Text>
                    <Text style={styles.tableCell}>{closer.realizadas}</Text>
                    <Text style={styles.tableCell}>{formatPercent(closer.taxaComparecimento)}</Text>
                    <Text style={styles.tableCell}>{closer.conversoes}</Text>
                    <Text style={styles.tableCell}>{formatCurrency(closer.valorTotal)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Funnel Report */}
        {reportType === 'funnel' && funnelData.length > 0 && (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total de Funis</Text>
                <Text style={styles.metricValue}>{funnelData.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total de Leads</Text>
                <Text style={styles.metricValue}>
                  {funnelData.reduce((sum, f) => sum + f.totalLeads, 0)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Conversões</Text>
                <Text style={styles.metricValue}>
                  {funnelData.reduce((sum, f) => sum + f.conversoes, 0)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Receita Total</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(funnelData.reduce((sum, f) => sum + f.valorTotal, 0))}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance por Funil</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableCellHeader}>Funil</Text>
                  <Text style={styles.tableCellHeader}>Leads</Text>
                  <Text style={styles.tableCellHeader}>Qualif.</Text>
                  <Text style={styles.tableCellHeader}>Agend.</Text>
                  <Text style={styles.tableCellHeader}>Conv.</Text>
                  <Text style={styles.tableCellHeader}>Valor</Text>
                </View>
                {funnelData.map((funnel, index) => (
                  <View style={styles.tableRow} key={index}>
                    <Text style={styles.tableCell}>{funnel.name}</Text>
                    <Text style={styles.tableCell}>{funnel.totalLeads}</Text>
                    <Text style={styles.tableCell}>{funnel.leadsQualificados}</Text>
                    <Text style={styles.tableCell}>{funnel.agendamentos}</Text>
                    <Text style={styles.tableCell}>{funnel.conversoes}</Text>
                    <Text style={styles.tableCell}>{formatCurrency(funnel.valorTotal)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </Text>
      </Page>
    </Document>
  );
}
