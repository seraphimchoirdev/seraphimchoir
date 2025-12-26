/**
 * 과거 자리배치 적용 API
 * POST /api/arrangements/[id]/apply-past
 *
 * 과거 배치표의 좌석 정보를 현재 출석 가능 인원에게 매칭하여 반환
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const applyPastSchema = z.object({
    sourceArrangementId: z.string().uuid('유효한 배치표 ID가 아닙니다'),
    gridLayout: z.object({
        rows: z.number().min(4).max(8),
        rowCapacities: z.array(z.number().min(0).max(20)),
        zigzagPattern: z.enum(['none', 'even', 'odd']),
    }).optional(),
});

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
    reason: 'not_in_past' | 'out_of_grid' | 'seat_conflict';
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

        // 1. 현재 배치표 정보 조회 (날짜, 그리드 레이아웃)
        const { data: currentArrangement, error: currentError } = await supabase
            .from('arrangements')
            .select('date, grid_layout, grid_rows')
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
            // 모든 정대원 조회
            supabase
                .from('members')
                .select('id, name, part')
                .eq('member_status', 'REGULAR'),
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

        // 3. 과거 배치표의 좌석 정보 조회
        const { data: pastSeats, error: pastError } = await supabase
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
            .eq('arrangement_id', sourceArrangementId);

        if (pastError) {
            return NextResponse.json(
                { error: '과거 배치 정보를 불러오는데 실패했습니다' },
                { status: 500 }
            );
        }

        // 4. 그리드 레이아웃 정보 (클라이언트 전달값 우선, DB 값 fallback)
        // 클라이언트에서 AI 추천 분배로 변경된 그리드를 사용하려면 clientGridLayout 전달 필요
        const gridLayout = clientGridLayout || currentArrangement.grid_layout || {
            rows: currentArrangement.grid_rows || 6,
            rowCapacities: Array(currentArrangement.grid_rows || 6).fill(8),
            zigzagPattern: 'even'
        };

        // 5. 매칭 로직
        const seats: SeatRecommendation[] = [];
        const unassignedMembers: UnassignedMember[] = [];
        const occupiedSeats = new Set<string>();
        const assignedMemberIds = new Set<string>();

        // 과거 좌석 데이터를 순회하며 매칭
        for (const pastSeat of pastSeats || []) {
            const memberId = pastSeat.member_id;
            const memberName = (pastSeat.member as any)?.name || 'Unknown';
            const part = pastSeat.part;
            const row = pastSeat.seat_row;
            const col = pastSeat.seat_column;

            // 현재 출석 가능 인원인지 확인
            if (!availableMemberIds.has(memberId)) {
                continue; // 출석 불가 인원은 스킵
            }

            // 좌석이 현재 그리드 범위 내인지 확인
            if (row >= gridLayout.rows || col >= gridLayout.rowCapacities[row]) {
                unassignedMembers.push({
                    id: memberId,
                    name: memberName,
                    part,
                    reason: 'out_of_grid'
                });
                assignedMemberIds.add(memberId);
                continue;
            }

            // 좌석 충돌 확인
            const seatKey = `${row}-${col}`;
            if (occupiedSeats.has(seatKey)) {
                unassignedMembers.push({
                    id: memberId,
                    name: memberName,
                    part,
                    reason: 'seat_conflict'
                });
                assignedMemberIds.add(memberId);
                continue;
            }

            // 좌석 배치
            seats.push({
                memberId,
                memberName,
                row,
                col,
                part
            });
            occupiedSeats.add(seatKey);
            assignedMemberIds.add(memberId);
        }

        // 6. 미배치 대원을 빈 좌석에 자동 배치
        // 빈 좌석 목록 생성
        const emptySeats: { row: number; col: number }[] = [];
        for (let row = 0; row < gridLayout.rows; row++) {
            const rowCapacity = gridLayout.rowCapacities[row] || 0;
            for (let col = 0; col < rowCapacity; col++) {
                const seatKey = `${row}-${col}`;
                if (!occupiedSeats.has(seatKey)) {
                    emptySeats.push({ row, col });
                }
            }
        }

        // 미배치 대원 수집 (파트별로 그룹화하여 파트 균형 유지)
        const unassignedByPart: Map<string, { id: string; name: string; part: string }[]> = new Map();
        for (const memberId of availableMemberIds) {
            if (!assignedMemberIds.has(memberId)) {
                const member = availableMembers.get(memberId) as any;
                if (member) {
                    if (!unassignedByPart.has(member.part)) {
                        unassignedByPart.set(member.part, []);
                    }
                    unassignedByPart.get(member.part)!.push({
                        id: memberId,
                        name: member.name,
                        part: member.part
                    });
                }
            }
        }

        // 파트 순서대로 라운드 로빈 방식으로 빈 좌석에 배치
        const partOrder = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];
        let emptyIndex = 0;
        let hasMore = true;

        while (hasMore && emptyIndex < emptySeats.length) {
            hasMore = false;
            for (const part of partOrder) {
                const partMembers = unassignedByPart.get(part);
                if (partMembers && partMembers.length > 0) {
                    hasMore = true;
                    const member = partMembers.shift()!;
                    if (emptyIndex < emptySeats.length) {
                        const { row, col } = emptySeats[emptyIndex++];
                        seats.push({
                            memberId: member.id,
                            memberName: member.name,
                            row,
                            col,
                            part: member.part as SeatRecommendation['part']
                        });
                        occupiedSeats.add(`${row}-${col}`);
                        assignedMemberIds.add(member.id);
                    }
                }
            }
        }

        // 좌석 부족으로 배치되지 못한 대원들
        for (const [part, members] of unassignedByPart) {
            for (const member of members) {
                unassignedMembers.push({
                    id: member.id,
                    name: member.name,
                    part: member.part as UnassignedMember['part'],
                    reason: 'not_in_past'
                });
            }
        }

        // 7. 응답
        return NextResponse.json({
            seats,
            matchedCount: seats.length,
            totalAvailable: availableMemberIds.size,
            unassignedMembers,
            gridLayout: gridLayout
        });

    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation Error', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Apply past arrangement error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
