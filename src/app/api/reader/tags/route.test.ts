import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock data
const mockSupabaseUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockUserData = {
  reader_access_token: 'valid-reader-token-12345',
};

const mockCachedDocuments = [
  {
    tags: {
      dev: { name: 'dev', type: 'manual', created: 0 },
      typescript: { name: 'typescript', type: 'manual', created: 0 },
    },
  },
  {
    tags: {
      dev: { name: 'dev', type: 'manual', created: 0 },
      react: { name: 'react', type: 'manual', created: 0 },
    },
  },
  {
    tags: {
      dev: { name: 'dev', type: 'manual', created: 0 },
    },
  },
];

// Mocks
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

describe('GET /api/reader/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null,
    });

    // Default mock for 'users' table query
    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    // Default mock for 'cached_documents' table query
    const mockDocsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockCachedDocuments,
          error: null,
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 if Reader is not connected', async () => {
    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { reader_access_token: null },
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      return mockUsersQuery;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not connected');
  });

  it('should return aggregated tags from cached documents', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tags).toHaveLength(3);
    // Tags should be sorted by count (descending)
    expect(data.tags[0]).toEqual({ name: 'dev', count: 3 });
    expect(data.tags[1]).toEqual({ name: 'react', count: 1 });
    expect(data.tags[2]).toEqual({ name: 'typescript', count: 1 });
  });

  it('should return empty array when no documents exist', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tags).toEqual([]);
  });

  it('should handle documents with null or empty tags', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { tags: null },
            { tags: {} },
            { tags: { dev: { name: 'dev', type: 'manual', created: 0 } } },
          ],
          error: null,
        }),
      }),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tags).toHaveLength(1);
    expect(data.tags[0]).toEqual({ name: 'dev', count: 1 });
  });

  it('should handle database query errors', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch tags');
  });

  it('should sort tags by count descending, then alphabetically', async () => {
    const mockDocsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { tags: { zebra: { name: 'zebra' }, alpha: { name: 'alpha' } } },
            { tags: { alpha: { name: 'alpha' } } },
          ],
          error: null,
        }),
      }),
    };

    const mockUsersQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockUsersQuery;
      }
      if (table === 'cached_documents') {
        return mockDocsQuery;
      }
      return mockUsersQuery;
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tags[0]).toEqual({ name: 'alpha', count: 2 });
    expect(data.tags[1]).toEqual({ name: 'zebra', count: 1 });
  });
});
