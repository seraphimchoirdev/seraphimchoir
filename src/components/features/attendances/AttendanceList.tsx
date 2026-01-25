'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'AttendanceList' });
import { useMembers } from '@/hooks/useMembers';
import { useAttendances } from '@/hooks/useAttendances';
import { useAttendanceDeadlines, isPartClosed } from '@/hooks/useAttendanceDeadlines';
import { useArrangements } from '@/hooks/useArrangements';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns/format';
import { ko } from 'date-fns/locale/ko';
import { Save, RotateCcw, ChevronsDown, ChevronsUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Database } from '@/types/database.types';
import { Part } from '@/types';

import MemberChip from './MemberChip';
import AttendanceSummary from './AttendanceSummary';
import AttendanceFilters from './AttendanceFilters';
import DeadlineStatusBar from './DeadlineStatusBar';
import { cn, getPartLabel, isTestAccount, getTestAccountPart } from '@/lib/utils';
import { ChevronDown, ChevronRight, CheckCheck, XCircle, Lock } from 'lucide-react';

interface AttendanceListProps {
    date: Date;
}

// Supabase Database 타입 사용
type Attendance = Database['public']['Tables']['attendances']['Row'];

const PARTS: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

// 파트별 그라데이션 배경색 (악보 스티커 색상 기준 - 자리배치와 통일)
const partGradients: Record<Part, string> = {
    SOPRANO: 'from-[var(--color-part-soprano-50)] to-[var(--color-part-soprano-100)]/50',
    ALTO: 'from-[var(--color-part-alto-50)] to-[var(--color-part-alto-100)]/50',
    TENOR: 'from-[var(--color-part-tenor-50)] to-[var(--color-part-tenor-100)]/50',
    BASS: 'from-[var(--color-part-bass-50)] to-[var(--color-part-bass-100)]/50',
    SPECIAL: 'from-[var(--color-part-special-50)] to-[var(--color-part-special-100)]/50',
};

const partAccentColors: Record<Part, string> = {
    SOPRANO: 'text-[var(--color-part-soprano-700)]',
    ALTO: 'text-[var(--color-part-alto-700)]',
    TENOR: 'text-[var(--color-part-tenor-700)]',
    BASS: 'text-[var(--color-part-bass-700)]',
    SPECIAL: 'text-[var(--color-part-special-700)]',
};

export default function AttendanceList({ date }: AttendanceListProps) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { profile, user } = useAuth();
    const [userPart, setUserPart] = useState<string | null>(null);
    const [isPartLoading, setIsPartLoading] = useState(false);
    const queryClient = useQueryClient();

    // 파트장인 경우 본인 파트 확인
    useEffect(() => {
        async function fetchUserPart() {
            if (profile?.role === 'PART_LEADER' && user?.email) {
                setIsPartLoading(true);

                // 테스트 계정인 경우 이메일에서 파트 추출
                if (isTestAccount(user.email)) {
                    const testPart = getTestAccountPart(user.email);
                    if (testPart) setUserPart(testPart);
                    setIsPartLoading(false);
                    return;
                }

                // 실제 계정인 경우 user_profiles.linked_member_id를 통해 연결된 멤버의 파트 조회
                const supabase = createClient();
                const { data: profileData } = await supabase
                    .from('user_profiles')
                    .select('linked_member_id, members:linked_member_id(part)')
                    .eq('id', user.id)
                    .single();

                // Supabase JOIN 결과는 단일 객체 또는 배열일 수 있음
                const membersResult = profileData?.members;
                let partValue: string | null = null;

                if (Array.isArray(membersResult) && membersResult.length > 0) {
                    partValue = (membersResult[0] as { part: string })?.part ?? null;
                } else if (membersResult && typeof membersResult === 'object' && 'part' in membersResult) {
                    partValue = (membersResult as { part: string }).part;
                }

                if (partValue) {
                    setUserPart(partValue);
                }
                setIsPartLoading(false);
            }
        }
        fetchUserPart();
    }, [profile, user]);

    const { data: membersData, isLoading: membersLoading } = useMembers({
        member_status: 'REGULAR',
        is_singer: true, // 등단자만 (지휘자/반주자 제외)
        limit: 100,
        sortBy: 'name',   // 가나다순 정렬 (중장년층 UX 개선)
        sortOrder: 'asc',
    });

    const { data: attendances, isLoading: attendancesLoading } = useAttendances({
        date: dateStr,
    });

    // 마감 상태 조회
    const {
        data: deadlines,
        isLoading: deadlinesLoading,
        refetch: refetchDeadlines,
    } = useAttendanceDeadlines(dateStr);

    // 해당 날짜의 자리배치표 존재 여부 확인
    const { data: arrangementsData } = useArrangements({
        startDate: dateStr,
        endDate: dateStr,
        limit: 1,
    });
    const hasArrangement = (arrangementsData?.data?.length ?? 0) > 0;

    // 전체 마감 여부 (수정 가능 여부에 사용)
    const isFullyClosed = deadlines?.isFullyClosed ?? false;
    const canEditAfterClose = ['ADMIN', 'CONDUCTOR'].includes(profile?.role || '');
    // 자리배치표가 생성된 경우에도 ADMIN/CONDUCTOR만 수정 가능
    const isLockedByArrangement = hasArrangement && !canEditAfterClose;

    // 마감된 파트 목록 계산
    const closedParts = useMemo(() => {
        if (!deadlines?.partDeadlines) return new Set<Part>();
        return new Set(
            (Object.entries(deadlines.partDeadlines) as [Part, unknown][])
                .filter(([, deadline]) => deadline !== null)
                .map(([part]) => part)
        );
    }, [deadlines]);

    const [activeTab, setActiveTab] = useState<'service' | 'practice'>('service');
    const [showAbsentOnly, setShowAbsentOnly] = useState(false);

    // 변경사항 추적 상태
    const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<Attendance>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 파트별 열림/닫힘 상태
    const [openParts, setOpenParts] = useState<Record<Part, boolean>>({
        SOPRANO: true,
        ALTO: true,
        TENOR: true,
        BASS: true,
        SPECIAL: true,
    });

    const isLoading = membersLoading || attendancesLoading || deadlinesLoading || (profile?.role === 'PART_LEADER' && isPartLoading);

    const members = membersData?.data || [];

    // 파트별로 멤버 그룹화
    const membersByPart = useMemo(() => {
        return members.reduce((acc, member) => {
            if (profile?.role === 'PART_LEADER' && userPart && member.part !== userPart) {
                return acc;
            }
            const part = member.part;
            if (!acc[part]) {
                acc[part] = [];
            }
            acc[part].push(member);
            return acc;
        }, {} as Record<string, typeof members>);
    }, [members, profile?.role, userPart]);

    // 현재 탭의 필드명
    const currentField = activeTab === 'service' ? 'is_service_available' : 'is_practice_attended';

    // 멤버의 출석 상태 계산
    const getMemberAttendingStatus = useCallback((memberId: string): boolean => {
        const pending = pendingChanges[memberId];
        const attendance = attendances?.find(a => a.member_id === memberId);
        const dbValue = attendance?.[currentField] ?? true;
        const pendingValue = pending?.[currentField];
        return pendingValue !== undefined ? pendingValue : dbValue;
    }, [pendingChanges, attendances, currentField]);

    // 파트별 통계 계산
    const partStats = useMemo(() => {
        return PARTS.map(part => {
            const partMembers = membersByPart[part] || [];
            const attendingCount = partMembers.filter(member =>
                getMemberAttendingStatus(member.id)
            ).length;

            return {
                part,
                total: partMembers.length,
                attending: attendingCount,
            };
        }).filter(stat => stat.total > 0);
    }, [membersByPart, getMemberAttendingStatus]);

    // 전체 통계
    const totalStats = useMemo(() => {
        const total = partStats.reduce((sum, s) => sum + s.total, 0);
        const attending = partStats.reduce((sum, s) => sum + s.attending, 0);
        return { total, attending };
    }, [partStats]);

    const absentCount = totalStats.total - totalStats.attending;

    // 스마트 기본값: 불참자 있는 파트만 자동 열림
    useEffect(() => {
        if (isLoading) return;

        const newOpenParts: Record<Part, boolean> = {} as Record<Part, boolean>;
        PARTS.forEach(part => {
            const partMembers = membersByPart[part] || [];
            const hasAbsent = partMembers.some(m => !getMemberAttendingStatus(m.id));
            newOpenParts[part] = hasAbsent;
        });
        setOpenParts(newOpenParts);
    }, [isLoading, membersByPart, attendances]);

    // 필터링된 멤버
    const filteredMembersByPart = useMemo(() => {
        if (!showAbsentOnly) return membersByPart;

        return Object.fromEntries(
            Object.entries(membersByPart).map(([part, partMembers]) => [
                part,
                partMembers.filter(member => !getMemberAttendingStatus(member.id))
            ])
        );
    }, [membersByPart, getMemberAttendingStatus, showAbsentOnly]);

    // 출석 상태 변경 핸들러
    const handleToggle = useCallback((memberId: string) => {
        const currentValue = getMemberAttendingStatus(memberId);
        setPendingChanges(prev => {
            const memberChanges = prev[memberId] || {};
            return {
                ...prev,
                [memberId]: {
                    ...memberChanges,
                    [currentField]: !currentValue
                }
            };
        });
    }, [getMemberAttendingStatus, currentField]);

    // 파트 전체 선택/해제 핸들러
    const handleSelectAllPart = useCallback((part: string, value: boolean) => {
        const partMembers = membersByPart[part] || [];

        setPendingChanges(prev => {
            const updates = { ...prev };
            partMembers.forEach(member => {
                updates[member.id] = {
                    ...(updates[member.id] || {}),
                    [currentField]: value,
                };
            });
            return updates;
        });
    }, [membersByPart, currentField]);

    // 파트 토글 핸들러
    const handlePartToggle = useCallback((part: Part) => {
        setOpenParts(prev => ({ ...prev, [part]: !prev[part] }));
    }, []);

    // 전체 펼치기/접기
    const handleExpandAll = useCallback(() => {
        setOpenParts(Object.fromEntries(PARTS.map(p => [p, true])) as Record<Part, boolean>);
    }, []);

    const handleCollapseAll = useCallback(() => {
        setOpenParts(Object.fromEntries(PARTS.map(p => [p, false])) as Record<Part, boolean>);
    }, []);

    // 변경사항 저장
    const handleSubmit = async () => {
        if (Object.keys(pendingChanges).length === 0) return;

        // 마감된 파트의 변경사항 필터링 (ADMIN/CONDUCTOR는 제외)
        const changesToSubmit = canEditAfterClose
            ? pendingChanges
            : Object.fromEntries(
                Object.entries(pendingChanges).filter(([memberId]) => {
                    const member = members?.find(m => m.id === memberId);
                    return member && !closedParts.has(member.part as Part);
                })
            );

        if (Object.keys(changesToSubmit).length === 0) {
            alert('저장할 변경사항이 없습니다. (마감된 파트의 변경사항은 저장할 수 없습니다)');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = Object.entries(changesToSubmit).map(([memberId, changes]) => {
                const existing = attendances?.find(a => a.member_id === memberId);

                const is_service_available = changes.is_service_available ??
                    (existing?.is_service_available ?? true);

                const is_practice_attended = changes.is_practice_attended ??
                    (existing?.is_practice_attended ?? true);

                return {
                    member_id: memberId,
                    date: dateStr,
                    is_service_available,
                    is_practice_attended,
                };
            });

            const res = await fetch('/api/attendances/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendances: payload }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to save attendances');
            }

            // 마감된 파트의 변경사항은 초기화되지 않고 남아있음을 알림
            const skippedCount = Object.keys(pendingChanges).length - Object.keys(changesToSubmit).length;
            setPendingChanges({});
            queryClient.invalidateQueries({ queryKey: ['attendances'] });

            if (skippedCount > 0) {
                alert(`저장 완료! (마감된 파트의 ${skippedCount}건은 저장되지 않았습니다)`);
            } else {
                alert('저장되었습니다.');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            logger.error('Failed to save attendances:', error);
            alert(`저장 실패: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        if (confirm('변경사항을 모두 취소하시겠습니까?')) {
            setPendingChanges({});
        }
    };

    const hasChanges = Object.keys(pendingChanges).length > 0;

    // 변경사항 중 마감된 파트의 대원이 있는지 확인
    const closedPartChanges = useMemo(() => {
        if (canEditAfterClose) return []; // ADMIN/CONDUCTOR는 제한 없음
        return Object.keys(pendingChanges).filter(memberId => {
            const member = members?.find(m => m.id === memberId);
            return member && closedParts.has(member.part as Part);
        });
    }, [pendingChanges, members, closedParts, canEditAfterClose]);

    const hasClosedPartChanges = closedPartChanges.length > 0;
    const validChangesCount = Object.keys(pendingChanges).length - closedPartChanges.length;

    if (isLoading) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }

    return (
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex justify-between items-center sticky top-0 bg-[var(--color-background-primary)] z-10 py-4 border-b border-[var(--color-border-default)]">
                <h3 className="text-lg font-semibold">
                    {format(date, 'M월 d일 (E)', { locale: ko })} 출석 체크
                </h3>
            </div>

            {/* 마감 현황 바 */}
            <DeadlineStatusBar
                date={dateStr}
                deadlines={deadlines}
                isLoading={deadlinesLoading}
                userRole={profile?.role ?? undefined}
                userPart={userPart as Part | null}
                onRefetch={() => refetchDeadlines()}
            />

            {/* 요약 프로그레스 바 */}
            <AttendanceSummary
                totalCount={totalStats.total}
                attendingCount={totalStats.attending}
                partStats={partStats}
            />

            {/* 필터 + 펼치기/접기 버튼 */}
            <div className="flex flex-col gap-2">
                <AttendanceFilters
                    showAbsentOnly={showAbsentOnly}
                    onShowAbsentOnlyChange={setShowAbsentOnly}
                    absentCount={absentCount}
                />
                <div className="flex gap-1 justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExpandAll}
                        className="text-xs h-7 px-2 text-[var(--color-text-secondary)]"
                    >
                        <ChevronsDown className="w-4 h-4 mr-1" />
                        모두 펼치기
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCollapseAll}
                        className="text-xs h-7 px-2 text-[var(--color-text-secondary)]"
                    >
                        <ChevronsUp className="w-4 h-4 mr-1" />
                        모두 접기
                    </Button>
                </div>
            </div>

            {/* 탭 */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'service' | 'practice')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="service">예배 등단 (주중 파악)</TabsTrigger>
                    <TabsTrigger value="practice">예배 후 연습 (주일 당일)</TabsTrigger>
                </TabsList>

                {['service', 'practice'].map((tabValue) => (
                    <TabsContent key={tabValue} value={tabValue} className="space-y-3">
                        {PARTS.map((part) => {
                            const partMembers = filteredMembersByPart[part] || [];
                            const allPartMembers = membersByPart[part] || [];

                            if (allPartMembers.length === 0) return null;

                            const partAttendingCount = allPartMembers.filter(m =>
                                getMemberAttendingStatus(m.id)
                            ).length;
                            const partAbsentCount = allPartMembers.length - partAttendingCount;

                            const isExpanded = openParts[part];
                            // 파트별 마감 상태
                            const isPartClosed = closedParts.has(part);
                            const isPartEditable = canEditAfterClose || !isPartClosed;

                            return (
                                <div key={part} className="rounded-xl overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-background-primary)] shadow-sm">
                                    {/* 파트 헤더 */}
                                    <button
                                        type="button"
                                        onClick={() => handlePartToggle(part)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3",
                                            "bg-gradient-to-r transition-colors duration-200",
                                            partGradients[part],
                                            "hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-300)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronDown className={cn("w-5 h-5", partAccentColors[part])} />
                                            ) : (
                                                <ChevronRight className={cn("w-5 h-5", partAccentColors[part])} />
                                            )}
                                            <span className={cn("font-bold", partAccentColors[part])}>
                                                {getPartLabel(part)}
                                            </span>
                                            <span className="text-sm text-[var(--color-text-secondary)]">
                                                {partAttendingCount}/{allPartMembers.length}명
                                            </span>
                                            {/* 파트 마감 뱃지 */}
                                            {isPartClosed && !canEditAfterClose && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)] rounded">
                                                    <Lock className="w-3 h-3" />
                                                    마감
                                                </span>
                                            )}
                                        </div>

                                        {partAbsentCount > 0 ? (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-error-100)] text-[var(--color-error-700)] rounded-full">
                                                {partAbsentCount}명 불참
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-success-100)] text-[var(--color-success-700)] rounded-full">
                                                전원출석
                                            </span>
                                        )}
                                    </button>

                                    {/* 펼쳐진 내용 */}
                                    {isExpanded && (
                                        <div className="p-4 space-y-3 bg-[var(--color-background-primary)]">
                                            {/* 빠른 액션 버튼들 - 파트 마감 시에도 숨김 */}
                                            {isPartEditable && !(isFullyClosed && !canEditAfterClose) && (
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectAllPart(part, true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md
                                                            text-[var(--color-success-600)] bg-[var(--color-success-50)]
                                                            hover:bg-[var(--color-success-100)] transition-colors"
                                                    >
                                                        <CheckCheck className="w-3.5 h-3.5" />
                                                        전체 출석
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectAllPart(part, false);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md
                                                            text-[var(--color-text-tertiary)] bg-[var(--color-background-tertiary)]
                                                            hover:bg-[var(--color-border-subtle)] transition-colors"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        전체 불참
                                                    </button>
                                                </div>
                                            )}

                                            {/* 파트 마감 안내 메시지 */}
                                            {!isPartEditable && (
                                                <div className="text-center py-2 text-xs text-[var(--color-text-tertiary)] bg-[var(--color-background-secondary)] rounded-lg">
                                                    이 파트는 마감되어 수정할 수 없습니다. 수정이 필요하면 지휘자에게 문의하세요.
                                                </div>
                                            )}

                                            {/* 칩 그리드 */}
                                            <div className="flex flex-wrap gap-2">
                                                {partMembers.map((member) => {
                                                    const attendance = attendances?.find(a => a.member_id === member.id);
                                                    const dbValue = tabValue === 'service'
                                                        ? (attendance?.is_service_available ?? true)
                                                        : (attendance?.is_practice_attended ?? true);
                                                    const pending = pendingChanges[member.id];
                                                    const pendingValue = tabValue === 'service'
                                                        ? pending?.is_service_available
                                                        : pending?.is_practice_attended;
                                                    const isAttending = pendingValue !== undefined ? pendingValue : dbValue;
                                                    const isChanged = pendingValue !== undefined && pendingValue !== dbValue;

                                                    // 전체 마감 또는 파트 마감 시 수정 권한 없으면 비활성화
                                                    const isDisabled = !isPartEditable || (isFullyClosed && !canEditAfterClose);

                                                    return (
                                                        <MemberChip
                                                            key={member.id}
                                                            member={{
                                                                id: member.id,
                                                                name: member.name,
                                                                part: member.part as Part,
                                                                is_leader: member.is_leader ?? false,
                                                            }}
                                                            isAttending={isAttending}
                                                            isChanged={isChanged}
                                                            disabled={isDisabled}
                                                            onToggle={() => handleToggle(member.id)}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            {/* 불참자 필터 시 해당 파트에 불참자가 없을 때 */}
                                            {showAbsentOnly && partMembers.length === 0 && partAbsentCount === 0 && (
                                                <div className="text-center py-4 text-sm text-[var(--color-text-tertiary)]">
                                                    이 파트는 전원 출석입니다
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 접힌 상태에서 미니 프리뷰 */}
                                    {!isExpanded && partAbsentCount > 0 && (
                                        <div className="px-4 py-2 bg-[var(--color-background-secondary)] border-t border-[var(--color-border-default)]">
                                            <p className="text-xs text-[var(--color-text-tertiary)]">
                                                불참: {allPartMembers
                                                    .filter(m => !getMemberAttendingStatus(m.id))
                                                    .map(m => m.name)
                                                    .slice(0, 5)
                                                    .join(', ')}
                                                {partAbsentCount > 5 && ` 외 ${partAbsentCount - 5}명`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* 필터 적용 시 결과가 없을 때 */}
                        {showAbsentOnly && absentCount === 0 && (
                            <div className="text-center py-8 text-[var(--color-text-secondary)]">
                                모든 대원이 출석으로 체크되어 있습니다.
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            {/* 하단 고정 플로팅 저장 버튼 */}
            {hasChanges && (
                <div className="fixed bottom-20 left-0 right-0 z-40 px-4 lg:bottom-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="max-w-lg mx-auto flex flex-col gap-2 p-3 bg-[var(--color-background-primary)] rounded-xl shadow-lg border border-[var(--color-border-default)]">
                        {/* 마감된 파트 경고 */}
                        {hasClosedPartChanges && (
                            <p className="text-xs text-[var(--color-warning-600)] text-center">
                                마감된 파트의 {closedPartChanges.length}건은 저장되지 않습니다
                            </p>
                        )}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                disabled={isSubmitting}
                                className="flex-shrink-0"
                            >
                                <RotateCcw className="w-4 h-4 mr-1.5" />
                                취소
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={isSubmitting || (isFullyClosed && !canEditAfterClose) || validChangesCount === 0}
                                className="flex-1"
                            >
                                {isSubmitting ? (
                                    <Spinner size="sm" className="mr-1.5" />
                                ) : (
                                    <Save className="w-4 h-4 mr-1.5" />
                                )}
                                저장 ({validChangesCount}건)
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
