'use client';

import { format } from 'date-fns/format';
import { Plus } from 'lucide-react';

import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import ArrangementFilters from '@/components/features/arrangements/ArrangementFilters';
import ArrangementList from '@/components/features/arrangements/ArrangementList';
import ArrangementPagination from '@/components/features/arrangements/ArrangementPagination';
import CreateArrangementDialog from '@/components/features/arrangements/CreateArrangementDialog';
import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

import { useArrangements } from '@/hooks/useArrangements';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';

function ArrangementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole, isLoading: isAuthLoading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 자리배치 생성/편집 권한: ADMIN, CONDUCTOR만
  // useMemo로 권한 확인 (hydration mismatch 방지를 위해 로딩 중에는 false)
  const canCreateArrangement = useMemo(() => {
    if (isAuthLoading) return false;
    return hasRole(['ADMIN', 'CONDUCTOR']);
  }, [isAuthLoading, hasRole]);

  // URL에서 초기값 가져오기
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 20);
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
  );
  const [serviceType, setServiceType] = useState(searchParams.get('serviceType') || '');

  // 검색어 디바운싱 (300ms)
  const debouncedSearch = useDebounce(searchInput, 300);

  // URL 업데이트
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set('search', debouncedSearch);
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (limit !== 20) params.set('limit', limit.toString());
    if (startDate) params.set('startDate', format(startDate, 'yyyy-MM-dd'));
    if (endDate) params.set('endDate', format(endDate, 'yyyy-MM-dd'));
    if (serviceType) params.set('serviceType', serviceType);

    const newUrl = params.toString() ? `/arrangements?${params.toString()}` : '/arrangements';
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearch, currentPage, limit, startDate, endDate, serviceType, router]);

  // 필터 옵션 구성
  const filters = {
    search: debouncedSearch || undefined,
    page: currentPage,
    limit,
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    serviceType: serviceType || undefined,
  };

  // React Query로 데이터 페칭
  const { data, isLoading, error } = useArrangements(filters);

  const arrangements = data?.data || [];
  const meta = data?.meta || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  };

  // 핸들러 함수들
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setCurrentPage(1); // 검색 시 첫 페이지로
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setCurrentPage(1);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setCurrentPage(1);
  };

  const handleServiceTypeChange = (value: string) => {
    setServiceType(value);
    setCurrentPage(1);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchInput('');
    setStartDate(undefined);
    setEndDate(undefined);
    setServiceType('');
    setCurrentPage(1);
    setLimit(20);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* 헤더 - 타이틀 영역 */}
          <div>
            <h1 className="heading-2 text-[var(--color-text-primary)]">자리배치 관리</h1>
            <p className="mt-1 text-[var(--color-text-secondary)]">
              예배별 자리배치표를 생성하고 관리합니다.
              {meta.total > 0 && (
                <span className="ml-2 text-[var(--color-text-tertiary)]">(총 {meta.total}개)</span>
              )}
            </p>
          </div>

          {/* 컨트롤 영역 */}
          {canCreateArrangement && (
            <div className="flex justify-end">
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />새 배치표 만들기
              </Button>
            </div>
          )}

          {/* 필터 UI */}
          <ArrangementFilters
            searchValue={searchInput}
            onSearchChange={handleSearchChange}
            isSearching={searchInput !== debouncedSearch}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            serviceType={serviceType}
            onServiceTypeChange={handleServiceTypeChange}
            onReset={handleReset}
          />

          {/* 로딩 상태 */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {/* 에러 상태 */}
          {error && (
            <Alert variant="error">
              <AlertDescription>
                {error.message || '배치표 목록을 불러오는데 실패했습니다.'}
              </AlertDescription>
            </Alert>
          )}

          {/* 목록 */}
          {!isLoading && !error && data && (
            <>
              <ArrangementList arrangements={arrangements} />

              {/* 페이지네이션 */}
              <ArrangementPagination
                meta={meta}
                onPageChange={setCurrentPage}
                onLimitChange={handleLimitChange}
              />
            </>
          )}

          {canCreateArrangement && (
            <CreateArrangementDialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function ArrangementsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-tertiary)]">
          <Spinner size="lg" />
        </div>
      }
    >
      <ArrangementsContent />
    </Suspense>
  );
}
