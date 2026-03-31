'use client';

import { AlertTriangle, ChevronDown, ChevronRight, Search, UserPlus, Users } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { memo, useCallback, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

import { useAttendances } from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';

import { showError, showSuccess } from '@/lib/toast';

import { useArrangementStore } from '@/store/arrangement-store';

import type { Database } from '@/types/database.types';

import ClickableMember from './ClickableMember';
import EmergencyAvailableDialog from './EmergencyAvailableDialog';
import GuestManageDialog from './GuestManageDialog';

type Part = Database['public']['Enums']['part'];

interface MemberSidebarProps {
  date: string;
  /** 예배별 출석 데이터 분리 조회용 */
  serviceScheduleId?: string;
  hidePlaced?: boolean;
  compact?: boolean;
  /** 긴급 수정 모드 (SHARED 상태에서 대원 추가 배치 허용) */
  isEmergencyMode?: boolean;
  /** 배치표 ID (긴급 추가 다이얼로그용) */
  arrangementId?: string;
}

const PARTS: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

// 배치된 멤버 ID 배열을 반환하는 selector (stable reference를 위해 useShallow 사용)
const selectPlacedMemberIdsArray = (state: {
  assignments: Record<string, { memberId: string }>;
}) => {
  return Object.values(state.assignments).map((a) => a.memberId);
};

// 경계 밖 멤버 정보를 위한 타입
interface OutOfBoundsMember {
  memberId: string;
  name: string;
  part: Part;
  row: number;
  col: number;
}

const MemberSidebar = memo(function MemberSidebar({
  date,
  serviceScheduleId,
  hidePlaced = false,
  compact = false,
  isEmergencyMode = false,
  arrangementId,
}: MemberSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState<Part | 'ALL'>('ALL');
  const [emergencyAvailableDialogOpen, setEmergencyAvailableDialogOpen] = useState(false);
  const [guestManageDialogOpen, setGuestManageDialogOpen] = useState(false);

  // 선택적 상태 구독 - 배치된 멤버 ID 배열 추적 (useShallow로 shallow 비교)
  const placedMemberIdsArray = useArrangementStore(useShallow(selectPlacedMemberIdsArray));

  // 그리드 레이아웃과 assignments 구독 (경계 밖 멤버 계산용)
  const gridLayout = useArrangementStore((state) => state.gridLayout);
  const assignments = useArrangementStore((state) => state.assignments);
  const selectMemberFromSidebar = useArrangementStore((state) => state.selectMemberFromSidebar);
  const selectedMemberId = useArrangementStore((state) => state.selectedMemberId);
  const selectedSource = useArrangementStore((state) => state.selectedSource);

  // 배열을 Set으로 변환 (O(1) 조회를 위해)
  const placedMemberIds = useMemo(() => new Set(placedMemberIdsArray), [placedMemberIdsArray]);

  // 경계 밖 멤버 계산 (그리드 크기 변경으로 좌석을 잃은 대원)
  const outOfBoundsMembers = useMemo((): OutOfBoundsMember[] => {
    if (!gridLayout) return [];

    const { rowCapacities } = gridLayout;
    const outOfBounds: OutOfBoundsMember[] = [];

    Object.values(assignments).forEach((assignment) => {
      const { memberId, memberName, part, row, col } = assignment;
      const rowIndex = row - 1; // 0-based index

      // 경계 밖 판정:
      // 1. 행 인덱스가 음수이거나 rowCapacities 범위 밖
      // 2. 열이 해당 행의 최대 열을 초과
      const isRowOutOfBounds = rowIndex < 0 || rowIndex >= rowCapacities.length;
      const maxColInRow = isRowOutOfBounds ? 0 : rowCapacities[rowIndex];
      const isColOutOfBounds = col > maxColInRow;

      if (isRowOutOfBounds || isColOutOfBounds) {
        outOfBounds.push({
          memberId,
          name: memberName,
          part,
          row,
          col,
        });
      }
    });

    return outOfBounds;
  }, [gridLayout, assignments]);

  // 모든 정대원 조회 (등단자만 - 지휘자/반주자 제외, API limit 최대값: 100)
  const { data: membersData, isLoading: membersLoading } = useMembers({
    member_status: 'REGULAR',
    is_singer: true, // 등단자만 (지휘자/반주자 제외)
    limit: 100,
  });

  // 게스트 멤버 전체 조회 (매핑 없이 GUEST 상태 멤버를 모든 배치표에서 표시)
  const { data: guestMembersData, isLoading: guestsLoading } = useMembers({
    member_status: 'GUEST',
    is_singer: true,
    limit: 100,
  });

  // 해당 날짜+예배의 출석 데이터 조회 (service_schedule_id로 예배별 분리)
  // ⭐ 긴급 모드에서는 탭 포커스 시 자동 갱신 (출석 관리에서 변경 후 돌아올 때)
  const { data: attendances, isLoading: attendancesLoading } = useAttendances({
    date,
    service_schedule_id: serviceScheduleId,
    refetchOnWindowFocus: isEmergencyMode,
  });

  const isLoading = membersLoading || attendancesLoading || guestsLoading;

  // Check if member is already placed (Set 기반으로 O(1) 조회)
  const isMemberPlaced = useCallback(
    (memberId: string) => {
      return placedMemberIds.has(memberId);
    },
    [placedMemberIds]
  );

  // 게스트 멤버 리스트
  const guestMembers = useMemo(() => {
    const guests = guestMembersData?.data || [];
    return guests.map((g) => ({
      id: g.id,
      name: g.name,
      part: g.part,
      isGuest: true as const,
    }));
  }, [guestMembersData?.data]);

  const groupedGuests = useMemo(() => {
    if (!guestMembers.length) return {};
    const groups: Record<string, typeof guestMembers> = {};
    guestMembers.forEach((guest) => {
      if (searchTerm && !guest.name.includes(searchTerm)) return;
      if (hidePlaced && isMemberPlaced(guest.id)) return;
      if (!groups[guest.part]) groups[guest.part] = [];
      groups[guest.part].push(guest);
    });
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    });
    return groups;
  }, [guestMembers, searchTerm, hidePlaced, isMemberPlaced]);

  // 출석 데이터를 memberId로 빠르게 조회하기 위한 Map
  const attendanceMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof attendances>[number]>();
    attendances?.forEach((a) => {
      map.set(a.member_id, a);
    });
    return map;
  }, [attendances]);

  // 멤버가 등단 가능한지 확인
  // 출석 레코드가 없으면 등단 가능 (파트장이 등단 불가 멤버만 DB에 기록하는 워크플로우)
  const isServiceAvailable = useCallback(
    (memberId: string) => {
      const attendance = attendanceMap.get(memberId);
      if (!attendance) return true;
      return attendance.is_service_available === true;
    },
    [attendanceMap]
  );

  // 멤버 리스트 (정대원만)
  const members = useMemo(() => membersData?.data || [], [membersData?.data]);

  // Group members by part
  const groupedMembers = useMemo(() => {
    if (!members.length) return {};

    const groups: Record<string, typeof members> = {};

    members.forEach((member) => {
      // 정대원 임명일 기준 필터링 (배치표 날짜 이전에 임명된 대원만 표시)
      if (member.joined_date && member.joined_date > date) return;

      // 등단 불가능한 멤버 제외
      if (!isServiceAvailable(member.id)) return;

      // Filter by search term
      if (searchTerm && !member.name.includes(searchTerm)) return;

      // Filter placed members if hidePlaced is true
      if (hidePlaced && isMemberPlaced(member.id)) return;

      if (!groups[member.part]) {
        groups[member.part] = [];
      }
      groups[member.part].push(member);
    });

    // 파트별 가나다순 정렬
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    });

    return groups;
  }, [members, isServiceAvailable, searchTerm, hidePlaced, isMemberPlaced, date]);

  // Calculate unplaced members count (기존 미배치 + 경계 밖 멤버 + 게스트)
  const unplacedCount = useMemo(() => {
    // 기존 미배치 멤버 수 계산
    const baseUnplaced = members.filter((member) => {
      // 정대원 임명일 기준 필터링
      if (member.joined_date && member.joined_date > date) return false;
      // 등단 불가능한 멤버 제외
      if (!isServiceAvailable(member.id)) return false;
      // Filter by search term
      if (searchTerm && !member.name.includes(searchTerm)) return false;
      return !isMemberPlaced(member.id);
    }).length;

    // 미배치 게스트 수
    const unplacedGuests = guestMembers.filter((g) => {
      if (searchTerm && !g.name.includes(searchTerm)) return false;
      return !isMemberPlaced(g.id);
    }).length;

    // 경계 밖 멤버는 assignments에 아직 있으므로 isMemberPlaced가 true
    // 따라서 별도로 경계 밖 멤버 수를 더해줌
    return baseUnplaced + unplacedGuests + outOfBoundsMembers.length;
  }, [members, guestMembers, isServiceAvailable, searchTerm, isMemberPlaced, date, outOfBoundsMembers.length]);

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center border-r border-[var(--color-border-default)] bg-[var(--color-surface)] p-4 sm:w-80">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface)] sm:w-80 sm:border-r-0">
      <div
        className={`border-b border-[var(--color-border-default)] ${compact ? 'p-2' : 'p-3 sm:p-4'}`}
      >
        {!compact && (
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h3 className="text-base font-bold text-[var(--color-text-primary)] sm:text-lg">
              대원 목록
            </h3>
            <div className="flex items-center gap-2">
              {arrangementId && (
                <button
                  type="button"
                  onClick={() => setGuestManageDialogOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                  title="게스트 관리"
                >
                  <Users className="h-3 w-3" />
                  게스트
                  {guestMembers.length > 0 && (
                    <span className="font-medium text-[var(--color-primary-600)]">
                      {guestMembers.length}
                    </span>
                  )}
                </button>
              )}
              <span className="text-xs text-[var(--color-text-secondary)] sm:text-sm">
                미배치:{' '}
                <span className="font-semibold text-[var(--color-primary-600)]">
                  {unplacedCount}
                </span>
                명
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <Input
              placeholder="이름 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 ${compact ? 'h-9 text-sm' : 'h-11 text-base'}`}
            />
          </div>
          {compact && (
            <div className="bg-primary-50 text-primary-700 flex items-center justify-center rounded-md px-2 text-xs font-medium whitespace-nowrap">
              {unplacedCount}명 남음
            </div>
          )}
        </div>

      </div>

      <div
        className={`flex-1 overflow-y-auto ${compact ? 'space-y-2 p-2' : 'space-y-3 p-3 sm:space-y-4 sm:p-4'}`}
      >
        {/* 긴급 인원 추가 패널 (SHARED 상태에서만 표시) */}
        {isEmergencyMode && arrangementId && !compact && (
          <Alert variant="success" icon={UserPlus} className="mb-4">
            <AlertTitle>긴급 인원 추가</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">당일 등단 가능해진 인원을 배치표에 추가합니다</p>
              <Button
                size="sm"
                variant="success"
                onClick={() => setEmergencyAvailableDialogOpen(true)}
                className="w-full border-0 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                인원 추가하기
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* 긴급 등단 가능 추가 다이얼로그 */}
        {arrangementId && (
          <EmergencyAvailableDialog
            open={emergencyAvailableDialogOpen}
            onOpenChange={setEmergencyAvailableDialogOpen}
            arrangementId={arrangementId}
            date={date}
            onComplete={(message) => showSuccess(message)}
            onError={(message) => showError(`오류: ${message}`)}
          />
        )}

        {/* 게스트 관리 다이얼로그 */}
        {arrangementId && (
          <GuestManageDialog
            open={guestManageDialogOpen}
            onOpenChange={setGuestManageDialogOpen}
            arrangementId={arrangementId}
          />
        )}

        {/* 재배치 필요 섹션 (경계 밖 멤버가 있을 때만 표시) */}
        {outOfBoundsMembers.length > 0 && (
          <Alert variant="error" icon={AlertTriangle} className="mb-4">
            <AlertTitle>재배치 필요 ({outOfBoundsMembers.length}명)</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">줄 구성 변경으로 좌석을 잃은 대원입니다</p>
              <div className="flex flex-wrap gap-1.5">
                {outOfBoundsMembers.map((member) => {
                  const isSelected =
                    selectedMemberId === member.memberId && selectedSource === 'sidebar';
                  // Part color mapping
                  const getPartColor = (p: Part) => {
                    switch (p) {
                      case 'SOPRANO':
                        return 'bg-[var(--color-part-soprano-600)] text-white';
                      case 'ALTO':
                        return 'bg-[var(--color-part-alto-500)] text-white';
                      case 'TENOR':
                        return 'bg-[var(--color-part-tenor-600)] text-white';
                      case 'BASS':
                        return 'bg-[var(--color-part-bass-600)] text-white';
                      default:
                        return 'bg-[var(--color-part-special-500)] text-white';
                    }
                  };

                  return (
                    <button
                      key={member.memberId}
                      type="button"
                      onClick={() =>
                        selectMemberFromSidebar(member.memberId, member.name, member.part)
                      }
                      className={`flex touch-manipulation items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all duration-200 ${
                        isSelected
                          ? 'border-2 border-red-500 bg-red-200 ring-2 ring-red-300 dark:bg-red-800'
                          : 'border border-red-300 bg-white hover:border-red-400 hover:shadow-sm dark:border-red-700 dark:bg-red-900/50'
                      } `}
                      title={`원래 위치: ${member.row}행 ${member.col}열`}
                    >
                      <span className="font-medium text-red-800 dark:text-red-200">
                        {member.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`px-1 py-0 text-[9px] ${getPartColor(member.part)} flex h-4 w-4 items-center justify-center rounded-full p-0`}
                      >
                        {member.part === 'SPECIAL' ? 'Sp' : member.part.charAt(0)}
                      </Badge>
                      <span className="text-[10px] text-red-500 dark:text-red-400">
                        ({member.row}-{member.col})
                      </span>
                    </button>
                  );
                })}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 파트별 칩 리스트 (헤더 클릭으로 필터 토글) — 정대원 + 게스트 통합 표시 */}
        {PARTS.map((part) => {
          const partMembers = groupedMembers[part] || [];
          const partGuests = groupedGuests[part] || [];
          const totalCount = partMembers.length + partGuests.length;
          if (!totalCount) return null;

          const isExpanded = selectedPart === 'ALL' || selectedPart === part;
          const isActive = selectedPart === part;
          const partLabel = part === 'SPECIAL' ? 'Sp' : part;

          return (
            <div key={part}>
              <button
                type="button"
                onClick={() => setSelectedPart(selectedPart === part ? 'ALL' : part)}
                className={`mb-1.5 flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'
                    : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)]'
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                {partLabel} ({totalCount})
              </button>
              {isExpanded && (
                <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
                  {partMembers.map((m) => (
                    <ClickableMember
                      key={m.id}
                      memberId={m.id}
                      name={m.name}
                      part={m.part}
                      isPlaced={isMemberPlaced(m.id)}
                    />
                  ))}
                  {partGuests.map((g) => (
                    <ClickableMember
                      key={g.id}
                      memberId={g.id}
                      name={g.name}
                      part={g.part}
                      isPlaced={isMemberPlaced(g.id)}
                      isGuest
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {(!members || members.length === 0) && guestMembers.length === 0 && (
          <div className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
            등록된 대원이 없습니다.
          </div>
        )}

        {members.length > 0 &&
          Object.keys(groupedMembers).length === 0 &&
          Object.keys(groupedGuests).length === 0 &&
          outOfBoundsMembers.length === 0 && (
            <div className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
              모든 대원이 배치되었습니다.
            </div>
          )}
      </div>
    </div>
  );
});

export default MemberSidebar;
