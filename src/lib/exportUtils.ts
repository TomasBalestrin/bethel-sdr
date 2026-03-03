import * as XLSX from 'xlsx';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: string | number | boolean | null | undefined) => string;
}

export interface SDRExportData {
  name: string;
  atribuidos: number;
  agendados: number;
  convertidos: number;
  taxaAgendamento: number;
}

export interface CloserExportData {
  name: string;
  agendadas: number;
  realizadas: number;
  conversoes: number;
  valor: number;
  taxaConversao: number;
}

export interface FunnelExportData {
  name: string;
  leads: number;
  agendamentos: number;
  conversoes: number;
  valorGerado: number;
  taxaAgendamento: number;
  taxaConversao: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns
      .map(col => {
        const value = row[col.key];
        const formatted = col.formatter ? col.formatter(value) : String(value ?? '');
        // Escape CSV special characters
        if (formatted.includes(',') || formatted.includes('"') || formatted.includes('\n')) {
          return `"${formatted.replace(/"/g, '""')}"`;
        }
        return formatted;
      })
      .join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Dados'
): void {
  const formattedData = data.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach(col => {
      const value = row[col.key];
      obj[col.header] = col.formatter ? col.formatter(value) : value;
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, 15),
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pre-configured export functions for each report type
export function exportSDRData(
  data: SDRExportData[],
  dateRange: { from: Date; to: Date },
  exportFormat: 'csv' | 'excel'
): void {
  const columns: ExportColumn[] = [
    { key: 'name', header: 'SDR' },
    { key: 'atribuidos', header: 'Leads Atribuídos' },
    { key: 'agendados', header: 'Leads Agendados' },
    { key: 'convertidos', header: 'Conversões' },
    { key: 'taxaAgendamento', header: 'Taxa Agendamento', formatter: formatPercent },
  ];

  const dateStr = `${formatDate(dateRange.from, 'dd-MM-yyyy', { locale: ptBR })}_${formatDate(dateRange.to, 'dd-MM-yyyy', { locale: ptBR })}`;
  const filename = `relatorio_sdrs_${dateStr}`;

  if (exportFormat === 'csv') {
    exportToCSV(data, columns, filename);
  } else {
    exportToExcel(data, columns, filename, 'SDRs');
  }
}

export function exportCloserData(
  data: CloserExportData[],
  dateRange: { from: Date; to: Date },
  exportFormat: 'csv' | 'excel'
): void {
  const columns: ExportColumn[] = [
    { key: 'name', header: 'Closer' },
    { key: 'agendadas', header: 'Calls Agendadas' },
    { key: 'realizadas', header: 'Calls Realizadas' },
    { key: 'conversoes', header: 'Conversões' },
    { key: 'taxaConversao', header: 'Taxa Conversão', formatter: formatPercent },
    { key: 'valor', header: 'Valor Gerado', formatter: formatCurrency },
  ];

  const dateStr = `${formatDate(dateRange.from, 'dd-MM-yyyy', { locale: ptBR })}_${formatDate(dateRange.to, 'dd-MM-yyyy', { locale: ptBR })}`;
  const filename = `relatorio_closers_${dateStr}`;

  if (exportFormat === 'csv') {
    exportToCSV(data, columns, filename);
  } else {
    exportToExcel(data, columns, filename, 'Closers');
  }
}

export function exportFunnelData(
  data: FunnelExportData[],
  dateRange: { from: Date; to: Date },
  exportFormat: 'csv' | 'excel'
): void {
  const columns: ExportColumn[] = [
    { key: 'name', header: 'Funil' },
    { key: 'leads', header: 'Total Leads' },
    { key: 'agendamentos', header: 'Agendamentos' },
    { key: 'conversoes', header: 'Conversões' },
    { key: 'taxaAgendamento', header: 'Taxa Agendamento', formatter: formatPercent },
    { key: 'taxaConversao', header: 'Taxa Conversão', formatter: formatPercent },
    { key: 'valorGerado', header: 'Valor Gerado', formatter: formatCurrency },
  ];

  const dateStr = `${formatDate(dateRange.from, 'dd-MM-yyyy', { locale: ptBR })}_${formatDate(dateRange.to, 'dd-MM-yyyy', { locale: ptBR })}`;
  const filename = `relatorio_funis_${dateStr}`;

  if (exportFormat === 'csv') {
    exportToCSV(data, columns, filename);
  } else {
    exportToExcel(data, columns, filename, 'Funis');
  }
}
