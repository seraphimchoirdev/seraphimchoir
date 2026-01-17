/**
 * 과거 자리배치 적용 API
 * POST /api/arrangements/[id]/apply-past
 *
 * 과거 배치표의 좌석 정보를 현재 출석 가능 인원에게 파트별 영역 유지하며 매핑
 * - 각 파트가 과거에 차지한 영역을 현재 그리드에 비례적으로 매핑
 * - 학습된 파트 배치 규칙 또는 기본 규칙 기반 타겟 영역 계산
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import {
    applyPastArrangementWithZoneMapping,
    type PastSeat,
    type AvailableMember,
    type GridLayout,
    type MemberSeatPreference,
    type PartPlacementRules,
} from '@/lib/past-arrangement-mapper';
import { loadPartPlacementRules } from '@/lib/part-placement-rules-loader';

const logger = createLogger({ prefix: 'ApplyPastArrangement' });

const applyPastSchema = z.object({
    sourceArrangementId: z.string().uuid('유효한 배치표 ID가 아닙니다'),
    gridLayout: z.object({
        rows: z.number().min(4).max(8),
        rowCapacities: z.array(z.number().min(0).max(20)),
        zigzagPattern: z.enum(['none', 'even', 'odd']),
    }).optional(),
});

/**
 * 배치표 제목에서 예배 유형 추출
 * 예: "2025-01-05 주일 2부 예배" → "주일 2부 예배"
 *
 * UI에서 사용하는 표준 예배 유형:
 * - '주일 2부 예배'
 * - '오후찬양예배'
 * - '절기찬양예배'
 * - '온세대예배'
 * - '기도회'
 * - '기타'
 */
function extractServiceType(title: string): string {
    // 표준 예배 유형 (ServiceScheduleForm, ArrangementFilters 기준)
    const serviceTypes = [
        '주일 2부 예배',
        '오후찬양예배',
        '절기찬양예배',
        '온세대예배',
        '기도회',
    ];
    for (const type of serviceTypes) {
        if (title.includes(type)) {
            return type;
        }
    }

    // 레거시 데이터 호환 (공백 없는 형식)
    if (title.includes('2부예배') || title.includes('2부 예배')) {
        return '주일 2부 예배';
    }
    if (title.includes('온세대')) {
        return '온세대예배';
    }
    if (title.includes('오후찬양') || title.includes('오후 찬양')) {
        return '오후찬양예배';
    }
    if (title.includes('절기') || title.includes('특별')) {
        return '절기찬양예배';
    }

    // 기본값: 주일 2부 예배 (가장 흔한 유형)
    return '주일 2부 예배';
}

interface SeatRecommendation {
    memberId: string;
    memberName: string;
    row: number;
    col: number;
    part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
}

interface UnassignedMember {
    id: string;
    name: string;
    part: 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
    reason: 'not_in_past' | 'out_of_grid' | 'seat_conflict' | 'zone_full';
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id: currentArrangementId } = await params;

    try {
        const json = await request.json();
        const { sourceArrangementId, gridLayout: clientGridLayout } = applyPastSchema.parse(json);

        // 1. 현재 배치표 정보 조회 (날짜, 그리드 레이아웃, 제목)
        const { data: currentArrangement, error: currentError } = await supabase
            .from('arrangements')
            .select('date, grid_layout, grid_rows, title')
            .eq('id', currentArrangementId)
            .single();

        if (currentError || !currentArrangement) {
            return NextResponse.json(
                { error: '현재 배치표를 찾을 수 없습니다' },
                { status: 404 }
            );
        }

        // 2. 모든 정대원 + 출석 데이터 병렬 조회
        // 출석 레코드가 없는 대원도 기본값 true(등단 가능)로 처리
        const [membersResult, attendancesResult] = await Promise.all([
            // 모든 정대원 조회 (등단자만 - 지휘자/반주자 제외)
            supabase
                .from('members')
                .select('id, name, part')
                .eq('member_status', 'REGULAR')
                .eq('is_singer', true),
            // 해당 날짜의 모든 출석 데이터 조회 (필터 없이)
            supabase
                .from('attendances')
                .select('member_id, is_service_available')
                .eq('date', currentArrangement.date)
        ]);

        const { data: allMembers, error: membersError } = membersResult;
        const { data: attendances, error: attendanceError } = attendancesResult;

        if (membersError) {
            return NextResponse.json(
                { error: '대원 정보를 불러오는데 실패했습니다' },
                { status: 500 }
            );
        }

        if (attendanceError) {
            return NextResponse.json(
                { error: '출석 정보를 불러오는데 실패했습니다' },
                { status: 500 }
            );
        }

        // 출석 데이터를 Map으로 변환 (O(1) 조회)
        const attendanceMap = new Map<string, boolean>();
        attendances?.forEach(att => {
            attendanceMap.set(att.member_id, att.is_service_available);
        });

        // 등단 가능한 대원 필터링
        // - 출석 레코드가 없으면 기본값 true (등단 가능)
        // - 출석 레코드가 있으면 is_service_available 값 사용
        const availableMembersList = (allMembers || []).filter(member => {
            const isServiceAvailable = attendanceMap.get(member.id);
            return isServiceAvailable === undefined || isServiceAvailable === true;
        });

        // 출석 가능 인원 Set/Map 생성
        const availableMemberIds = new Set(
            availableMembersList.map(m => m.id)
        );
        const availableMembers = new Map(
            availableMembersList.map(m => [m.id, m])
        );

        // 2-1. ML 선호 좌석 데이터 조회 (member_seat_statistics)
        const { data: memberPreferencesData } = await supabase
            .from('member_seat_statistics')
            .select('member_id, preferred_row, preferred_col, is_fixed_seat, row_consistency, col_consistency')
            .in('member_id', Array.from(availableMemberIds));

        // Map으로 변환 (O(1) 조회)
        const memberPreferences = new Map<string, MemberSeatPreference>(
            (memberPreferencesData || []).map(p => [p.member_id, {
                preferred_row: p.preferred_row,
                preferred_col: p.preferred_col,
                is_fixed_seat: p.is_fixed_seat,
                row_consistency: p.row_consistency,
                col_consistency: p.col_consistency,
            }])
        );

        // 3. 과거 배치표 정보 + 좌석 정보 병렬 조회
        const [pastArrangementResult, pastSeatsResult] = await Promise.all([
            supabase
                .from('arrangements')
                .select('grid_layout, grid_rows')
                .eq('id', sourceArrangementId)
                .single(),
            supabase
                .from('seats')
                .select(`
                    member_id,
                    seat_row,
                    seat_column,
                    part,
                    member:members (
                        name
                    )
                `)
                .eq('arrangement_id', sourceArrangementId),
        ]);

        const { data: pastArrangement, error: pastArrError } = pastArrangementResult;
        const { data: pastSeatsData, error: pastSeatsError } = pastSeatsResult;

        if (pastArrError || !pastArrangement) {
            return NextResponse.json(
                { error: '과거 배치표를 찾을 수 없습니다' },
                { status: 404 }
            );
        }

        if (pastSeatsError) {
            return NextResponse.json(
                { error: '과거 배치 정보를 불러오는데 실패했습니다' },
                { status: 500 }
            );
        }

        // 4. 그리드 레이아웃 정보 (클라이언트 전달값 우선, DB 값 fallback)
        const currentGridLayout: GridLayout = clientGridLayout || currentArrangement.grid_layout || {
            rows: currentArrangement.grid_rows || 6,
            rowCapacities: Array(currentArrangement.grid_rows || 6).fill(8),
            zigzagPattern: 'even' as const,
        };

        // 과거 배치표의 그리드 레이아웃
        const pastGridLayout: GridLayout = pastArrangement.grid_layout || {
            rows: pastArrangement.grid_rows || 6,
            rowCapacities: Array(pastArrangement.grid_rows || 6).fill(8),
            zigzagPattern: 'even' as const,
        };

        // 5. 과거 좌석 데이터 변환
        type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 'SPECIAL';
        const pastSeats: PastSeat[] = (pastSeatsData || []).map(seat => ({
            memberId: seat.member_id,
            memberName: (seat.member as { name?: string } | null)?.name || 'Unknown',
            part: seat.part as Part,
            row: seat.seat_row,
            col: seat.seat_column,
        }));

        // 출석 가능 멤버 데이터 변환
        const availableMemberList: AvailableMember[] = availableMembersList.map(m => ({
            id: m.id,
            name: m.name,
            part: m.part as Part,
        }));

        // 5-1. 학습된 파트 배치 규칙 로드
        // 예배 유형 및 인원수 구간 기반으로 최적화된 규칙 사용
        const serviceType = extractServiceType(currentArrangement.title);
        const totalMembers = availableMemberList.length;

        const { rules: learnedRules, source: rulesSource } = await loadPartPlacementRules(
            supabase,
            { serviceType, totalMembers }
        );

        logger.debug(`파트 배치 규칙 로드: ${rulesSource} (${serviceType}, ${totalMembers}명)`);

        // 6. 파트별 영역 유지 매핑 알고리즘 적용 (ML 선호 좌석 + 학습 규칙 포함)
        const result = applyPastArrangementWithZoneMapping({
            pastSeats,
            pastGridLayout,
            currentGridLayout,
            availableMembers: availableMemberList,
            memberPreferences,  // ML 선호 좌석 데이터 전달
            learnedRules: learnedRules as PartPlacementRules,  // 학습된 파트 배치 규칙 전달
        });

        // 7. 응답
        return NextResponse.json({
            seats: result.seats,
            matchedCount: result.seats.length,
            totalAvailable: availableMemberIds.size,
            unassignedMembers: result.unassignedMembers,
            gridLayout: currentGridLayout,
            rulesInfo: {
                source: rulesSource,
                serviceType,
                memberCountRange: `${Math.floor(totalMembers / 10) * 10}-${Math.floor(totalMembers / 10) * 10 + 9}`,
            },
        });

    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation Error', details: error.issues },
                { status: 400 }
            );
        }
        logger.error('Apply past arrangement error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
