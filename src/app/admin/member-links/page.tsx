'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePendingLinkRequests, useApproveMemberLink, useRejectMemberLink } from '@/hooks/useMemberLink';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, X, UserCheck, Clock } from 'lucide-react';

const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

export default function MemberLinksAdminPage() {
  const { profile, hasRole, isLoading: authLoading } = useAuth();
  const [selectedPart, setSelectedPart] = useState<string>('');

  // PART_LEADER는 자기 파트만 조회
  const filterPart = profile?.role === 'PART_LEADER' ? undefined : selectedPart || undefined;

  const { data: pendingRequests, isLoading, error } = usePendingLinkRequests(filterPart);
  const approveMutation = useApproveMemberLink();
  const rejectMutation = useRejectMemberLink();

  // 권한 확인
  const hasPermission = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert variant="error">
          <AlertDescription>
            이 페이지에 접근할 권한이 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleApprove = async (userId: string) => {
    try {
      await approveMutation.mutateAsync(userId);
    } catch (err) {
      console.error('승인 실패:', err);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('정말 이 연결 요청을 거부하시겠습니까?')) return;

    try {
      await rejectMutation.mutateAsync(userId);
    } catch (err) {
      console.error('거부 실패:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <UserCheck className="h-6 w-6" />
          대원 연결 승인
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          카카오 로그인 사용자의 대원 연결 요청을 승인하거나 거부합니다.
        </p>
      </div>

      {/* 파트 필터 (PART_LEADER 제외) */}
      {profile?.role !== 'PART_LEADER' && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={selectedPart === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPart('')}
          >
            전체
          </Button>
          {['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'].map((part) => (
            <Button
              key={part}
              variant={selectedPart === part ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPart(part)}
            >
              {PART_LABELS[part]}
            </Button>
          ))}
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>
            데이터를 불러오는 중 오류가 발생했습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      )}

      {/* 요청 목록 */}
      {!isLoading && pendingRequests && (
        <>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-4" />
              <p className="text-[var(--color-text-secondary)]">
                대기중인 연결 요청이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {request.name}
                        </span>
                        <span className="text-sm text-[var(--color-text-tertiary)]">
                          ({request.email})
                        </span>
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        연결 요청 대상:{' '}
                        <span className="font-medium">
                          {request.member?.name}
                        </span>
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[var(--color-background-tertiary)]">
                          {PART_LABELS[request.member?.part || ''] || request.member?.part}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        요청 시간:{' '}
                        {new Date(request.link_requested_at).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request.id)}
                        disabled={rejectMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        <span className="ml-1">거부</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span className="ml-1">승인</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
