'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAvailableMembers, useRequestMemberLink, useMyLinkStatus } from '@/hooks/useMemberLink';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Clock, UserCheck } from 'lucide-react';

const PARTS = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as const;

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
  const { profile, isAuthenticated, isLoading: authLoading } = useAuth();

  const [selectedPart, setSelectedPart] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: availableMembers, isLoading: membersLoading } = useAvailableMembers(selectedPart || undefined);
  const { data: myLinkStatus, isLoading: statusLoading } = useMyLinkStatus();
  const requestMutation = useRequestMemberLink();

  // 이미 연결되었거나 대기중인 경우 처리
  // Note: 조건부 렌더링으로 처리하므로 useEffect 불필요

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedMemberId) {
      setError('연결할 대원을 선택해주세요.');
      return;
    }

    try {
      await requestMutation.mutateAsync(selectedMemberId);
      setSuccess('연결 요청이 생성되었습니다. 파트장의 승인을 기다려주세요.');
      setSelectedMemberId('');
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

  // 이미 승인된 경우 (myLinkStatus가 로드될 때까지 기다림)
  if (myLinkStatus?.link_status === 'approved') {
    // member 관계는 배열 또는 단일 객체일 수 있음
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

  // 대기중인 경우 (myLinkStatus가 로드될 때까지 기다림)
  if (status === 'pending' || myLinkStatus?.link_status === 'pending') {
    // member 관계는 배열 또는 단일 객체일 수 있음
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
            본인의 찬양대원 정보를 선택해주세요
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
          {/* 파트 선택 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              파트 선택
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PARTS.map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => {
                    setSelectedPart(part);
                    setSelectedMemberId('');
                  }}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    selectedPart === part
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'
                  }`}
                >
                  {PART_LABELS[part]}
                </button>
              ))}
            </div>
          </div>

          {/* 대원 선택 */}
          {selectedPart && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                대원 선택
              </label>
              {membersLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : availableMembers && availableMembers.length > 0 ? (
                <div className="max-h-60 overflow-y-auto border border-[var(--color-border)] rounded-md">
                  {availableMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`w-full text-left px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 transition-colors ${
                        selectedMemberId === member.id
                          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                          : 'hover:bg-[var(--color-background-secondary)]'
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-[var(--color-text-secondary)]">
                  선택 가능한 대원이 없습니다.
                </p>
              )}
            </div>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            className="w-full"
            disabled={!selectedMemberId || requestMutation.isPending}
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
