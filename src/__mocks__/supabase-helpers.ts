/**
 * Supabase 쿼리 빌더 모킹 유틸리티
 *
 * 체이닝 가능한 Supabase 클라이언트를 모킹합니다.
 * 사용 예:
 *   const client = createMockSupabaseClient({ selectData: [{ id: 1 }] });
 *   const { data } = await client.from('table').select('*').eq('id', 1);
 */

type MockQueryResult<T = unknown> = {
  data: T | null;
  error: { message: string; code: string } | null;
  count: number | null;
};

type MockSupabaseOverrides = {
  selectData?: unknown;
  insertData?: unknown;
  updateData?: unknown;
  deleteData?: unknown;
  upsertData?: unknown;
  error?: { message: string; code?: string } | null;
  rpcData?: unknown;
};

function createMockQueryBuilder(overrides: MockSupabaseOverrides = {}) {
  const error = overrides.error
    ? { message: overrides.error.message, code: overrides.error.code ?? 'UNKNOWN' }
    : null;

  const resolve = <T>(data: T): MockQueryResult<T> => ({
    data: error ? null : data,
    error,
    count: Array.isArray(data) ? data.length : null,
  });

  const chainable: Record<string, jest.Mock> = {};

  // 체이닝 가능한 필터 메서드들
  const filterMethods = [
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'containedBy',
    'not',
    'or',
    'filter',
    'match',
    'order',
    'limit',
    'range',
    'single',
    'maybeSingle',
    'abortSignal',
    'throwOnError',
  ];

  // 각 필터 메서드가 builder 자체를 반환하도록 설정
  for (const method of filterMethods) {
    chainable[method] = jest.fn().mockReturnThis();
  }

  // 최종 결과를 반환하는 메서드 오버라이드
  chainable.single = jest.fn().mockImplementation(() => {
    const data = overrides.selectData;
    const singleItem = Array.isArray(data) ? data[0] : data;
    return Promise.resolve(resolve(singleItem ?? null));
  });

  chainable.maybeSingle = jest.fn().mockImplementation(() => {
    const data = overrides.selectData;
    const singleItem = Array.isArray(data) ? data[0] : data;
    return Promise.resolve(resolve(singleItem ?? null));
  });

  // select → then 가능하도록 thenable 설정
  const makeThenable = (data: unknown) => {
    const result = {
      ...chainable,
      then: jest.fn((resolve) => resolve({ data: error ? null : data, error, count: null })),
    };
    // filter 메서드들이 thenable 객체를 반환하도록
    for (const method of filterMethods) {
      result[method] = jest.fn().mockReturnValue(result);
    }
    return result;
  };

  const selectResult = makeThenable(overrides.selectData ?? []);
  const insertResult = makeThenable(overrides.insertData ?? null);
  const updateResult = makeThenable(overrides.updateData ?? null);
  const deleteResult = makeThenable(overrides.deleteData ?? null);
  const upsertResult = makeThenable(overrides.upsertData ?? null);

  return {
    select: jest.fn().mockReturnValue(selectResult),
    insert: jest.fn().mockReturnValue(insertResult),
    update: jest.fn().mockReturnValue(updateResult),
    delete: jest.fn().mockReturnValue(deleteResult),
    upsert: jest.fn().mockReturnValue(upsertResult),
  };
}

export function createMockSupabaseClient(overrides: MockSupabaseOverrides = {}) {
  const queryBuilder = createMockQueryBuilder(overrides);

  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    rpc: jest.fn().mockResolvedValue({
      data: overrides.rpcData ?? null,
      error: overrides.error
        ? { message: overrides.error.message, code: overrides.error.code ?? 'UNKNOWN' }
        : null,
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com' } },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/file' } }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  };
}
