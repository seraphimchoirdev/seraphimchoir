'use client';

import { useMemo } from 'react';
import { cn, getPartLabel } from '@/lib/utils';
import { CheckCheck, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Part } from '@/types';
import MemberChip from './MemberChip';

interface Member {
  id: string;
  name: string;
  part: Part;
  is_leader: boolean;
}

interface AttendanceState {
  member_id: string;
  is_service_available: boolean;
}

interface AttendanceChipGridProps {
  part: Part;
  members: Member[];
  attendanceStates: Map<string, AttendanceState>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleAttendance: (memberId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

/**
 * 파트별 출석 칩 그리드 컴포넌트
 * - 접힌 상태: 파트 요약 정보 표시
 * - 펼친 상태: 칩 형태로 대원들을 그리드 배치
 */
export default function AttendanceChipGrid({
  part,
  members,
  attendanceStates,
  isExpanded,
  onToggleExpand,
  onToggleAttendance,
  onSelectAll,
  onDeselectAll,
}: AttendanceChipGridProps) {
  // 통계 계산
  const stats = useMemo(() => {
    let attending = 0;
    let absent = 0;

    members.forEach((member) => {
      const state = attendanceStates.get(member.id);
      if (state?.is_service_available) {
        attending++;
      } else {
        absent++;
      }
    });

    return { attending, absent, total: members.length };
  }, [members, attendanceStates]);

  // 파트별 그라데이션 배경색
  const partGradients: Record<Part, string> = {
    SOPRANO: 'from-purple-50 to-purple-100/50',
    ALTO: 'from-yellow-50 to-yellow-100/50',
    TENOR: 'from-blue-50 to-blue-100/50',
    BASS: 'from-green-50 to-green-100/50',
    SPECIAL: 'from-gray-50 to-gray-100/50',
  };

  const partAccentColors: Record<Part, string> = {
    SOPRANO: 'text-purple-700',
    ALTO: 'text-yellow-700',
    TENOR: 'text-blue-700',
    BASS: 'text-green-700',
    SPECIAL: 'text-gray-700',
  };

  if (members.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--color-border-default)] bg-white shadow-sm">
      {/* 파트 헤더 - 접기/펼치기 */}
      <button
        type="button"
        onClick={onToggleExpand}
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
            {stats.attending}/{stats.total}명
          </span>
        </div>

        {/* 불참자 또는 전원출석 배지 */}
        {stats.absent > 0 ? (
          <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-error-100)] text-[var(--color-error-700)] rounded-full">
            {stats.absent}명 불참
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs font-medium bg-[var(--color-success-100)] text-[var(--color-success-700)] rounded-full">
            전원출석
          </span>
        )}
      </button>

      {/* 펼쳐진 내용 */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-white">
          {/* 빠른 액션 버튼들 */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectAll();
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
                onDeselectAll();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md
                text-[var(--color-text-tertiary)] bg-gray-100
                hover:bg-gray-200 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              전체 불참
            </button>
          </div>

          {/* 칩 그리드 */}
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const state = attendanceStates.get(member.id);
              const isAttending = state?.is_service_available ?? true;

              return (
                <MemberChip
                  key={member.id}
                  member={member}
                  isAttending={isAttending}
                  onToggle={() => onToggleAttendance(member.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 접힌 상태에서 미니 프리뷰 */}
      {!isExpanded && stats.absent > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-[var(--color-border-default)]">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            불참: {members
              .filter((m) => !attendanceStates.get(m.id)?.is_service_available)
              .map((m) => m.name)
              .slice(0, 5)
              .join(', ')}
            {stats.absent > 5 && ` 외 ${stats.absent - 5}명`}
          </p>
        </div>
      )}
    </div>
  );
}
