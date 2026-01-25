'use client';

import { AlertTriangle, Check, MousePointer } from 'lucide-react';

import { memo, useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useEmergencyChangePreview } from '@/hooks/useEmergencyChangePreview';
import { useEmergencyUnavailable } from '@/hooks/useEmergencyUnavailable';

import { cn } from '@/lib/utils';

import { useArrangementStore } from '@/store/arrangement-store';

import type {
  EmergencyUnavailableDialogProps,
  UnavailableProcessMode,
} from '@/types/emergency-changes';

import EmergencyChangePreview from './EmergencyChangePreview';

/**
 * 긴급 등단 불가 처리 확인 다이얼로그
 *
 * 컨텍스트 메뉴 "긴급 등단 불가 처리" 클릭 시 표시됩니다.
 * - 처리 방식 선택: 빈 자리 유지 / 자동 당기기 / 수동 처리
 * - 각 방식별 미리보기 제공
 * - 출석 상태도 '등단 불가'로 변경됨을 안내
 */
const EmergencyUnavailableDialog = memo(function EmergencyUnavailableDialog({
  open,
  onOpenChange,
  targetMember,
  arrangementId,
  date,
  onComplete,
  onError,
}: EmergencyUnavailableDialogProps) {
  // 처리 방식 선택 상태 (기본: 자동 당기기)
  const [processMode, setProcessMode] = useState<UnavailableProcessMode>('AUTO_PULL');

  // Store 액션
  const removeMember = useArrangementStore((state) => state.removeMember);
  const addEmergencyChange = useArrangementStore((state) => state.addEmergencyChange);

  // 미리보기 훅
  const { preview, leaveEmptyPreview, autoPullPreview } = useEmergencyChangePreview({
    targetMember,
    processMode,
    isOpen: open,
  });

  // 긴급 등단 불가 처리 훅
  const { handleEmergencyUnavailable, isLoading } = useEmergencyUnavailable({
    arrangementId,
    date,
    onSuccess: (message) => {
      onOpenChange(false);
      onComplete?.(message);
    },
    onError: (message) => {
      onError?.(message);
    },
  });

  // 처리 방식 옵션
  const processModes: Array<{
    mode: UnavailableProcessMode;
    label: string;
    description: string;
    movedCount: number | null;
    isRecommended?: boolean;
  }> = [
    {
      mode: 'LEAVE_EMPTY',
      label: '빈 자리 유지',
      description: '자리만 비우고 이동 없음',
      movedCount: leaveEmptyPreview?.movedMemberCount ?? null,
    },
    {
      mode: 'AUTO_PULL',
      label: '자동 당기기',
      description: '같은 파트만 당김',
      movedCount: autoPullPreview?.movedMemberCount ?? null,
      isRecommended: true,
    },
    {
      mode: 'MANUAL',
      label: '수동 처리',
      description: '직접 좌석 조정',
      movedCount: 0,
    },
  ];

  // 적용 핸들러
  const handleApply = useCallback(async () => {
    if (!targetMember) return;

    if (processMode === 'MANUAL') {
      // 수동 처리: 제거만 하고 다이얼로그 닫기
      removeMember(targetMember.row, targetMember.col);

      // 변동 이력 기록
      addEmergencyChange({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'UNAVAILABLE',
        memberId: targetMember.memberId,
        memberName: targetMember.memberName,
        part: targetMember.part,
        processMode: 'MANUAL',
        removedFrom: { row: targetMember.row, col: targetMember.col },
        cascadeChanges: [
          {
            step: 1,
            type: 'REMOVE',
            description: `${targetMember.memberName}(${targetMember.part.charAt(0)}) 수동 제거`,
            memberId: targetMember.memberId,
            memberName: targetMember.memberName,
            part: targetMember.part,
            from: { row: targetMember.row, col: targetMember.col },
          },
        ],
        movedMemberCount: 0,
      });

      onOpenChange(false);
      onComplete?.(`${targetMember.memberName}님이 좌석에서 제거되었습니다. 직접 조정해주세요.`);
      return;
    }

    // 빈 자리 유지 또는 자동 당기기: useEmergencyUnavailable 호출
    // 빈 자리 유지 모드일 때는 enableCrossRowMove를 false로
    await handleEmergencyUnavailable({
      memberId: targetMember.memberId,
      memberName: targetMember.memberName,
      part: targetMember.part,
      row: targetMember.row,
      col: targetMember.col,
    });

    // 변동 이력 기록
    const currentPreview = processMode === 'LEAVE_EMPTY' ? leaveEmptyPreview : autoPullPreview;
    if (currentPreview) {
      addEmergencyChange({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'UNAVAILABLE',
        memberId: targetMember.memberId,
        memberName: targetMember.memberName,
        part: targetMember.part,
        processMode,
        removedFrom: { row: targetMember.row, col: targetMember.col },
        cascadeChanges: currentPreview.cascadeChanges,
        movedMemberCount: currentPreview.movedMemberCount,
      });
    }
  }, [
    targetMember,
    processMode,
    removeMember,
    handleEmergencyUnavailable,
    addEmergencyChange,
    leaveEmptyPreview,
    autoPullPreview,
    onOpenChange,
    onComplete,
  ]);

  // 파트 한글명
  const getPartLabel = (part: string) => {
    switch (part) {
      case 'SOPRANO':
        return '소프라노';
      case 'ALTO':
        return '알토';
      case 'TENOR':
        return '테너';
      case 'BASS':
        return '베이스';
      default:
        return 'Sp';
    }
  };

  if (!targetMember) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            긴급 등단 불가 처리
          </DialogTitle>
          <DialogDescription>처리 방식을 선택하고 예상 변동 사항을 확인하세요.</DialogDescription>
        </DialogHeader>

        {/* 대상 정보 */}
        <div className="bg-muted/50 space-y-1 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">대상:</span>
            <span className="font-semibold">{targetMember.memberName}</span>
            <Badge variant="secondary" className="text-xs">
              {getPartLabel(targetMember.part)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">현재 위치:</span>
            <span className="font-medium">
              {targetMember.row}행 {targetMember.col}열
            </span>
          </div>
        </div>

        {/* 처리 방식 선택 */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground text-sm font-medium">처리 방식 선택</h4>
          <div className="grid grid-cols-3 gap-2">
            {processModes.map((option) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => setProcessMode(option.mode)}
                className={cn(
                  'relative flex flex-col items-center rounded-lg border-2 p-3 transition-all',
                  processMode === option.mode
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                {/* 선택 체크 */}
                {processMode === option.mode && (
                  <div className="absolute top-1 right-1">
                    <Check className="text-primary h-4 w-4" />
                  </div>
                )}

                {/* 추천 뱃지 */}
                {option.isRecommended && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0 text-[10px]"
                  >
                    기본
                  </Badge>
                )}

                {/* 아이콘 */}
                <div className="mb-1">
                  {option.mode === 'LEAVE_EMPTY' && (
                    <div className="border-muted-foreground/50 h-8 w-8 rounded-md border-2 border-dashed" />
                  )}
                  {option.mode === 'AUTO_PULL' && (
                    <div className="flex items-center gap-0.5">
                      <div className="bg-primary/60 h-4 w-4 rounded" />
                      <span className="text-muted-foreground">←</span>
                      <div className="bg-primary/30 h-4 w-4 rounded" />
                    </div>
                  )}
                  {option.mode === 'MANUAL' && (
                    <MousePointer className="text-muted-foreground h-6 w-6" />
                  )}
                </div>

                {/* 라벨 */}
                <span className="text-xs font-medium">{option.label}</span>
                <span className="text-muted-foreground text-center text-[10px]">
                  {option.description}
                </span>

                {/* 이동 인원 수 */}
                {option.movedCount !== null && (
                  <span
                    className={cn(
                      'mt-1 text-[10px]',
                      option.movedCount === 0 ? 'text-emerald-600' : 'text-amber-600'
                    )}
                  >
                    ({option.movedCount}명 이동)
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 미리보기 */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground text-sm font-medium">예상 변동 사항</h4>
          <div className="bg-muted/30 max-h-[200px] overflow-y-auto rounded-lg p-3">
            <EmergencyChangePreview
              preview={preview}
              modeLabel={processModes.find((m) => m.mode === processMode)?.label || ''}
              compact
            />
          </div>
        </div>

        {/* 경고 메시지 */}
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="text-xs">출석 상태도 &apos;등단 불가&apos;로 변경됩니다.</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleApply} disabled={isLoading}>
            {isLoading ? '처리 중...' : '적용하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default EmergencyUnavailableDialog;
