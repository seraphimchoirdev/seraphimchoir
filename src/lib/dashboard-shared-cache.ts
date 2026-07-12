import 'server-only';

import { revalidateTag, unstable_cache } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/server';

/**
 * 대시보드 전 사용자 공유 데이터 캐시 (코드 리뷰 B9)
 *
 * 다음 주일의 예배 일정·투표 마감·배치표는 사용자와 무관하게 동일한데도
 * 매 요청(사용자 수 × 카드 수 × 60초 폴링)마다 DB를 조회하고 있었다.
 * unstable_cache는 Vercel Data Cache에 저장되어 서버리스 인스턴스 간에
 * 공유되므로 콜드스타트 인스턴스도 캐시 히트를 볼 수 있다 (TTFB 개선).
 *
 * 무효화 전략:
 * - 태그(DASHBOARD_SHARED_TAG): 일정/배치표를 변경하는 API 라우트에서
 *   revalidateDashboardShared() 호출 → 즉시 반영
 * - revalidate 60초: 안전망. 투표 마감(attendance_vote_deadlines)은
 *   클라이언트에서 Supabase로 직접 쓰기 때문에 서버 태그 무효화가 닿지
 *   않는다 — 이 경로의 낡은 데이터는 최대 60초로, 대시보드 폴링 주기와
 *   같아 기존 사용자 경험과 동일한 지연이다.
 */

export const DASHBOARD_SHARED_TAG = 'dashboard-shared';
const REVALIDATE_SECONDS = 60;

export interface SharedServiceSchedule {
  id: string;
  service_type: string;
  hymn_name: string | null;
  hood_color: string | null;
  service_start_time: string | null;
  pre_practice_start_time: string | null;
  [key: string]: unknown;
}

export interface SharedArrangement {
  id: string;
  date: string;
  title: string | null;
  status: 'DRAFT' | 'SHARED' | 'CONFIRMED' | null;
}

export interface SharedDashboardData {
  serviceSchedules: SharedServiceSchedule[];
  voteDeadlineAt: string | null;
  arrangement: SharedArrangement | null;
}

function createCachedFetcher(date: string) {
  return unstable_cache(
    async (): Promise<SharedDashboardData> => {
      // createAdminClient는 cookies()를 읽지 않으므로 unstable_cache 안에서 안전
      const admin = await createAdminClient();

      const [schedulesResult, deadlineResult, arrangementResult] = await Promise.all([
        admin
          .from('service_schedules')
          .select('*')
          .eq('date', date)
          .order('service_start_time', { ascending: true, nullsFirst: false }),

        admin
          .from('attendance_vote_deadlines')
          .select('deadline_at')
          .eq('service_date', date)
          .maybeSingle(),

        admin
          .from('arrangements')
          .select('id, date, title, status')
          .eq('date', date)
          .maybeSingle(),
      ]);

      return {
        serviceSchedules: (schedulesResult.data as SharedServiceSchedule[]) ?? [],
        voteDeadlineAt: deadlineResult.data?.deadline_at ?? null,
        arrangement: (arrangementResult.data as SharedArrangement | null) ?? null,
      };
    },
    // 키에 날짜 포함 — 주가 바뀌면 자연히 새 엔트리 사용
    ['dashboard-shared', date],
    { revalidate: REVALIDATE_SECONDS, tags: [DASHBOARD_SHARED_TAG] }
  );
}

/** 해당 날짜(주일)의 공유 대시보드 데이터를 캐시 경유로 조회한다. */
export function getSharedDashboardData(date: string): Promise<SharedDashboardData> {
  return createCachedFetcher(date)();
}

/**
 * 예배 일정·배치표를 변경하는 API 라우트에서 성공 후 호출해
 * 전 인스턴스의 공유 캐시를 즉시 무효화한다.
 */
export function revalidateDashboardShared(): void {
  try {
    // Next 16 시그니처: 두 번째 인자는 클라이언트 stale 허용 프로파일 — 'max'가 기존 즉시 만료 동작
    revalidateTag(DASHBOARD_SHARED_TAG, 'max');
  } catch (error) {
    // 무효화 실패가 본 요청(일정/배치표 저장)을 실패시키면 안 된다.
    // 실패해도 revalidate 60초 안전망이 낡은 데이터를 회수한다.
    console.warn('[dashboard-shared-cache] 캐시 무효화 실패:', error);
  }
}
