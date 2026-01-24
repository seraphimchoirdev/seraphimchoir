/**
 * 긴급 인원 변동 처리 타입 정의
 *
 * 자리배치표가 공유(SHARED)된 이후 발생하는 긴급 인원 변동을 체계적으로 처리하기 위한 타입들
 */

import type { Database } from './database.types';
import type { GridLayout } from './grid';
import type { SeatAssignment } from '@/store/arrangement-store';

type Part = Database['public']['Enums']['part'];

// ============================================
// 긴급 변동 처리 방식
// ============================================

/**
 * 등단 불가 처리 방식
 * - LEAVE_EMPTY: 빈 자리 유지 (이동 0명)
 * - AUTO_PULL: 자동 당기기 (같은 파트만 당김)
 * - MANUAL: 수동 처리 (다이얼로그 닫고 직접 조정)
 */
export type UnavailableProcessMode = 'LEAVE_EMPTY' | 'AUTO_PULL' | 'MANUAL';

/**
 * 등단 가능 처리 방식
 * - AUTO_PLACE: 자동 배치 (파트 영역 내 빈 좌석에 자동 배치)
 * - MANUAL: 수동 배치 (다이얼로그 닫고 직접 좌석 선택)
 */
export type AvailableProcessMode = 'AUTO_PLACE' | 'MANUAL';

// ============================================
// 변동 미리보기 (시뮬레이션 결과)
// ============================================

/**
 * 연쇄 변동 단계
 */
export interface CascadeChangeStep {
    step: number;
    type: 'REMOVE' | 'MOVE' | 'SHRINK' | 'EXPAND' | 'ADD';
    description: string;  // "김영희(S) 이동: 1행 4열 → 1행 3열"
    memberId?: string;
    memberName?: string;
    part?: Part;
    from?: { row: number; col: number };
    to?: { row: number; col: number };
}

/**
 * 그리드 레이아웃 변경 사항
 */
export interface GridLayoutChange {
    row: number;
    before: number;
    after: number;
}

/**
 * 긴급 변동 미리보기 데이터
 */
export interface EmergencyChangePreview {
    /** 대상 멤버 정보 */
    targetMember: {
        memberId: string;
        memberName: string;
        part: Part;
        position?: { row: number; col: number };
    };

    /** 연쇄 변동 목록 */
    cascadeChanges: CascadeChangeStep[];

    /** 그리드 레이아웃 변경 사항 */
    gridLayoutChanges: {
        rowCapacityChanges: GridLayoutChange[];
    };

    /** 이동 인원 수 */
    movedMemberCount: number;

    /** 시뮬레이션된 최종 배치 상태 (미리보기용) */
    simulatedAssignments: Record<string, SeatAssignment>;

    /** 시뮬레이션된 최종 그리드 레이아웃 (미리보기용) */
    simulatedGridLayout: GridLayout;
}

// ============================================
// 변동 이력 추적
// ============================================

/**
 * 변동 유형
 */
export type EmergencyChangeType = 'UNAVAILABLE' | 'AVAILABLE';

/**
 * 긴급 변동 이력
 */
export interface EmergencyChange {
    id: string;
    timestamp: string;  // ISO 8601 형식
    type: EmergencyChangeType;
    memberId: string;
    memberName: string;
    part: Part;

    /** 처리 방식 */
    processMode: UnavailableProcessMode | AvailableProcessMode;

    /** 제거 시 원래 위치 (UNAVAILABLE 타입만) */
    removedFrom?: { row: number; col: number };

    /** 추가 시 배치 위치 (AVAILABLE 타입만) */
    addedTo?: { row: number; col: number };

    /** 연쇄 변동 목록 */
    cascadeChanges: CascadeChangeStep[];

    /** 이동된 멤버 수 */
    movedMemberCount: number;
}

/**
 * 공유 시점 스냅샷 (비교 기준)
 */
export interface SharedSnapshot {
    assignments: Record<string, SeatAssignment>;
    gridLayout: GridLayout;
    timestamp: string;  // ISO 8601 형식
}

/**
 * 긴급 변동 상태
 */
export interface EmergencyChangesState {
    /** 공유 시점 스냅샷 (비교 기준) */
    sharedSnapshot: SharedSnapshot | null;

    /** 변동 이력 */
    changes: EmergencyChange[];

    /** 하이라이트 대상 멤버 ID와 하이라이트 타입 */
    highlights: Map<string, ChangeHighlight>;
}

// ============================================
// 시각적 하이라이트
// ============================================

/**
 * 변동 하이라이트 타입
 * - ADDED: 새로 추가된 멤버 (녹색)
 * - MOVED: 이동된 멤버 (황색)
 * - null: 하이라이트 없음
 */
export type ChangeHighlight = 'ADDED' | 'MOVED' | null;

// ============================================
// 다이얼로그 Props
// ============================================

/**
 * 등단 불가 다이얼로그 Props
 */
export interface EmergencyUnavailableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** 대상 멤버 정보 */
    targetMember: {
        memberId: string;
        memberName: string;
        part: Part;
        row: number;
        col: number;
    } | null;
    /** 배치표 정보 */
    arrangementId: string;
    date: string;
    /** 처리 완료 콜백 */
    onComplete?: (message: string) => void;
    /** 오류 콜백 */
    onError?: (message: string) => void;
}

/**
 * 등단 가능 다이얼로그 Props
 */
export interface EmergencyAvailableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** 배치표 정보 */
    arrangementId: string;
    date: string;
    /** 처리 완료 콜백 */
    onComplete?: (message: string) => void;
    /** 오류 콜백 */
    onError?: (message: string) => void;
}

// ============================================
// 시뮬레이션 함수 결과 타입
// ============================================

/**
 * 시뮬레이션 결과
 */
export interface SimulationResult {
    /** 변경된 배치 상태 */
    assignments: Record<string, SeatAssignment>;
    /** 변경된 그리드 레이아웃 */
    gridLayout: GridLayout;
    /** 연쇄 변동 목록 */
    cascadeChanges: CascadeChangeStep[];
    /** 이동된 멤버 수 */
    movedMemberCount: number;
}

/**
 * 미등단 투표자 (긴급 등단 가능 추가 대상)
 */
export interface UnavailableMember {
    memberId: string;
    memberName: string;
    part: Part;
    /** 출석 레코드 ID (업데이트용) */
    attendanceId?: string;
}
