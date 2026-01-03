'use client';
'use memo';

import { useMemo, useState, useCallback, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAttendances } from '@/hooks/useAttendances';
import { useMembers } from '@/hooks/useMembers';
import { useArrangementStore } from '@/store/arrangement-store';
import ClickableMember from './ClickableMember';
import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

interface MemberSidebarProps {
    date: string;
    hidePlaced?: boolean;
    compact?: boolean;
}

const PARTS: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

// 배치된 멤버 ID 배열을 반환하는 selector (stable reference를 위해 useShallow 사용)
const selectPlacedMemberIdsArray = (state: { assignments: Record<string, { memberId: string }> }) => {
    return Object.values(state.assignments).map(a => a.memberId);
};

const MemberSidebar = memo(function MemberSidebar({ date, hidePlaced = false, compact = false }: MemberSidebarProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPart, setSelectedPart] = useState<Part | 'ALL'>('ALL');

    // 선택적 상태 구독 - 배치된 멤버 ID 배열 추적 (useShallow로 shallow 비교)
    const placedMemberIdsArray = useArrangementStore(useShallow(selectPlacedMemberIdsArray));

    // 배열을 Set으로 변환 (O(1) 조회를 위해)
    const placedMemberIds = useMemo(
        () => new Set(placedMemberIdsArray),
        [placedMemberIdsArray]
    );

    // 모든 정대원 조회 (API limit 최대값: 100)
    const { data: membersData, isLoading: membersLoading } = useMembers({
        member_status: 'REGULAR',
        limit: 100,
    });

    // 해당 날짜의 출석 데이터 조회 (필터 없이 전체)
    const { data: attendances, isLoading: attendancesLoading } = useAttendances({
        date,
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
    }, [members, isServiceAvailable, searchTerm, hidePlaced, isMemberPlaced]);

    // Calculate unplaced members count
    const unplacedCount = useMemo(() => {
        if (!members.length) return 0;
        return members.filter((member) => {
            // 등단 불가능한 멤버 제외
            if (!isServiceAvailable(member.id)) return false;
            // Filter by search term
            if (searchTerm && !member.name.includes(searchTerm)) return false;
            return !isMemberPlaced(member.id);
        }).length;
    }, [members, isServiceAvailable, searchTerm, isMemberPlaced]);

    if (isLoading) {
        return (
            <div className="w-full lg:w-80 border-r border-[var(--color-border-default)] bg-[var(--color-surface)] p-4 flex justify-center items-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="w-full lg:w-80 border-r lg:border-r-0 border-[var(--color-border-default)] bg-[var(--color-surface)] flex flex-col h-full">
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

                {members.length > 0 && Object.keys(groupedMembers).length === 0 && (
                    <div className="text-center text-sm text-[var(--color-text-secondary)] mt-8">
                        모든 대원이 배치되었습니다.
                    </div>
                )}
            </div>
        </div>
    );
});

export default MemberSidebar;
