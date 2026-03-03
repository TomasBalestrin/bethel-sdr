import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV } from '@/lib/exportUtils';

describe('exportToCSV', () => {
  let capturedContent: string;

  beforeEach(() => {
    capturedContent = '';

    // Mock URL methods
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });

    // Mock document.createElement to capture the download
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      return {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLElement;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);

    // Intercept Blob to capture content without recursion
    vi.stubGlobal('Blob', class MockBlob {
      _parts: string[];
      type: string;
      size: number;
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        this._parts = (parts || []).map(p => String(p));
        this.type = options?.type || '';
        this.size = this._parts.join('').length;
        capturedContent = this._parts.join('');
      }
      slice() { return this; }
      text() { return Promise.resolve(capturedContent); }
      arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
      stream() { return new ReadableStream(); }
    });
  });

  it('should generate correct CSV headers', () => {
    const data = [{ name: 'Test', value: 10 }];
    const columns = [
      { key: 'name', header: 'Nome' },
      { key: 'value', header: 'Valor' },
    ];

    exportToCSV(data, columns, 'test');

    expect(capturedContent).toContain('Nome,Valor');
    expect(capturedContent).toContain('Test,10');
  });

  it('should escape CSV special characters', () => {
    const data = [{ name: 'Test, with comma', value: 'has "quotes"' }];
    const columns = [
      { key: 'name', header: 'Nome' },
      { key: 'value', header: 'Valor' },
    ];

    exportToCSV(data, columns, 'test');

    expect(capturedContent).toContain('"Test, with comma"');
    expect(capturedContent).toContain('"has ""quotes"""');
  });

  it('should use formatter when provided', () => {
    const data = [{ value: 100 }];
    const columns = [
      { key: 'value', header: 'Valor', formatter: (v: string | number | boolean | null | undefined) => `R$ ${v}` },
    ];

    exportToCSV(data, columns, 'test');

    expect(capturedContent).toContain('R$ 100');
  });

  it('should handle null and undefined values', () => {
    const data = [{ name: null, value: undefined }];
    const columns = [
      { key: 'name', header: 'Nome' },
      { key: 'value', header: 'Valor' },
    ];

    exportToCSV(data, columns, 'test');

    expect(capturedContent).toContain('Nome,Valor');
  });
});
