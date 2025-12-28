'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMembers } from '@/hooks/useMembers';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';
import MemberCard from './MemberCard';
import MemberListItem from './MemberListItem';
import MemberTable from './MemberTable';
import MemberForm from './MemberForm';
import { ArrowUpIcon, ArrowDownIcon, Search, X, SlidersHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Database } from '@/types/database.types';
import type { SortByField, SortOrder } from '@/types/api';

type Part = Database['public']['Enums']['part'];

const PARTS: { value: Part | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'SOPRANO', label: '소프라노' },
  { value: 'ALTO', label: '알토' },
  { value: 'TENOR', label: '테너' },
  { value: 'BASS', label: '베이스' },
];

const LIMIT_OPTIONS = [
  { value: 10, label: '10개씩' },
  { value: 20, label: '20개씩' },
  { value: 50, label: '50개씩' },
  { value: 100, label: '100개씩' },
];

const SORT_OPTIONS: { value: SortByField; label: string }[] = [
  { value: 'createdAt', label: '등록일순' },
  { value: 'name', label: '이름순' },
  { value: 'part', label: '파트순' },
  { value: 'experience', label: '경력순' },
];

import { useMounted } from '@/hooks/useMounted';

// ... imports

export default function MemberList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const mounted = useMounted();

  // PART_LEADER 이상 권한 확인
  const canCreateMember = mounted && hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']);

  // URL에서 초기값 가져오기
  const [selectedPart, setSelectedPart] = useState<Part | 'ALL'>(
    (searchParams.get('part') as Part) || 'ALL'
  );
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || ''
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get('page')) || 1
  );
  const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 20);
  const [sortBy, setSortBy] = useState<SortByField>(
    (searchParams.get('sortBy') as SortByField) || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('sortOrder') as SortOrder) || 'desc'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 검색어 디바운싱 (300ms)
  const debouncedSearch = useDebounce(searchInput, 300);

  // URL 업데이트
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedPart !== 'ALL') params.set('part', selectedPart);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (limit !== 20) params.set('limit', limit.toString());
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

    const newUrl = params.toString()
      ? `/members?${params.toString()}`
      : '/members';
    router.replace(newUrl, { scroll: false });
  }, [
    selectedPart,
    debouncedSearch,
    currentPage,
    limit,
    sortBy,
    sortOrder,
    router,
  ]);

  // 필터 옵션 구성
  const filters = {
    part: selectedPart !== 'ALL' ? selectedPart : undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit,
    sortBy,
    sortOrder,
  };

  // React Query로 데이터 페칭
  const { data, isLoading, error, refetch } = useMembers(filters);

  const members = data?.data || [];
  const meta = data?.meta || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  };

  // 필터 변경 핸들러 (상태 변경과 페이지 리셋을 함께 처리)
  const handlePartChange = (part: Part | 'ALL') => {
    setSelectedPart(part);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  // 정렬 기준 변경 핸들러
  const handleSortByChange = (newSortBy: SortByField) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 헤더: 제목 + 검색 + 필터 버튼 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h2 className="heading-3 text-[var(--color-text-primary)] flex items-center gap-2">
          찬양대원 목록
          <span className="text-lg font-normal text-[var(--color-text-tertiary)]">
            ({meta.total})
          </span>
        </h2>

        <div className="flex items-center gap-3">
          {/* 검색창 */}
          <div className="relative w-full lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </div>
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search"
              className="pl-10 pr-10"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]" />
              </button>
            )}
            {searchInput !== debouncedSearch && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* 필터 버튼 */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </Button>

          {/* 새 대원 등록 버튼 - 권한이 있는 경우에만 표시 */}
          {canCreateMember && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>새 대원 등록</span>
            </Button>
          )}
        </div>
      </div>

      {/* 필터 드롭다운 (토글) */}
      {showFilters && (
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border-default)]">
          <div className="space-y-4">
            {/* 정렬 기준 */}
            <div>
              <Label className="mb-2 block">정렬 기준</Label>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortByChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 정렬 순서 */}
            <div>
              <Label className="mb-2 block">정렬 순서</Label>
              <div className="flex gap-2">
                <Button
                  variant={sortOrder === 'desc' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortOrder('desc')}
                  className="gap-2"
                >
                  <ArrowDownIcon className="w-4 h-4" />
                  <span>내림차순</span>
                </Button>
                <Button
                  variant={sortOrder === 'asc' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortOrder('asc')}
                  className="gap-2"
                >
                  <ArrowUpIcon className="w-4 h-4" />
                  <span>오름차순</span>
                </Button>
              </div>
            </div>

            {/* 페이지당 항목 수 */}
            <div>
              <Label className="mb-2 block">표시 개수</Label>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="h-10 w-full rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* 파트 필터 - 그룹 버튼 */}
      {/* 파트 필터 - 그룹 버튼 */}
      <div className="flex flex-wrap gap-2">
        <ButtonGroup
          items={PARTS}
          value={selectedPart}
          onChange={(value) => handlePartChange(value as Part | 'ALL')}
        />
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center py-12">
          <Spinner size="lg" />
          <p className="mt-4 text-[var(--color-text-secondary)] body-base">로딩 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <Alert variant="error">
          <AlertDescription>
            {error.message || '찬양대원 목록을 불러오는데 실패했습니다.'}
          </AlertDescription>
        </Alert>
      )}

      {/* 목록 */}
      {!isLoading && !error && (
        <>
          {members.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border-default)]">
              <div className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)] flex items-center justify-center rounded-full bg-[var(--color-background-tertiary)] mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                찬양대원이 없습니다
              </h3>
              <p className="mt-1 text-[var(--color-text-secondary)]">
                {searchInput || selectedPart !== 'ALL'
                  ? '검색 조건에 맞는 찬양대원이 없습니다.'
                  : '새로운 찬양대원을 등록해보세요.'}
              </p>
            </div>
          ) : (
            <>
              {/* 데스크톱: 테이블 뷰 */}
              <div className="hidden lg:block">
                <MemberTable members={members} onRefetch={() => refetch()} />
              </div>

              {/* 모바일/태블릿: 리스트 뷰 */}
              <div className="lg:hidden flex flex-col gap-2">
                {members.map((member) => (
                  <MemberListItem
                    key={member.id}
                    member={member}
                    onDelete={() => refetch()}
                  />
                ))}
              </div>

              {/* 페이지네이션 컨트롤 */}
              {meta.totalPages > 1 && (
                <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* 페이지 정보 */}
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    <span className="font-medium text-[var(--color-text-primary)]">{meta.page}</span> /{' '}
                    {meta.totalPages} 페이지
                    <span className="mx-2">•</span>
                    {(meta.page - 1) * meta.limit + 1} -{' '}
                    {Math.min(meta.page * meta.limit, meta.total)}번째 항목
                  </div>

                  {/* 페이지네이션 버튼 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={!meta.hasPrev}
                      title="첫 페이지"
                    >
                      <span className="sr-only">First page</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                        />
                      </svg>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={!meta.hasPrev}
                      title="이전 페이지"
                    >
                      <span className="sr-only">Previous page</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </Button>

                    {/* 페이지 번호 입력 */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max={meta.totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = Number(e.target.value);
                          if (page >= 1 && page <= meta.totalPages) {
                            setCurrentPage(page);
                          }
                        }}
                        className="w-16 text-center"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        / {meta.totalPages}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(meta.totalPages, prev + 1)
                        )
                      }
                      disabled={!meta.hasNext}
                      title="다음 페이지"
                    >
                      <span className="sr-only">Next page</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(meta.totalPages)}
                      disabled={!meta.hasNext}
                      title="마지막 페이지"
                    >
                      <span className="sr-only">Last page</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 5l7 7-7 7M5 5l7 7-7 7"
                        />
                      </svg>
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* 대원 등록 모달 */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-3 text-[var(--color-text-primary)]">
              새 대원 등록
            </DialogTitle>
            <DialogDescription className="sr-only">
              새로운 찬양대원을 등록하거나 기존 대원의 정보를 수정하는 양식입니다.
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
