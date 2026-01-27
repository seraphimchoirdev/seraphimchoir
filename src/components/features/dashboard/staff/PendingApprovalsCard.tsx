'use client';

import { Check, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/lib/toast';
import type { PendingApproval } from '@/app/api/dashboard/pending-approvals/route';

interface PendingApprovalsCardProps {
  approvals: PendingApproval[];
}

const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

/**
 * 대기 중인 승인 건 카드 (ADMIN 전용)
 */
export function PendingApprovalsCard({ approvals }: PendingApprovalsCardProps) {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);

  if (approvals.length === 0) {
    return null;
  }

  const handleApprove = async (userId: string) => {
    setProcessing(userId);
    try {
      const response = await fetch('/api/admin/member-links/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('승인 처리에 실패했습니다.');
      }

      showSuccess('연결이 승인되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-approvals'] });
    } catch (error) {
      showError('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (userId: string) => {
    setProcessing(userId);
    try {
      const response = await fetch('/api/admin/member-links/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('거절 처리에 실패했습니다.');
      }

      showSuccess('연결이 거절되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-approvals'] });
    } catch (error) {
      showError('거절 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  // 요청 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    return `${days}일 전`;
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <Clock className="h-4 w-4" />
          대기 중인 승인 ({approvals.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvals.slice(0, 3).map((approval) => (
          <div
            key={approval.userId}
            className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[var(--color-text-primary)]">
                {approval.userName}
              </div>
              <div className="truncate text-sm text-[var(--color-text-secondary)]">
                → {approval.requestedMemberName}
                {approval.requestedMemberPart && ` (${PART_LABELS[approval.requestedMemberPart] || approval.requestedMemberPart})`}
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)]">
                {formatDate(approval.requestedAt)}
              </div>
            </div>
            <div className="ml-3 flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handleApprove(approval.userId)}
                disabled={processing === approval.userId}
                title="승인"
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handleReject(approval.userId)}
                disabled={processing === approval.userId}
                title="거절"
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        ))}

        {approvals.length > 3 && (
          <Button asChild variant="link" className="w-full text-amber-700">
            <a href="/admin/member-links">전체 {approvals.length}건 보기</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default PendingApprovalsCard;
