/**
 * 자리배치 AI 추천 API Route
 * 3,577개의 2부예배 학습 데이터 기반 AI 자동배치 알고리즘 사용
 * (학습 기간: 2025-01-05 ~ 2025-11-09, 43회 예배 데이터)
 *
 * 추천 전략:
 * 1. Python ML 서비스 우선 호출 (RandomForest 모델)
 * 2. ML 서비스 실패 시 TypeScript 규칙 기반 알고리즘 fallback
 *
 * 데이터 소스:
 * - DB 우선 로드: member_seat_statistics 테이블에서 학습 데이터 조회
 * - Fallback: DB 조회 실패 시 JSON 파일에서 로드
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateAISeatingArrangement,
  loadLearnedPreferences,
  loadPreferencesFromDB,
  type Member,
  type LearnedMemberPreference,
  type DBMemberSeatStatistics,
  type PreferredSeat,
} from '@/lib/ai-seat-algorithm';
import {
  isMLServiceEnabled,
  isMLServiceReady,
  requestMLRecommendation,
  type MLMemberInput,
  type MLGridLayout,
  type MLRecommendResponse,
} from '@/lib/ml-service-client';
import {
  calculateHeightOrder,
  calculateLeaderPosition,
  type SeatWithMember,
} from '@/lib/quality-metrics';
import type { SupabaseClient } from '@supabase/supabase-js';

// JSON Fallback: DB 실패 시 사용할 캐시
let fallbackPreferences: Map<string, PreferredSeat> | null = null;

function getJSONFallbackPreferences(): Map<string, PreferredSeat> {
  if (!fallbackPreferences) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const memberPreferencesData = require('@/../training_data/member_seat_preferences.json');
    fallbackPreferences = loadLearnedPreferences(
      memberPreferencesData as LearnedMemberPreference[]
    );
    console.log('[ML] Loaded JSON fallback preferences:', fallbackPreferences.size, 'members');
  }
  return fallbackPreferences;
}

/**
 * DB에서 학습 데이터 로드 (우선)
 * 실패 시 JSON 파일 fallback
 */
async function getPreferencesFromDB(
  supabase: SupabaseClient
): Promise<{ preferences: Map<string, PreferredSeat>; source: 'db' | 'json' }> {
  try {
    const { data: dbStats, error } = await supabase
      .from('member_seat_statistics')
      .select('*')
      .gt('total_appearances', 0);

    if (error) {
      console.warn('[ML] DB query failed, using JSON fallback:', error.message);
      return { preferences: getJSONFallbackPreferences(), source: 'json' };
    }

    if (!dbStats || dbStats.length === 0) {
      console.log('[ML] No DB stats found, using JSON fallback');
      return { preferences: getJSONFallbackPreferences(), source: 'json' };
    }

    const preferences = loadPreferencesFromDB(dbStats as DBMemberSeatStatistics[]);
    console.log('[ML] Loaded preferences from DB:', preferences.size, 'members');
    return { preferences, source: 'db' };
  } catch (err) {
    console.error('[ML] Error loading from DB:', err);
    return { preferences: getJSONFallbackPreferences(), source: 'json' };
  }
}

interface RecommendRequestBody {
  gridLayout?: {
    rows: number;
    rowCapacities: number[];
    zigzagPattern: 'none' | 'even' | 'odd';
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const arrangementId = resolvedParams.id;
    const body: RecommendRequestBody = await request.json();

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 1. 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 배치표 정보 조회 (날짜 정보 필요)
    const { data: arrangement, error: arrError } = await supabase
      .from('arrangements')
      .select('*')
      .eq('id', arrangementId)
      .single();

    if (arrError || !arrangement) {
      console.error('Arrangement query error:', arrError);
      return NextResponse.json(
        { error: 'Arrangement not found', detail: arrError?.message },
        { status: 404 }
      );
    }

    // 3. 정대원 + 출석 데이터 + 파트장 정보 병렬 조회
    // 출석 레코드가 없는 대원도 기본값 true(등단 가능)로 처리해야 함
    console.log('Querying members and attendances for date:', arrangement.date);

    const [membersResult, attendancesResult, profilesResult] = await Promise.all([
      // 모든 정대원 조회 (experience 컬럼은 스키마에 없으므로 제외)
      supabase
        .from('members')
        .select('id, name, part, height, member_status')
        .eq('member_status', 'REGULAR'),

      // 해당 날짜의 모든 출석 데이터 조회 (필터 없이)
      supabase
        .from('attendances')
        .select('member_id, is_service_available')
        .eq('date', arrangement.date),

      // 파트장 정보 조회 (필요한 역할만 필터링)
      supabase
        .from('user_profiles')
        .select('member_id, role')
        .in('role', ['PART_LEADER', 'CONDUCTOR'])
    ]);

    const { data: allMembers, error: membersError } = membersResult;
    const { data: attendances, error: attError } = attendancesResult;
    const { data: profiles } = profilesResult;

    if (membersError) {
      console.error('Members query error:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch members', detail: membersError.message },
        { status: 500 }
      );
    }

    if (attError) {
      console.error('Attendance query error:', attError);
      return NextResponse.json(
        { error: 'Failed to fetch attendances', detail: attError.message },
        { status: 500 }
      );
    }

    console.log('All REGULAR members:', allMembers?.length || 0);
    console.log('Attendance records for date:', attendances?.length || 0);

    // 출석 데이터를 Map으로 변환 (O(1) 조회)
    const attendanceMap = new Map<string, boolean>();
    attendances?.forEach(att => {
      attendanceMap.set(att.member_id, att.is_service_available);
    });

    // 파트장 ID Set 생성
    const partLeaderIds = new Set(
      profiles?.map(p => p.member_id) || []
    );

    // 5. 등단 가능한 대원 필터링
    // - 출석 레코드가 없으면 기본값 true (등단 가능)
    // - 출석 레코드가 있으면 is_service_available 값 사용
    const memberHeightMap = new Map<string, number>();
    const memberLeaderMap = new Set<string>();

    const availableMembers: Member[] = (allMembers || [])
      .filter(member => {
        const isServiceAvailable = attendanceMap.get(member.id);
        // 출석 레코드가 없으면 기본값 true, 있으면 해당 값 사용
        return isServiceAvailable === undefined || isServiceAvailable === true;
      })
      .map(member => {
        // 키 정보 저장
        if (member.height) {
          memberHeightMap.set(member.id, member.height);
        }
        // 파트장 여부 저장
        if (partLeaderIds.has(member.id)) {
          memberLeaderMap.add(member.id);
        }

        return {
          id: member.id,
          name: member.name,
          part: member.part,
        };
      });

    console.log('Available members for AI recommendation:', availableMembers.length);

    // 최소 인원 확인
    if (availableMembers.length === 0) {
      return NextResponse.json(
        { error: 'No available members for this date' },
        { status: 400 }
      );
    }

    // 6. 추천 전략: Python ML 서비스 우선, 실패 시 TypeScript fallback
    // ML 서비스 가능 여부 확인
    const mlEnabled = isMLServiceEnabled();
    let mlServiceReady = false;

    if (mlEnabled) {
      mlServiceReady = await isMLServiceReady();
      console.log('[ML] Service ready:', mlServiceReady);
    }

    // 6-1. Python ML 서비스 호출 시도
    if (mlServiceReady) {
      try {
        // 대원 데이터를 ML 서비스 형식으로 변환 (availableMembers 사용)
        // allMembers에서 height, experience 정보를 가져오기 위한 Map
        const memberDetailsMap = new Map(
          (allMembers || []).map(m => [m.id, m])
        );

        const mlMembers: MLMemberInput[] = availableMembers.map(member => {
          const details = memberDetailsMap.get(member.id);
          return {
            id: member.id,
            name: member.name,
            part: member.part as MLMemberInput['part'],
            height: details?.height ?? null,
            experience: null, // experience 컬럼은 DB 스키마에 없음
            is_leader: partLeaderIds.has(member.id),
          };
        });

        // 그리드 레이아웃 설정 (요청에서 받거나 기본값)
        const gridLayout: MLGridLayout | undefined = body.gridLayout ? {
          rows: body.gridLayout.rows,
          row_capacities: body.gridLayout.rowCapacities,
          zigzag_pattern: body.gridLayout.zigzagPattern,
        } : undefined;

        console.log('[ML] Requesting recommendation from Python service...');
        const mlResponse: MLRecommendResponse = await requestMLRecommendation({
          members: mlMembers,
          grid_layout: gridLayout,
        });

        console.log('[ML] Python service response:', {
          seats: mlResponse.seats.length,
          quality: mlResponse.quality_score,
        });

        // ML 서비스 응답을 API 응답 형식으로 변환
        // Python ML은 1-based row/col을 반환 (ml_output JSON과 동일)
        // 프론트엔드(SeatSlot, Grid Calculator)도 1-based를 사용하므로 변환 불필요
        const formattedMLResponse = {
          seats: mlResponse.seats.map(seat => ({
            memberId: seat.member_id,
            memberName: seat.member_name,
            row: seat.row,
            col: seat.col,
            part: seat.part
          })),
          gridLayout: {
            rows: mlResponse.grid_layout.rows,
            rowCapacities: mlResponse.grid_layout.row_capacities,
            zigzagPattern: mlResponse.grid_layout.zigzag_pattern
          },
          metadata: {
            totalMembers: mlResponse.metadata.totalMembers,
            breakdown: {}, // ML 서비스에서 breakdown 추가 필요 시 확장
            dataSource: 'db' as const,
            preferencesLoaded: mlResponse.metadata.statsLoaded,
          },
          qualityScore: mlResponse.quality_score,
          metrics: mlResponse.metrics,
          unassignedMembers: mlResponse.unassigned_members,
          source: 'python-ml' as const,
        };

        return NextResponse.json(formattedMLResponse);
      } catch (mlError) {
        console.error('[ML] Python service failed, falling back to TypeScript:', mlError);
        // Fallback to TypeScript algorithm below
      }
    }

    // 6-2. TypeScript 규칙 기반 알고리즘 (Fallback)
    console.log('[ML] Using TypeScript rule-based algorithm');
    const { preferences, source: dataSource } = await getPreferencesFromDB(supabase);

    const recommendation = generateAISeatingArrangement(availableMembers, {
      preferredSeats: preferences,
    });

    console.log('AI recommendation generated:', {
      totalMembers: recommendation.metadata.total_members,
      rows: recommendation.grid_layout.rows,
      seats: recommendation.seats.length
    });

    // 7. 품질 점수 계산
    const placementRate = recommendation.seats.length / availableMembers.length;

    // 파트 균형도 계산 (파트별 인원이 고르게 분포되었는지)
    const partCounts = Object.values(recommendation.metadata.breakdown);
    const avgPartSize = partCounts.reduce((a, b) => a + b, 0) / partCounts.length;
    const partVariance = partCounts.reduce((sum, count) => sum + Math.pow(count - avgPartSize, 2), 0) / partCounts.length;
    const partBalance = Math.max(0, 1 - (partVariance / (avgPartSize * avgPartSize)));

    // 품질 메트릭용 좌석 데이터 변환 (키, 파트장 정보 포함)
    const seatsForMetrics: SeatWithMember[] = recommendation.seats.map(seat => ({
      memberId: seat.member_id,
      memberName: seat.member_name,
      part: seat.part,
      row: seat.row - 1,  // 0-based로 변환
      col: seat.col - 1,
      height: memberHeightMap.get(seat.member_id) ?? null,
      isLeader: memberLeaderMap.has(seat.member_id),
    }));

    // 키 순서 정렬도 계산 (실제 계산)
    const heightOrder = calculateHeightOrder(seatsForMetrics);

    // 파트장 위치 적절성 계산 (실제 계산)
    const leaderPosition = calculateLeaderPosition(seatsForMetrics);

    // 전체 품질 점수 (가중 평균)
    const qualityScore = (
      placementRate * 0.4 +        // 배치율 40%
      partBalance * 0.25 +         // 파트 균형 25%
      heightOrder * 0.2 +          // 키 순서 20%
      leaderPosition * 0.15        // 파트장 위치 15%
    );

    // 8. 응답 포맷팅 (camelCase로 변환)
    // AI 알고리즘은 1-based row/col을 반환
    // 프론트엔드(SeatSlot, Grid Calculator)도 1-based를 사용하므로 변환 불필요
    const formattedResponse = {
      seats: recommendation.seats.map(seat => ({
        memberId: seat.member_id,
        memberName: seat.member_name,
        row: seat.row,
        col: seat.col,
        part: seat.part
      })),
      gridLayout: {
        rows: recommendation.grid_layout.rows,
        rowCapacities: recommendation.grid_layout.row_capacities,
        zigzagPattern: recommendation.grid_layout.zigzag_pattern
      },
      metadata: {
        totalMembers: recommendation.metadata.total_members,
        breakdown: recommendation.metadata.breakdown,
        dataSource,  // 'db' 또는 'json' - 학습 데이터 소스
        preferencesLoaded: preferences.size,  // 로드된 선호 좌석 데이터 수
      },
      qualityScore,
      metrics: {
        placementRate,
        partBalance,
        heightOrder,       // 실제 계산된 값
        leaderPosition     // 실제 계산된 값
      },
      unassignedMembers: [],  // AI 알고리즘은 모든 멤버를 배치하므로 빈 배열
      source: 'typescript-rule-based' as const,
    };

    return NextResponse.json(formattedResponse);

  } catch (error) {
    console.error('Recommendation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
