import type { APIRequestContext } from '@playwright/test';

/**
 * E2E 전용 테스트 데이터 헬퍼
 *
 * seed 데이터의 배치표/일정은 프로덕션 덤프 기반 UUID라 예측이 불가능하므로,
 * 핵심 플로우 E2E는 전용 예배 일정을 API로 생성해 결정적으로 테스트한다.
 * (로컬 Supabase 대상 — storageState의 admin 세션 쿠키로 인증)
 */

/** 다가오는 주일(오늘이 주일이면 오늘) + offsetWeeks 주 뒤의 YYYY-MM-DD */
export function upcomingSundayISO(offsetWeeks = 0): string {
  const d = new Date();
  const day = d.getDay();
  if (day !== 0) {
    d.setDate(d.getDate() + (7 - day));
  }
  d.setDate(d.getDate() + offsetWeeks * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export interface EnsuredSchedule {
  id: string;
  date: string;
  /** 이번 실행에서 새로 생성했는지 (true면 cleanup 대상) */
  created: boolean;
}

/**
 * 해당 날짜 + service_type의 예배 일정을 찾고, 없으면 생성한다.
 * service_type은 스펙별로 고유하게 지정해 (date, service_type) 충돌과
 * 스펙 간 데이터 간섭을 방지한다.
 */
export async function ensureSchedule(
  api: APIRequestContext,
  date: string,
  serviceType: string
): Promise<EnsuredSchedule> {
  const listRes = await api.get(`/api/service-schedules?date=${date}`);
  if (listRes.ok()) {
    const body = await listRes.json();
    const rows: Array<{ id: string; service_type: string | null }> = body.data ?? [];
    const existing = rows.find((s) => s.service_type === serviceType);
    if (existing) {
      return { id: existing.id, date, created: false };
    }
  }

  const createRes = await api.post('/api/service-schedules', {
    data: { date, service_type: serviceType },
  });
  if (createRes.status() !== 201) {
    throw new Error(
      `E2E 예배 일정 생성 실패 (${createRes.status()}): ${await createRes.text()}`
    );
  }
  const created = await createRes.json();
  return { id: created.id, date, created: true };
}

/** best-effort 정리 — 로컬 DB이므로 실패해도 db reset으로 복구 가능 */
export async function cleanupSchedule(api: APIRequestContext, schedule: EnsuredSchedule | null) {
  if (schedule?.created) {
    await api.delete(`/api/service-schedules/${schedule.id}`).catch(() => {});
  }
}

export async function cleanupArrangement(api: APIRequestContext, arrangementId: string | null) {
  if (arrangementId) {
    await api.delete(`/api/arrangements/${arrangementId}`).catch(() => {});
  }
}
