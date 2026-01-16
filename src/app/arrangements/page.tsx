'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns/format';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navigation from '@/components/layout/Navigation';
import ArrangementList from '@/components/features/arrangements/ArrangementList';
import ArrangementFilters from '@/components/features/arrangements/ArrangementFilters';
import ArrangementPagination from '@/components/features/arrangements/ArrangementPagination';
import CreateArrangementDialog from '@/components/features/arrangements/CreateArrangementDialog';
import { useArrangements } from '@/hooks/useArrangements';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';

function ArrangementsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { hasRole, isLoading: isAuthLoading } = useAuth();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // 자리배치 생성/편집 권한: ADMIN, CONDUCTOR만
    // 클라이언트에서만 권한 확인 (hydration mismatch 방지)
    const [canCreateArrangement, setCanCreateArrangement] = useState(false);

    useEffect(() => {
        if (!isAuthLoading) {
            setCanCreateArrangement(hasRole(['ADMIN', 'CONDUCTOR']));
        }
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

        const newUrl = params.toString()
            ? `/arrangements?${params.toString()}`
            : '/arrangements';
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
        setCurrentPage(1);  // 검색 시 첫 페이지로
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
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
            <Navigation />

            <div className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* 헤더 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="heading-2 text-[var(--color-text-primary)]">자리배치 관리</h1>
                            <p className="text-[var(--color-text-secondary)] mt-1">
                                찬양대 자리배치표를 생성하고 관리합니다.
                                {meta.total > 0 && (
                                    <span className="ml-2 text-[var(--color-text-tertiary)]">
                                        (총 {meta.total}개)
                                    </span>
                                )}
                            </p>
                        </div>
                        {canCreateArrangement && (
                            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                새 배치표 만들기
                            </Button>
                        )}
                    </div>

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
        </div>
    );
}

export default function ArrangementsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--color-background-tertiary)] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        }>
            <ArrangementsContent />
        </Suspense>
    );
}
