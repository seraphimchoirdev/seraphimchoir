'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMembers } from '@/hooks/useMembers';
import { useBulkCreateAttendances } from '@/hooks/useAttendances';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCheck, RotateCcw, Send, Users } from 'lucide-react';
import type { TablesInsert } from '@/types/database.types';
import type { Database } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import AttendanceChipGrid from './AttendanceChipGrid';

type Part = Database['public']['Enums']['part'];

interface MemberAttendanceState {
  member_id: string;
  name: string;
  part: Part;
  is_service_available: boolean;
}

const PARTS: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];

/**
 * 날짜별 일괄 출석 입력 폼 컴포넌트 (칩 그리드 버전)
 * - 컴팩트한 칩 형태로 한 화면에 많은 인원 표시
 * - 파트별 접기/펼치기 지원
 */
export default function BulkAttendanceForm() {
  const { profile, user } = useAuth();
  const [userPart, setUserPart] = useState<Part | null>(null);
  const [isPartLoading, setIsPartLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceStates, setAttendanceStates] = useState<
    Map<string, MemberAttendanceState>
  >(new Map());
  const [expandedParts, setExpandedParts] = useState<Set<Part>>(
    new Set(PARTS) // 기본적으로 모든 파트 펼침
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    errors?: Array<{ chunk?: number; error?: string; message?: string }>;
  } | null>(null);

  // 파트장인 경우 본인 파트 확인
  useEffect(() => {
    async function fetchUserPart() {
      if (profile?.role === 'PART_LEADER' && user?.email) {
        setIsPartLoading(true);
        const supabase = createClient();
        const { data } = await supabase
          .from('members')
          .select('part')
          .eq('email', user.email)
          .single();
        if (data) setUserPart(data.part as Part);
        setIsPartLoading(false);
      }
    }
    fetchUserPart();
  }, [profile, user]);

  // 회원 목록 조회 (REGULAR 상태 등단자만, 최대 100명 - 지휘자/반주자 제외)
  const { data: membersResponse, isLoading: isMembersLoading } = useMembers({
    limit: 100,
    member_status: 'REGULAR',
    is_singer: true, // 등단자만 (지휘자/반주자 제외)
    sortBy: 'name',   // 가나다순 정렬 (중장년층 UX 개선)
    sortOrder: 'asc',
  });

  const members = membersResponse?.data || [];

  // 일괄 출석 생성 훅
  const bulkCreateMutation = useBulkCreateAttendances();

  // 파트별로 그룹화 (파트장은 본인 파트만)
  const membersByPart = useMemo(() => {
    const groups: Record<Part, typeof members> = {
      SOPRANO: [],
      ALTO: [],
      TENOR: [],
      BASS: [],
      SPECIAL: [],
    };

    members.forEach((member) => {
      // 파트장인 경우 본인 파트만 표시
      if (profile?.role === 'PART_LEADER' && userPart && member.part !== userPart) {
        return;
      }
      if (groups[member.part]) {
        groups[member.part].push(member);
      }
    });

    return groups;
  }, [members, profile?.role, userPart]);

  // 초기 상태 생성
  const initializeStates = useCallback(() => {
    const newStates = new Map<string, MemberAttendanceState>();
    members.forEach((member) => {
      newStates.set(member.id, {
        member_id: member.id,
        name: member.name,
        part: member.part,
        is_service_available: true,
      });
    });
    setAttendanceStates(newStates);
  }, [members]);

  // 컴포넌트 마운트 시 또는 회원 목록 변경 시 초기화
  if (members.length > 0 && attendanceStates.size === 0) {
    initializeStates();
  }

  // 파트 접기/펼치기 토글
  const handleTogglePart = useCallback((part: Part) => {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(part)) {
        next.delete(part);
      } else {
        next.add(part);
      }
      return next;
    });
  }, []);

  // 개별 회원 출석 상태 토글
  const handleToggleAttendance = useCallback((memberId: string) => {
    setAttendanceStates((prev) => {
      const newStates = new Map(prev);
      const current = newStates.get(memberId);
      if (current) {
        newStates.set(memberId, {
          ...current,
          is_service_available: !current.is_service_available,
        });
      }
      return newStates;
    });
  }, []);

  // 파트별 전체 선택
  const handleSelectPart = useCallback((part: Part) => {
    setAttendanceStates((prev) => {
      const newStates = new Map(prev);
      membersByPart[part].forEach((member) => {
        const current = newStates.get(member.id);
        if (current) {
          newStates.set(member.id, {
            ...current,
            is_service_available: true,
          });
        }
      });
      return newStates;
    });
  }, [membersByPart]);

  // 파트별 전체 해제
  const handleDeselectPart = useCallback((part: Part) => {
    setAttendanceStates((prev) => {
      const newStates = new Map(prev);
      membersByPart[part].forEach((member) => {
        const current = newStates.get(member.id);
        if (current) {
          newStates.set(member.id, {
            ...current,
            is_service_available: false,
          });
        }
      });
      return newStates;
    });
  }, [membersByPart]);

  // 전체 선택
  const handleSelectAll = useCallback(() => {
    setAttendanceStates((prev) => {
      const newStates = new Map(prev);
      newStates.forEach((state, memberId) => {
        newStates.set(memberId, {
          ...state,
          is_service_available: true,
        });
      });
      return newStates;
    });
  }, []);

  // 전체 해제
  const handleDeselectAll = useCallback(() => {
    setAttendanceStates((prev) => {
      const newStates = new Map(prev);
      newStates.forEach((state, memberId) => {
        newStates.set(memberId, { ...state, is_service_available: false });
      });
      return newStates;
    });
  }, []);

  // 초기화
  const handleReset = useCallback(() => {
    initializeStates();
    setSubmitResult(null);
  }, [initializeStates]);

  // 모든 파트 펼치기/접기
  const handleExpandAll = useCallback(() => {
    setExpandedParts(new Set(PARTS));
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedParts(new Set());
  }, []);

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const attendances: TablesInsert<'attendances'>[] = Array.from(
        attendanceStates.values()
      ).map((state) => ({
        member_id: state.member_id,
        date: selectedDate,
        is_service_available: state.is_service_available,
      }));

      const chunkSize = 100;
      const chunks: TablesInsert<'attendances'>[][] = [];
      for (let i = 0; i < attendances.length; i += chunkSize) {
        chunks.push(attendances.slice(i, i + chunkSize));
      }

      let totalSucceeded = 0;
      let totalFailed = 0;
      const allErrors: Array<{ chunk?: number; error?: string; message?: string }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const result = await bulkCreateMutation.mutateAsync(chunk);
          totalSucceeded += result.summary.succeeded;
          totalFailed += result.summary.failed;
        } catch (error) {
          totalFailed += chunk.length;
          allErrors.push({
            chunk: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      setSubmitResult({
        success: totalFailed === 0,
        total: attendances.length,
        succeeded: totalSucceeded,
        failed: totalFailed,
        errors: allErrors.length > 0 ? allErrors : undefined,
      });
    } catch (error) {
      setSubmitResult({
        success: false,
        total: attendanceStates.size,
        succeeded: 0,
        failed: attendanceStates.size,
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 선택된 인원 카운트
  const { selectedCount, absentCount } = useMemo(() => {
    let selected = 0;
    let absent = 0;
    attendanceStates.forEach((state) => {
      if (state.is_service_available) {
        selected++;
      } else {
        absent++;
      }
    });
    return { selectedCount: selected, absentCount: absent };
  }, [attendanceStates]);

  // 파트장인 경우 파트 정보 로딩도 대기
  const isLoading = isMembersLoading || (profile?.role === 'PART_LEADER' && isPartLoading);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary-500)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 상단 컨트롤 카드 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* 날짜 선택 */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--color-primary-500)]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border-default)] rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]
                    bg-[var(--color-surface)]"
                  required
                />
              </div>

              {/* 인원 요약 */}
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                <span className="text-[var(--color-text-secondary)]">
                  출석 <strong className="text-[var(--color-success-600)]">{selectedCount}</strong>명
                  {' / '}
                  불참 <strong className="text-[var(--color-error-600)]">{absentCount}</strong>명
                  {' / '}
                  전체 {members.length}명
                </span>
              </div>

              {/* 전체 선택/해제 */}
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  전체 출석
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="text-xs"
                >
                  전체 불참
                </Button>
              </div>
            </div>

            {/* 펼치기/접기 컨트롤 */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border-light)]">
              <button
                type="button"
                onClick={handleExpandAll}
                className="text-xs text-[var(--color-primary-600)] hover:underline"
              >
                모두 펼치기
              </button>
              <span className="text-[var(--color-border-default)]">|</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="text-xs text-[var(--color-primary-600)] hover:underline"
              >
                모두 접기
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 파트별 출석 그리드 */}
        <div className="space-y-3">
          {PARTS.map((part) => {
            const partMembers = membersByPart[part];
            if (partMembers.length === 0) return null;

            return (
              <AttendanceChipGrid
                key={part}
                part={part}
                members={partMembers.map((m) => ({
                  id: m.id,
                  name: m.name,
                  part: m.part,
                  is_leader: m.is_leader || false,
                }))}
                attendanceStates={attendanceStates}
                isExpanded={expandedParts.has(part)}
                onToggleExpand={() => handleTogglePart(part)}
                onToggleAttendance={handleToggleAttendance}
                onSelectAll={() => handleSelectPart(part)}
                onDeselectAll={() => handleDeselectPart(part)}
              />
            );
          })}
        </div>

        {/* 제출 결과 */}
        {submitResult && (
          <Alert variant={submitResult.success ? 'success' : 'error'}>
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">
                  {submitResult.success ? '✓ 제출 완료' : '⚠ 부분 성공'}
                </p>
                <p className="text-sm">
                  전체: {submitResult.total}건 / 성공: {submitResult.succeeded}건 /
                  실패: {submitResult.failed}건
                </p>
                {submitResult.errors && submitResult.errors.length > 0 && (
                  <ul className="list-disc list-inside text-sm mt-2">
                    {submitResult.errors.map((error, idx) => (
                      <li key={idx}>{error.error || error.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 제출 버튼 */}
        <div className="flex gap-3 sticky bottom-4 bg-gradient-to-t from-[var(--color-background)] via-[var(--color-background)] to-transparent pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || members.length === 0}
            className="flex-1"
            size="lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                처리 중...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                제출하기
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
            size="lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            초기화
          </Button>
        </div>
      </form>
    </div>
  );
}
