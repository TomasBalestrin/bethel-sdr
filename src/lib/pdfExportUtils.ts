import { pdf } from '@react-pdf/renderer';
import { ReportPDFDocument } from '@/components/reports/ReportPDFDocument';
import { format } from 'date-fns';

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

async function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportSDRToPDF(data: SDRData[], dateRange: { from: Date; to: Date }) {
  const filename = `relatorio-sdr-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
  
  const doc = ReportPDFDocument({
    reportType: 'sdr',
    dateRange,
    sdrData: data,
  });
  
  const blob = await pdf(doc).toBlob();
  await downloadPDF(blob, filename);
}

export async function exportCloserToPDF(data: CloserData[], dateRange: { from: Date; to: Date }) {
  const filename = `relatorio-closer-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
  
  const doc = ReportPDFDocument({
    reportType: 'closer',
    dateRange,
    closerData: data,
  });
  
  const blob = await pdf(doc).toBlob();
  await downloadPDF(blob, filename);
}

export async function exportFunnelToPDF(data: FunnelData[], dateRange: { from: Date; to: Date }) {
  const filename = `relatorio-funil-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
  
  const doc = ReportPDFDocument({
    reportType: 'funnel',
    dateRange,
    funnelData: data,
  });
  
  const blob = await pdf(doc).toBlob();
  await downloadPDF(blob, filename);
}
