'use client';

import { useState } from 'react';
import { usePendingLinkRequests, useApproveMemberLink, useRejectMemberLink } from '@/hooks/useMemberLink';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, X, UserCheck, Clock, Info } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';

const logger = createLogger({ prefix: 'MemberLinksAdminPage' });

// 비등단자 역할 옵션
const NON_SINGER_ROLE_OPTIONS = [
  { value: 'CONDUCTOR', label: '지휘자' },
  { value: 'ACCOMPANIST', label: '반주자' },
] as const;

const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

// 파트별 뱃지 스타일 (디자인 시스템 CSS 변수 활용)
const PART_BADGE_STYLES: Record<string, string> = {
  SOPRANO: 'bg-[var(--color-part-soprano-100)] text-[var(--color-part-soprano-700)] border-[var(--color-part-soprano-200)]',
  ALTO: 'bg-[var(--color-part-alto-100)] text-[var(--color-part-alto-700)] border-[var(--color-part-alto-200)]',
  TENOR: 'bg-[var(--color-part-tenor-100)] text-[var(--color-part-tenor-700)] border-[var(--color-part-tenor-200)]',
  BASS: 'bg-[var(--color-part-bass-100)] text-[var(--color-part-bass-700)] border-[var(--color-part-bass-200)]',
  SPECIAL: 'bg-[var(--color-part-special-100)] text-[var(--color-part-special-700)] border-[var(--color-part-special-200)]',
};

// 파트별 필터 버튼 스타일 (선택 시)
const PART_FILTER_SELECTED_STYLES: Record<string, string> = {
  SOPRANO: 'bg-[var(--color-part-soprano-500)] text-white hover:bg-[var(--color-part-soprano-600)]',
  ALTO: 'bg-[var(--color-part-alto-500)] text-white hover:bg-[var(--color-part-alto-600)]',
  TENOR: 'bg-[var(--color-part-tenor-500)] text-white hover:bg-[var(--color-part-tenor-600)]',
  BASS: 'bg-[var(--color-part-bass-500)] text-white hover:bg-[var(--color-part-bass-600)]',
  SPECIAL: 'bg-[var(--color-part-special-500)] text-white hover:bg-[var(--color-part-special-600)]',
};

// 파트별 필터 버튼 스타일 (미선택 시)
const PART_FILTER_OUTLINE_STYLES: Record<string, string> = {
  SOPRANO: 'border-[var(--color-part-soprano-300)] text-[var(--color-part-soprano-600)] hover:bg-[var(--color-part-soprano-50)]',
  ALTO: 'border-[var(--color-part-alto-300)] text-[var(--color-part-alto-600)] hover:bg-[var(--color-part-alto-50)]',
  TENOR: 'border-[var(--color-part-tenor-300)] text-[var(--color-part-tenor-600)] hover:bg-[var(--color-part-tenor-50)]',
  BASS: 'border-[var(--color-part-bass-300)] text-[var(--color-part-bass-600)] hover:bg-[var(--color-part-bass-50)]',
  SPECIAL: 'border-[var(--color-part-special-300)] text-[var(--color-part-special-600)] hover:bg-[var(--color-part-special-50)]',
};

export default function MemberLinksAdminPage() {
  const [selectedPart, setSelectedPart] = useState<string>('');
  // 비등단자 역할 선택 상태 (userId -> role)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, 'CONDUCTOR' | 'ACCOMPANIST'>>({});

  // ADMIN만 접근 가능 (layout.tsx에서 체크)
  const { data: pendingRequests, isLoading, error } = usePendingLinkRequests(selectedPart || undefined);
  const approveMutation = useApproveMemberLink();
  const rejectMutation = useRejectMemberLink();

  const handleRoleChange = (userId: string, role: 'CONDUCTOR' | 'ACCOMPANIST') => {
    setSelectedRoles((prev) => ({ ...prev, [userId]: role }));
  };

  const handleApprove = async (userId: string, isSinger: boolean) => {
    // 비등단자인데 역할이 선택되지 않은 경우 경고
    if (!isSinger && !selectedRoles[userId]) {
      alert('비등단자의 역할을 먼저 선택해주세요. (지휘자 또는 반주자)');
      return;
    }

    try {
      await approveMutation.mutateAsync({
        userId,
        role: !isSinger ? selectedRoles[userId] : undefined,
      });
    } catch (err) {
      logger.error('승인 실패:', err);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('정말 이 연결 요청을 거부하시겠습니까?')) return;

    try {
      await rejectMutation.mutateAsync(userId);
    } catch (err) {
      logger.error('거부 실패:', err);
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

      {/* 파트 필터 - ADMIN은 모든 파트 조회 가능 */}
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
            variant="outline"
            size="sm"
            onClick={() => setSelectedPart(part)}
            className={cn(
              'border',
              selectedPart === part
                ? PART_FILTER_SELECTED_STYLES[part]
                : PART_FILTER_OUTLINE_STYLES[part]
            )}
          >
            {PART_LABELS[part]}
          </Button>
        ))}
      </div>

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
              {pendingRequests.map((request) => {
                const isSinger = request.member?.is_singer ?? true;
                return (
                  <div
                    key={request.id}
                    className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {request.name}
                          </span>
                          <span className="text-sm text-[var(--color-text-tertiary)]">
                            ({request.email})
                          </span>
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2 flex-wrap">
                          <span>연결 요청 대상:</span>
                          <span className="font-medium">
                            {request.member?.name}
                          </span>
                          <Badge
                            className={cn(
                              'text-xs font-medium',
                              PART_BADGE_STYLES[request.member?.part || ''] || 'bg-[var(--color-background-tertiary)]'
                            )}
                          >
                            {PART_LABELS[request.member?.part || ''] || request.member?.part}
                          </Badge>
                          {!isSinger && (
                            <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              비등단
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">
                          요청 시간:{' '}
                          {new Date(request.link_requested_at).toLocaleString('ko-KR')}
                        </div>

                        {/* 비등단자 역할 선택 */}
                        {!isSinger && (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                            <div className="flex items-start gap-2 mb-2">
                              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-amber-800 dark:text-amber-200">
                                비등단자의 역할을 선택해주세요
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {NON_SINGER_ROLE_OPTIONS.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleRoleChange(request.id, option.value)}
                                  className={cn(
                                    'px-3 py-1.5 text-sm rounded-md border transition-colors',
                                    selectedRoles[request.id] === option.value
                                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          disabled={rejectMutation.isPending}
                          className="text-[var(--color-error-600)] hover:text-[var(--color-error-700)] hover:bg-[var(--color-error-50)]"
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
                          onClick={() => handleApprove(request.id, isSinger)}
                          disabled={approveMutation.isPending || (!isSinger && !selectedRoles[request.id])}
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
