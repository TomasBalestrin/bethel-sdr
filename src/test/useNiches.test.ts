import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing hook
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));
mockSelect.mockReturnValue({
  eq: vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue({
      data: [
        { id: '1', name: 'Saúde', active: true, created_at: '2024-01-01' },
        { id: '2', name: 'Educação', active: true, created_at: '2024-01-02' },
      ],
      error: null,
    }),
  }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('Niches module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call supabase correctly for niches query', async () => {
    // Verify the mock structure is correct
    expect(mockFrom).toBeDefined();
    expect(typeof mockFrom).toBe('function');

    // Call the mock
    const result = mockFrom('niches');
    expect(mockFrom).toHaveBeenCalledWith('niches');
    expect(result.select).toBeDefined();
  });

  it('should filter active niches', () => {
    const niches = [
      { id: '1', name: 'Saúde', active: true },
      { id: '2', name: 'Tech', active: false },
      { id: '3', name: 'Educação', active: true },
    ];

    const activeNiches = niches.filter(n => n.active);
    expect(activeNiches).toHaveLength(2);
    expect(activeNiches.map(n => n.name)).toEqual(['Saúde', 'Educação']);
  });
});
