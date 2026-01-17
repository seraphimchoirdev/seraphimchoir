'use client';

import { useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAvailableMembers, useRequestMemberLink, useMyLinkStatus } from '@/hooks/useMemberLink';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Clock, UserCheck, Search, Info } from 'lucide-react';

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

  const { data: availableMembers, isLoading: membersLoading } = useAvailableMembers(debouncedSearch);
  const { data: myLinkStatus, isLoading: statusLoading } = useMyLinkStatus();
  const requestMutation = useRequestMemberLink();

  // 검색 결과 필터링 (검색어가 있을 때만 표시)
  const filteredMembers = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    return availableMembers || [];
  }, [availableMembers, debouncedSearch]);

  const handleSelectMember = (member: { id: string; name: string; part: string; is_singer: boolean }) => {
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert>
          <AlertDescription>
            로그인이 필요합니다. <a href="/login" className="underline">로그인 페이지로 이동</a>
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            연결 완료
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {linkedMember?.name} ({PART_LABELS[linkedMember?.part || ''] || linkedMember?.part}) 대원으로 연결되어 있습니다.
          </p>
          <Button onClick={() => window.location.href = '/my-attendance'}>
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <Clock className="h-16 w-16 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            승인 대기중
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {pendingMember?.name} ({PART_LABELS[pendingMember?.part || ''] || pendingMember?.part}) 대원으로 연결 요청이 진행중입니다.
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <UserCheck className="h-12 w-12 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            대원 연결
          </h1>
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
              <div className="flex items-center justify-between p-4 bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-md">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-medium text-[var(--color-primary)]">
                    {selectedMemberName}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    ({PART_LABELS[selectedMemberPart] || selectedMemberPart})
                  </span>
                  {!selectedMemberIsSinger && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      비등단
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] underline"
                >
                  다시 선택
                </button>
              </div>
            ) : (
              <>
                {/* 검색 입력 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-md bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  {searchInput !== debouncedSearch && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-[var(--color-text-tertiary)]" />
                  )}
                </div>

                {/* 검색 결과 */}
                {debouncedSearch.trim() && (
                  <div className="mt-2 max-h-60 overflow-y-auto border border-[var(--color-border)] rounded-md bg-[var(--color-background-primary)]">
                    {membersLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelectMember(member)}
                          className="w-full text-left px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-background-secondary)] transition-colors"
                        >
                          <span className="font-medium">{member.name}</span>
                          <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                            ({PART_LABELS[member.part] || member.part})
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-center py-4 text-[var(--color-text-secondary)]">
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
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-md bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
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
                  className="w-full px-4 py-3 border border-[var(--color-border)] rounded-md bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  정대원으로 임명된 날짜를 입력해주세요. 마이페이지에서 나중에 수정할 수 있습니다.
                </p>
              </div>
            </>
          ) : selectedMemberId && (
            /* 비등단자(지휘자/반주자) 안내 */
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">지휘자 또는 반주자로 등록됩니다</p>
                  <p className="mt-1 text-amber-700 dark:text-amber-300">
                    비등단 구성원은 출석 체크 및 자리배치 대상에서 제외됩니다. 키와 임명일 정보는 필요하지 않습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            className="w-full"
            disabled={!selectedMemberId || (selectedMemberIsSinger && !heightCm) || requestMutation.isPending}
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

          <p className="text-xs text-center text-[var(--color-text-tertiary)]">
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
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      }
    >
      <MemberLinkContent />
    </Suspense>
  );
}
