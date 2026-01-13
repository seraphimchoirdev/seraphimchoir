/**
 * Part Placement Rules Loader
 *
 * 학습된 파트 배치 규칙을 DB에서 로드하거나 기본값을 반환합니다.
 * AI 자동배치 및 과거배치 적용 시 사용됩니다.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { DEFAULT_PART_ZONES, type PartZone } from './part-zone-analyzer';
import { getMemberCountRange } from './part-placement-learner';

type Part = Database['public']['Enums']['part'];

/** DB에서 로드된 규칙 (테이블 Row 타입) */
interface LearnedPartPlacementRuleRow {
    id: string;
    service_type: string;
    member_count_range: string;
    part: Part;
    side: 'left' | 'right' | 'both';
    preferred_rows: number[];
    overflow_rows: number[];
    forbidden_rows: number[];
    row_distribution: Record<string, number>;
    side_percentage: number;
    front_row_percentage: number;
    sample_count: number;
    total_seats_analyzed: number;
    confidence_score: number | null;
    last_learned_at: string;
    created_at: string;
}

/** 규칙 로드 파라미터 */
export interface LoadRulesParams {
    /** 예배 유형 (예: '2부예배', '온세대예배') */
    serviceType: string;
    /** 총 인원수 */
    totalMembers: number;
}

/** 규칙 로드 결과 */
export interface LoadedRulesResult {
    /** 파트별 배치 규칙 */
    rules: Record<Part, PartPlacementRule>;
    /** 규칙 소스 ('learned' | 'default') */
    source: 'learned' | 'default';
    /** 학습 규칙 신뢰도 (학습 규칙일 때만 의미 있음) */
    confidenceScore?: number;
    /** 로드된 그룹 정보 (디버깅용) */
    loadedGroup?: {
        serviceType: string;
        memberCountRange: string;
    };
}

/** 파트 배치 규칙 (알고리즘에서 사용하는 형태) */
export interface PartPlacementRule {
    /** 선호 측면 */
    side: 'left' | 'right' | 'both';
    /** 선호 행 (빈도 내림차순) */
    preferredRows: number[];
    /** 오버플로우 행 (5% 미만 배치) */
    overflowRows: number[];
    /** 금지 행 (0% 배치) - 학습된 값 */
    forbiddenRows?: number[];
}

// ============================================================================
// 기본 규칙 (학습 데이터 없을 때 사용)
// ============================================================================

/**
 * DEFAULT_PART_ZONES를 PartPlacementRule 형태로 변환
 */
function getDefaultRules(): Record<Part, PartPlacementRule> {
    const defaultRules: Record<Part, PartPlacementRule> = {} as Record<Part, PartPlacementRule>;

    for (const [part, zone] of Object.entries(DEFAULT_PART_ZONES) as [Part, PartZone][]) {
        // preferredRows에서 forbiddenRows를 제외하여 선호행 계산
        const preferredRows = zone.preferredRows.filter(
            (r) => !zone.forbiddenRows.includes(r)
        );

        // overflowRows는 기본적으로 allowedRows 범위 내 선호행 외의 행
        const allRows = Array.from(
            { length: zone.allowedRows[1] - zone.allowedRows[0] + 1 },
            (_, i) => zone.allowedRows[0] + i
        );
        let overflowRows = allRows.filter(
            (r) => !preferredRows.includes(r) && !zone.forbiddenRows.includes(r)
        );

        // BASS 특별 처리: 4-6행 선호, 3-1행은 오버플로우로 추가
        // (인원이 많아 4-6행이 부족할 때만 3행 이하 사용)
        if (part === 'BASS') {
            overflowRows = [3, 2, 1];
        }

        defaultRules[part] = {
            side: zone.side,
            preferredRows,
            overflowRows,
            forbiddenRows: zone.forbiddenRows,
        };
    }

    return defaultRules;
}

// ============================================================================
// 메인 로더 함수
// ============================================================================

/**
 * 학습된 파트 배치 규칙 로드
 *
 * 로드 우선순위:
 * 1. DB에서 service_type + member_count_range 매칭 규칙 조회
 * 2. 없으면 DEFAULT_PART_ZONES 사용 (기존 하드코딩 값)
 *
 * @param supabase - Supabase 클라이언트
 * @param params - 로드 파라미터 (serviceType, totalMembers)
 * @returns 파트별 배치 규칙 및 메타데이터
 */
export async function loadPartPlacementRules(
    supabase: SupabaseClient<Database>,
    params: LoadRulesParams
): Promise<LoadedRulesResult> {
    const { serviceType, totalMembers } = params;
    const memberCountRange = getMemberCountRange(totalMembers);

    try {
        // DB에서 학습된 규칙 조회
        // Note: 마이그레이션 적용 후 타입 재생성 필요 (npx supabase gen types typescript)
        const { data, error } = await supabase
            .from('learned_part_placement_rules' as 'arrangements')
            .select('*')
            .eq('service_type' as 'id', serviceType)
            .eq('member_count_range' as 'id', memberCountRange) as unknown as {
                data: LearnedPartPlacementRuleRow[] | null;
                error: { message: string } | null;
            };

        if (error) {
            console.warn('[loadPartPlacementRules] DB 조회 오류, 기본값 사용:', error.message);
            return {
                rules: getDefaultRules(),
                source: 'default',
            };
        }

        // 데이터가 없으면 기본값 사용
        if (!data || data.length === 0) {
            console.log(
                `[loadPartPlacementRules] 학습 데이터 없음 (${serviceType}, ${memberCountRange}), 기본값 사용`
            );
            return {
                rules: getDefaultRules(),
                source: 'default',
            };
        }

        // DB 데이터를 PartPlacementRule 형태로 변환
        const rules = convertDbRowsToRules(data as LearnedPartPlacementRuleRow[]);

        // 평균 신뢰도 계산
        const avgConfidence = calculateAverageConfidence(data as LearnedPartPlacementRuleRow[]);

        console.log(
            `[loadPartPlacementRules] 학습 규칙 로드 성공 (${serviceType}, ${memberCountRange}), ` +
            `신뢰도: ${(avgConfidence * 100).toFixed(1)}%`
        );

        return {
            rules,
            source: 'learned',
            confidenceScore: avgConfidence,
            loadedGroup: {
                serviceType,
                memberCountRange,
            },
        };
    } catch (err) {
        console.error('[loadPartPlacementRules] 예외 발생, 기본값 사용:', err);
        return {
            rules: getDefaultRules(),
            source: 'default',
        };
    }
}

/**
 * DB Row 배열을 Record<Part, PartPlacementRule>로 변환
 */
function convertDbRowsToRules(
    rows: LearnedPartPlacementRuleRow[]
): Record<Part, PartPlacementRule> {
    const rules: Record<Part, PartPlacementRule> = {} as Record<Part, PartPlacementRule>;

    // 기본값으로 초기화 (학습 데이터 없는 파트용)
    const defaultRules = getDefaultRules();
    for (const part of ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as Part[]) {
        rules[part] = defaultRules[part];
    }

    // 학습된 규칙으로 덮어쓰기
    for (const row of rows) {
        rules[row.part] = {
            side: row.side,
            preferredRows: row.preferred_rows || [],
            overflowRows: row.overflow_rows || [],
            forbiddenRows: row.forbidden_rows || [],
        };
    }

    return rules;
}

/**
 * 평균 신뢰도 계산
 */
function calculateAverageConfidence(rows: LearnedPartPlacementRuleRow[]): number {
    if (rows.length === 0) return 0;

    const totalConfidence = rows.reduce(
        (sum, row) => sum + (row.confidence_score || 0),
        0
    );
    return totalConfidence / rows.length;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 규칙 유효성 검사
 *
 * 학습된 규칙이 합리적인지 검증
 * - 선호 행이 최소 1개 이상
 * - 신뢰도 점수가 임계값 이상
 */
export function isRuleValid(
    rule: PartPlacementRule,
    confidenceThreshold: number = 0.3
): boolean {
    // 선호 행이 없으면 유효하지 않음
    if (!rule.preferredRows || rule.preferredRows.length === 0) {
        return false;
    }

    return true;
}

/**
 * 학습 규칙과 기본 규칙 병합
 *
 * 학습 규칙의 신뢰도가 낮으면 기본 규칙의 일부 속성을 사용
 */
export function mergeWithDefaultRules(
    learnedRules: Record<Part, PartPlacementRule>,
    confidenceScore: number,
    threshold: number = 0.5
): Record<Part, PartPlacementRule> {
    // 신뢰도가 충분히 높으면 학습 규칙 그대로 사용
    if (confidenceScore >= threshold) {
        return learnedRules;
    }

    // 신뢰도가 낮으면 기본 규칙과 병합
    const defaultRules = getDefaultRules();
    const mergedRules: Record<Part, PartPlacementRule> = {} as Record<Part, PartPlacementRule>;

    for (const part of ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] as Part[]) {
        const learned = learnedRules[part];
        const defaultRule = defaultRules[part];

        // 학습 규칙이 유효하면 사용, 아니면 기본값
        if (isRuleValid(learned)) {
            mergedRules[part] = learned;
        } else {
            mergedRules[part] = defaultRule;
        }
    }

    return mergedRules;
}

/**
 * 캐시된 규칙 로더 생성 (동일 요청 반복 방지)
 *
 * 같은 serviceType + totalMembers 조합에 대해 캐시된 결과 반환
 */
export function createCachedRulesLoader(supabase: SupabaseClient<Database>) {
    const cache = new Map<string, LoadedRulesResult>();

    return async (params: LoadRulesParams): Promise<LoadedRulesResult> => {
        const cacheKey = `${params.serviceType}::${getMemberCountRange(params.totalMembers)}`;

        if (cache.has(cacheKey)) {
            return cache.get(cacheKey)!;
        }

        const result = await loadPartPlacementRules(supabase, params);
        cache.set(cacheKey, result);

        return result;
    };
}
