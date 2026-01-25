'use client';

import { CheckCircle, ChevronRight, Clock, Info, Loader2, Search, UserCheck } from 'lucide-react';

import { Suspense, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useAvailableMembers, useMyLinkStatus, useRequestMemberLink } from '@/hooks/useMemberLink';

const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

// useSearchParams를 사용하는 내부 컴포넌트
function MemberLinkContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // 검색 및 선택 상태
  const [searchInput, setSearchInput] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [selectedMemberPart, setSelectedMemberPart] = useState<string>('');
  const [selectedMemberIsSinger, setSelectedMemberIsSinger] = useState<boolean>(true);

  // 추가 입력 필드
  const [heightCm, setHeightCm] = useState<string>('');
  const [regularMemberSince, setRegularMemberSince] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 검색어 디바운싱
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data: availableMembers, isLoading: membersLoading } =
    useAvailableMembers(debouncedSearch);
  const { data: myLinkStatus, isLoading: statusLoading } = useMyLinkStatus();
  const requestMutation = useRequestMemberLink();

  // 검색 결과 필터링 (검색어가 있을 때만 표시)
  const filteredMembers = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    return availableMembers || [];
  }, [availableMembers, debouncedSearch]);

  const handleSelectMember = (member: {
    id: string;
    name: string;
    part: string;
    is_singer: boolean;
  }) => {
    setSelectedMemberId(member.id);
    setSelectedMemberName(member.name);
    setSelectedMemberPart(member.part);
    setSelectedMemberIsSinger(member.is_singer);
    setSearchInput(''); // 선택 후 검색창 초기화
  };

  const handleClearSelection = () => {
    setSelectedMemberId('');
    setSelectedMemberName('');
    setSelectedMemberPart('');
    setSelectedMemberIsSinger(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedMemberId) {
      setError('연결할 대원을 선택해주세요.');
      return;
    }

    // 등단자(is_singer=true)인 경우에만 키 검증
    let height: number | undefined;
    if (selectedMemberIsSinger) {
      height = parseInt(heightCm, 10);
      if (!heightCm || isNaN(height) || height < 100 || height > 250) {
        setError('키는 100cm ~ 250cm 사이의 숫자로 입력해주세요.');
        return;
      }
    }

    try {
      await requestMutation.mutateAsync({
        member_id: selectedMemberId,
        height_cm: height,
        regular_member_since: regularMemberSince || undefined,
      });
      setSuccess('연결 요청이 생성되었습니다. 파트장의 승인을 기다려주세요.');
      setSelectedMemberId('');
      setSelectedMemberName('');
      setSelectedMemberPart('');
      setSelectedMemberIsSinger(true);
      setHeightCm('');
      setRegularMemberSince('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다.');
    }
  };

  // 로딩 중
  if (authLoading || statusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Alert>
          <AlertDescription>
            로그인이 필요합니다.{' '}
            <a href="/login" className="underline">
              로그인 페이지로 이동
            </a>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 이미 승인된 경우
  if (myLinkStatus?.link_status === 'approved') {
    const memberData = myLinkStatus?.member;
    const linkedMember = Array.isArray(memberData) ? memberData[0] : memberData;

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">연결 완료</h1>
          <p className="text-[var(--color-text-secondary)]">
            {linkedMember?.name} ({PART_LABELS[linkedMember?.part || ''] || linkedMember?.part})
            대원으로 연결되어 있습니다.
          </p>
          <Button onClick={() => (window.location.href = '/my-attendance')}>
            내 출석으로 이동
          </Button>
        </div>
      </div>
    );
  }

  // 대기중인 경우
  if (status === 'pending' || myLinkStatus?.link_status === 'pending') {
    const memberData = myLinkStatus?.member;
    const pendingMember = Array.isArray(memberData) ? memberData[0] : memberData;

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <Clock className="h-16 w-16 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">승인 대기중</h1>
          <p className="text-[var(--color-text-secondary)]">
            {pendingMember?.name} ({PART_LABELS[pendingMember?.part || ''] || pendingMember?.part})
            대원으로 연결 요청이 진행중입니다.
          </p>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            파트장 또는 관리자가 요청을 확인하면 승인됩니다.
          </p>
        </div>
      </div>
    );
  }

  // 연결 요청 폼
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <UserCheck className="h-12 w-12 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">대원 연결</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            본인의 이름을 검색하여 찬양대원 정보와 연결해주세요
          </p>
        </div>

        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 대원 검색/선택 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              대원 검색 <span className="text-red-500">*</span>
            </label>

            {/* 선택된 대원 표시 */}
            {selectedMemberId ? (
              <div className="flex items-center justify-between rounded-md border border-[var(--color-primary)] bg-[var(--color-primary-light)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--color-primary)]">
                    {selectedMemberName}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    ({PART_LABELS[selectedMemberPart] || selectedMemberPart})
                  </span>
                  {!selectedMemberIsSinger && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      비등단
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-sm text-[var(--color-text-tertiary)] underline hover:text-[var(--color-text-secondary)]"
                >
                  다시 선택
                </button>
              </div>
            ) : (
              <>
                {/* 검색 입력 */}
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-[var(--color-text-tertiary)]" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-primary)] py-3 pr-4 pl-10 text-[var(--color-text-primary)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
                  />
                  {searchInput !== debouncedSearch && (
                    <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform animate-spin text-[var(--color-text-tertiary)]" />
                  )}
                </div>

                {/* 검색창 하단 힌트 (검색어가 없을 때) */}
                {!debouncedSearch.trim() && (
                  <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                    이름을 검색한 후 목록에서 선택하세요
                  </p>
                )}

                {/* 검색 결과 */}
                {debouncedSearch.trim() && (
                  <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-background-primary)]">
                    {membersLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : filteredMembers.length > 0 ? (
                      <>
                        {/* 안내 헤더 */}
                        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                          <span>👆</span>
                          <span>아래에서 본인 이름을 선택하세요</span>
                        </div>
                        {filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleSelectMember(member)}
                            className="group w-full cursor-pointer border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {member.name}
                                </span>
                                <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                                  ({PART_LABELS[member.part] || member.part})
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400 transition-colors group-hover:text-blue-500" />
                            </div>
                          </button>
                        ))}
                      </>
                    ) : (
                      <p className="py-4 text-center text-[var(--color-text-secondary)]">
                        검색 결과가 없습니다. 파트장에게 문의해주세요.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 등단자(is_singer=true)인 경우에만 키 및 임명일 표시 */}
          {selectedMemberIsSinger ? (
            <>
              {/* 키(신장) 입력 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  키 (cm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="예: 170"
                  min={100}
                  max={250}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-primary)] px-4 py-3 text-[var(--color-text-primary)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
                />
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>입력하신 키 정보는 AI 자리배치 추천에 활용됩니다.</span>
                </div>
              </div>

              {/* 정대원 임명일 입력 (선택) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  정대원 임명일 <span className="text-[var(--color-text-tertiary)]">(선택)</span>
                </label>
                <input
                  type="date"
                  value={regularMemberSince}
                  onChange={(e) => setRegularMemberSince(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-primary)] px-4 py-3 text-[var(--color-text-primary)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
                />
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  정대원으로 임명된 날짜를 입력해주세요. 마이페이지에서 나중에 수정할 수 있습니다.
                </p>
              </div>
            </>
          ) : (
            selectedMemberId && (
              /* 비등단자(지휘자/반주자) 안내 */
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">지휘자 또는 반주자로 등록됩니다</p>
                    <p className="mt-1 text-amber-700 dark:text-amber-300">
                      비등단 구성원은 출석 체크 및 자리배치 대상에서 제외됩니다. 키와 임명일 정보는
                      필요하지 않습니다.
                    </p>
                  </div>
                </div>
              </div>
            )
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              !selectedMemberId ||
              (selectedMemberIsSinger && !heightCm) ||
              requestMutation.isPending
            }
          >
            {requestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                요청 중...
              </>
            ) : (
              '연결 요청'
            )}
          </Button>

          <p className="text-center text-xs text-[var(--color-text-tertiary)]">
            연결 요청 후 파트장 또는 관리자의 승인이 필요합니다.
          </p>
        </form>
      </div>
    </div>
  );
}

// Suspense로 감싸는 메인 컴포넌트
export default function MemberLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      }
    >
      <MemberLinkContent />
    </Suspense>
  );
}
