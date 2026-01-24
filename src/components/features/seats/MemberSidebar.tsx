'use client';

import { useMemo, useState, useCallback, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Search, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAttendances } from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';
import { useArrangementStore } from '@/store/arrangement-store';
import ClickableMember from './ClickableMember';
import EmergencyAvailableDialog from './EmergencyAvailableDialog';
import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

interface MemberSidebarProps {
    date: string;
    hidePlaced?: boolean;
    compact?: boolean;
    /** 긴급 수정 모드 (SHARED 상태에서 대원 추가 배치 허용) */
    isEmergencyMode?: boolean;
    /** 배치표 ID (긴급 추가 다이얼로그용) */
    arrangementId?: string;
}

const PARTS: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

// 배치된 멤버 ID 배열을 반환하는 selector (stable reference를 위해 useShallow 사용)
const selectPlacedMemberIdsArray = (state: { assignments: Record<string, { memberId: string }> }) => {
    return Object.values(state.assignments).map(a => a.memberId);
};

// 경계 밖 멤버 정보를 위한 타입
interface OutOfBoundsMember {
    memberId: string;
    name: string;
    part: Part;
    row: number;
    col: number;
}

const MemberSidebar = memo(function MemberSidebar({ date, hidePlaced = false, compact = false, isEmergencyMode = false, arrangementId }: MemberSidebarProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPart, setSelectedPart] = useState<Part | 'ALL'>('ALL');
    const [emergencyAvailableDialogOpen, setEmergencyAvailableDialogOpen] = useState(false);

    // 선택적 상태 구독 - 배치된 멤버 ID 배열 추적 (useShallow로 shallow 비교)
    const placedMemberIdsArray = useArrangementStore(useShallow(selectPlacedMemberIdsArray));

    // 그리드 레이아웃과 assignments 구독 (경계 밖 멤버 계산용)
    const gridLayout = useArrangementStore(state => state.gridLayout);
    const assignments = useArrangementStore(state => state.assignments);
    const selectMemberFromSidebar = useArrangementStore(state => state.selectMemberFromSidebar);
    const selectedMemberId = useArrangementStore(state => state.selectedMemberId);
    const selectedSource = useArrangementStore(state => state.selectedSource);

    // 배열을 Set으로 변환 (O(1) 조회를 위해)
    const placedMemberIds = useMemo(
        () => new Set(placedMemberIdsArray),
        [placedMemberIdsArray]
    );

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

    // 해당 날짜의 출석 데이터 조회 (필터 없이 전체)
    // ⭐ 긴급 모드에서는 탭 포커스 시 자동 갱신 (출석 관리에서 변경 후 돌아올 때)
    const { data: attendances, isLoading: attendancesLoading } = useAttendances({
        date,
        refetchOnWindowFocus: isEmergencyMode,
    });

    const isLoading = membersLoading || attendancesLoading;

    // Check if member is already placed (Set 기반으로 O(1) 조회)
    const isMemberPlaced = useCallback((memberId: string) => {
        return placedMemberIds.has(memberId);
    }, [placedMemberIds]);

    // 출석 데이터를 memberId로 빠르게 조회하기 위한 Map
    const attendanceMap = useMemo(() => {
        const map = new Map<string, NonNullable<typeof attendances>[number]>();
        attendances?.forEach((a) => {
            map.set(a.member_id, a);
        });
        return map;
    }, [attendances]);

    // 멤버가 등단 가능한지 확인 (출석 레코드가 없거나 is_service_available이 true인 경우)
    const isServiceAvailable = useCallback((memberId: string) => {
        const attendance = attendanceMap.get(memberId);
        // 출석 레코드가 없으면 기본값 true (등단 가능)
        if (!attendance) return true;
        // 출석 레코드가 있으면 is_service_available 값 사용
        return attendance.is_service_available === true;
    }, [attendanceMap]);

    // 멤버 리스트 (정대원만)
    const members = membersData?.data || [];

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

        return groups;
    }, [members, isServiceAvailable, searchTerm, hidePlaced, isMemberPlaced, date]);

    // Calculate unplaced members count (기존 미배치 + 경계 밖 멤버)
    const unplacedCount = useMemo(() => {
        if (!members.length) return outOfBoundsMembers.length;

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

        // 경계 밖 멤버는 assignments에 아직 있으므로 isMemberPlaced가 true
        // 따라서 별도로 경계 밖 멤버 수를 더해줌
        return baseUnplaced + outOfBoundsMembers.length;
    }, [members, isServiceAvailable, searchTerm, isMemberPlaced, date, outOfBoundsMembers.length]);

    if (isLoading) {
        return (
            <div className="w-full sm:w-80 border-r border-[var(--color-border-default)] bg-[var(--color-surface)] p-4 flex justify-center items-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="w-full sm:w-80 border-r sm:border-r-0 border-[var(--color-border-default)] bg-[var(--color-surface)] flex flex-col h-full">
            <div className={`border-b border-[var(--color-border-default)] ${compact ? 'p-2' : 'p-3 sm:p-4'}`}>
                {!compact && (
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="font-bold text-base sm:text-lg text-[var(--color-text-primary)]">대원 목록</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                                미배치: <span className="font-semibold text-[var(--color-primary-600)]">{unplacedCount}</span>명
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
                        <Input
                            placeholder="이름 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`pl-9 ${compact ? 'h-9 text-sm' : 'h-11 text-base'}`}
                        />
                    </div>
                    {compact && (
                        <div className="flex items-center justify-center px-2 bg-primary-50 rounded-md text-xs font-medium text-primary-700 whitespace-nowrap">
                            {unplacedCount}명 남음
                        </div>
                    )}
                </div>

                {/* Part Filter Buttons */}
                <div className={`flex flex-wrap gap-2 ${compact ? 'mt-2' : 'mt-3 sm:mt-4'}`}>
                    <button
                        onClick={() => setSelectedPart('ALL')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${selectedPart === 'ALL'
                            ? 'bg-[var(--color-primary-600)] text-white'
                            : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'
                            }`}
                    >
                        전체
                    </button>
                    {PARTS.map((part) => {
                        const count = (groupedMembers[part] || []).length;
                        // In compact mode with hidePlaced, if count is 0, we might still want to show the button if there are placed members? 
                        // No, groupedMembers is already filtered. So if 0, no unplaced members in this part.
                        if (count === 0) return null;
                        return (
                            <button
                                key={part}
                                onClick={() => setSelectedPart(part)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${selectedPart === part
                                    ? 'bg-[var(--color-primary-600)] text-white'
                                    : 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'
                                    }`}
                            >
                                {part === 'SPECIAL' ? 'Sp' : part.charAt(0)} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${compact ? 'p-2 space-y-2' : 'p-3 sm:p-4 space-y-3 sm:space-y-4'}`}>
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
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-0"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
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
                        onComplete={(message) => alert(message)}
                        onError={(message) => alert(`오류: ${message}`)}
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
                                    const isSelected = selectedMemberId === member.memberId && selectedSource === 'sidebar';
                                    // Part color mapping
                                    const getPartColor = (p: Part) => {
                                        switch (p) {
                                            case 'SOPRANO': return 'bg-[var(--color-part-soprano-600)] text-white';
                                            case 'ALTO': return 'bg-[var(--color-part-alto-500)] text-white';
                                            case 'TENOR': return 'bg-[var(--color-part-tenor-600)] text-white';
                                            case 'BASS': return 'bg-[var(--color-part-bass-600)] text-white';
                                            default: return 'bg-[var(--color-part-special-500)] text-white';
                                        }
                                    };

                                    return (
                                        <button
                                            key={member.memberId}
                                            type="button"
                                            onClick={() => selectMemberFromSidebar(member.memberId, member.name, member.part)}
                                            className={`
                                            flex items-center gap-1.5 px-2 py-1 rounded-md text-xs
                                            transition-all duration-200 touch-manipulation
                                            ${isSelected
                                                    ? 'bg-red-200 dark:bg-red-800 border-2 border-red-500 ring-2 ring-red-300'
                                                    : 'bg-white dark:bg-red-900/50 border border-red-300 dark:border-red-700 hover:border-red-400 hover:shadow-sm'
                                                }
                                        `}
                                            title={`원래 위치: ${member.row}행 ${member.col}열`}
                                        >
                                            <span className="font-medium text-red-800 dark:text-red-200">
                                                {member.name}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] px-1 py-0 ${getPartColor(member.part)} w-4 h-4 flex items-center justify-center rounded-full p-0`}
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

                {PARTS.map((part) => {
                    // Filter by selected part
                    if (selectedPart !== 'ALL' && part !== selectedPart) return null;

                    const partMembers = groupedMembers[part] || [];
                    if (partMembers.length === 0) return null;

                    return (
                        <div key={part} className="space-y-1">
                            {!compact && (
                                <div className="flex items-center justify-between py-1 font-medium text-xs text-[var(--color-text-tertiary)]">
                                    <span>{part}</span>
                                    <span>{partMembers.length}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-1">
                                {partMembers.map((member) => (
                                    <ClickableMember
                                        key={member.id}
                                        memberId={member.id}
                                        name={member.name}
                                        part={member.part}
                                        isPlaced={isMemberPlaced(member.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {(!members || members.length === 0) && (
                    <div className="text-center text-sm text-[var(--color-text-secondary)] mt-8">
                        등록된 대원이 없습니다.
                    </div>
                )}

                {members.length > 0 && Object.keys(groupedMembers).length === 0 && outOfBoundsMembers.length === 0 && (
                    <div className="text-center text-sm text-[var(--color-text-secondary)] mt-8">
                        모든 대원이 배치되었습니다.
                    </div>
                )}
            </div>
        </div>
    );
});

export default MemberSidebar;
