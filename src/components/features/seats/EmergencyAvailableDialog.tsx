'use client';

import { Check, MousePointer, Search, UserPlus, Zap } from 'lucide-react';

import { memo, useMemo, useState } from 'react';

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
import { Input } from '@/components/ui/input';

import { useAttendances } from '@/hooks/useAttendances';
import { useEmergencyAvailable } from '@/hooks/useEmergencyAvailable';
import { useMembers } from '@/hooks/useMembers';

import { cn } from '@/lib/utils';

import { useArrangementStore } from '@/store/arrangement-store';

import type { Database } from '@/types/database.types';
import type {
  AvailableProcessMode,
  EmergencyAvailableDialogProps,
  EmergencyChangePreview as PreviewType,
} from '@/types/emergency-changes';

import EmergencyChangePreview from './EmergencyChangePreview';

type Part = Database['public']['Enums']['part'];

/**
 * 긴급 등단 가능 인원 추가 다이얼로그
 *
 * MemberSidebar의 "긴급 인원 추가" 버튼 클릭 시 표시됩니다.
 * - 미등단 투표자 중 선택
 * - 자동 배치 / 수동 배치 선택
 * - 자동 배치 시 미리보기 제공
 */
const EmergencyAvailableDialog = memo(function EmergencyAvailableDialog({
  open,
  onOpenChange,
  arrangementId,
  date,
  onComplete,
  onError,
}: EmergencyAvailableDialogProps) {
  // 검색 및 선택 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [processMode, setProcessMode] = useState<AvailableProcessMode>('AUTO_PLACE');

  // Store
  const simulateAutoPlace = useArrangementStore((state) => state.simulateAutoPlace);

  // 모든 정대원 조회 (등단자만)
  const { data: membersData, isLoading: membersLoading } = useMembers({
    member_status: 'REGULAR',
    is_singer: true,
    limit: 100,
  });

  // 해당 날짜의 출석 데이터 조회
  const { data: attendances, isLoading: attendancesLoading } = useAttendances({
    date,
    refetchOnWindowFocus: true,
  });

  // 긴급 등단 가능 처리 훅
  const { handleAutoPlace, handleManualPlace, isLoading } = useEmergencyAvailable({
    arrangementId,
    date,
    onSuccess: (message) => {
      onOpenChange(false);
      setSelectedMemberId(null);
      setSearchTerm('');
      onComplete?.(message);
    },
    onError: (message) => {
      onError?.(message);
    },
  });

  // 출석 데이터 Map
  const attendanceMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof attendances>[number]>();
    attendances?.forEach((a) => {
      map.set(a.member_id, a);
    });
    return map;
  }, [attendances]);

  // 미등단 투표자 목록 (is_service_available = false인 멤버)
  const unavailableMembers = useMemo(() => {
    const members = membersData?.data || [];
    return members.filter((member) => {
      const attendance = attendanceMap.get(member.id);
      // 출석 레코드가 없으면 미등단 아님 (기본값 true)
      if (!attendance) return false;
      // is_service_available이 false인 경우만 미등단
      return attendance.is_service_available === false;
    });
  }, [membersData, attendanceMap]);

  // 검색 필터링된 미등단 투표자
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return unavailableMembers;
    return unavailableMembers.filter((m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unavailableMembers, searchTerm]);

  // 선택된 멤버 정보
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return unavailableMembers.find((m) => m.id === selectedMemberId) || null;
  }, [selectedMemberId, unavailableMembers]);

  // 자동 배치 미리보기
  const autoPlacePreview = useMemo<PreviewType | null>(() => {
    if (!selectedMember || processMode !== 'AUTO_PLACE') return null;

    const simulation = simulateAutoPlace(
      selectedMember.id,
      selectedMember.name,
      selectedMember.part
    );

    if (!simulation) return null;

    return {
      targetMember: {
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        part: selectedMember.part,
      },
      cascadeChanges: simulation.cascadeChanges,
      gridLayoutChanges: {
        rowCapacityChanges: [], // 확장 정보는 cascadeChanges에 포함
      },
      movedMemberCount: simulation.movedMemberCount,
      simulatedAssignments: simulation.assignments,
      simulatedGridLayout: simulation.gridLayout,
    };
  }, [selectedMember, processMode, simulateAutoPlace]);

  // 적용 핸들러
  const handleApply = async () => {
    if (!selectedMember) return;

    if (processMode === 'AUTO_PLACE') {
      await handleAutoPlace({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        part: selectedMember.part,
      });
    } else {
      await handleManualPlace({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        part: selectedMember.part,
      });
    }
  };

  // 파트별 색상
  const getPartColor = (part: Part) => {
    switch (part) {
      case 'SOPRANO':
        return 'bg-pink-100 text-pink-700 border-pink-300';
      case 'ALTO':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'TENOR':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'BASS':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-300';
    }
  };

  // 파트 한글명
  const getPartLabel = (part: Part) => {
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

  const isDataLoading = membersLoading || attendancesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <UserPlus className="h-5 w-5" />
            긴급 등단 가능 인원 추가
          </DialogTitle>
          <DialogDescription>
            미등단 투표자 중 당일 등단 가능해진 인원을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        {/* 검색 */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 미등단 투표자 목록 */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground text-sm font-medium">
            미등단 투표자 ({unavailableMembers.length}명)
          </h4>
          <div className="max-h-[200px] overflow-y-auto rounded-lg border">
            {isDataLoading ? (
              <div className="text-muted-foreground p-4 text-center text-sm">로딩 중...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                {searchTerm ? '검색 결과가 없습니다' : '미등단 투표자가 없습니다'}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() =>
                      setSelectedMemberId(selectedMemberId === member.id ? null : member.id)
                    }
                    className={cn(
                      'flex w-full items-center justify-between rounded-md p-2 transition-colors',
                      selectedMemberId === member.id
                        ? 'border-2 border-emerald-500 bg-emerald-50'
                        : 'hover:bg-muted/50 border-2 border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {selectedMemberId === member.id && (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                      <span className="font-medium">{member.name}</span>
                    </div>
                    <Badge variant="outline" className={cn('text-xs', getPartColor(member.part))}>
                      {getPartLabel(member.part)}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 처리 방식 선택 (선택된 멤버가 있을 때만) */}
        {selectedMember && (
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">처리 방식</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProcessMode('AUTO_PLACE')}
                className={cn(
                  'relative flex flex-col items-center rounded-lg border-2 p-3 transition-all',
                  processMode === 'AUTO_PLACE'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                {processMode === 'AUTO_PLACE' && (
                  <div className="absolute top-1 right-1">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                )}
                <Zap className="mb-1 h-6 w-6 text-emerald-600" />
                <span className="text-xs font-medium">자동 배치</span>
                <span className="text-muted-foreground text-center text-[10px]">
                  파트 영역 내 빈 좌석에 자동 배치
                </span>
              </button>
              <button
                type="button"
                onClick={() => setProcessMode('MANUAL')}
                className={cn(
                  'relative flex flex-col items-center rounded-lg border-2 p-3 transition-all',
                  processMode === 'MANUAL'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                {processMode === 'MANUAL' && (
                  <div className="absolute top-1 right-1">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                )}
                <MousePointer className="text-muted-foreground mb-1 h-6 w-6" />
                <span className="text-xs font-medium">수동 배치</span>
                <span className="text-muted-foreground text-center text-[10px]">
                  다이얼로그 닫고 직접 좌석 선택
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 자동 배치 미리보기 */}
        {selectedMember && processMode === 'AUTO_PLACE' && (
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">자동 배치 미리보기</h4>
            <div className="bg-muted/30 rounded-lg p-3">
              {autoPlacePreview ? (
                <EmergencyChangePreview preview={autoPlacePreview} modeLabel="자동 배치" compact />
              ) : (
                <div className="text-sm text-amber-600">
                  배치할 수 있는 빈 좌석이 없습니다. 수동 배치를 선택하세요.
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedMemberId(null);
              setSearchTerm('');
            }}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              !selectedMember || isLoading || (processMode === 'AUTO_PLACE' && !autoPlacePreview)
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? '처리 중...' : '추가하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default EmergencyAvailableDialog;
