/**
 * 예배 종류별 기본 시작 시간
 *
 * 이 매핑은 원래 SQL 마이그레이션의 일회성 UPDATE 문 안에만 존재했다.
 * 그 결과 앱은 예배 종류를 알면서도 시작 시간을 채울 방법이 없었고,
 * 신규 일정은 컬럼 DEFAULT('14:00')를 그대로 물려받는 버그가 반복됐다.
 * 도메인 규칙을 앱 코드로 가져와 폼에서 기본값을 채울 수 있게 한다.
 *
 * 키는 ServiceScheduleForm의 SERVICE_TYPE_OPTIONS와 정확히 일치해야 한다.
 */
export const DEFAULT_SERVICE_START_TIME: Record<string, string> = {
  '주일 2부 예배': '09:00',
  오후찬양예배: '17:00',
  절기찬양예배: '17:00',
  기도회: '19:30',
  // '기타'는 자유 입력이라 기본값을 정할 수 없음 — 사용자가 직접 입력
};

/**
 * 예배 종류에 대응하는 기본 시작 시간을 반환한다.
 * 프리셋에 없는 종류('기타'로 직접 입력한 값 등)는 null을 반환해
 * 사용자 입력에 맡긴다.
 */
export function getDefaultServiceStartTime(
  serviceType: string | null | undefined
): string | null {
  if (!serviceType) return null;
  return DEFAULT_SERVICE_START_TIME[serviceType] ?? null;
}

/**
 * DB의 TIME 컬럼값(`09:00:00`)을 <input type="time">이 요구하는
 * `HH:mm` 형식으로 정규화한다. 빈 값은 빈 문자열로 돌려준다.
 */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

/**
 * 예배 후 연습이 있는 예배 종류.
 *
 * 주일 2부 예배에만 예배 후 연습이 있다. 그 외(오후찬양예배·절기찬양예배·
 * 기도회·각종 특별예배)는 예배 전 연습만 하고 등단으로 끝난다.
 *
 * 이 규칙이 과거 세 곳에 각각 다르게 박혀 있었고, 그 불일치가
 * 데이터 오염의 원인이었다:
 *   - DB 컬럼 DEFAULT       → 무조건 true
 *   - ServiceScheduleForm   → 주일 2부 예배만
 *   - parseScheduleTable    → 주일 2부 예배 + 절기찬양예배 (오판)
 * 여기를 단일 출처로 삼아 세 경로가 같은 답을 내도록 한다.
 *
 * 예배 전 연습은 모든 예배에 있으므로 대응하는 상수를 두지 않는다
 * (has_pre_practice는 항상 true).
 */
export const POST_PRACTICE_SERVICE_TYPES = ['주일 2부 예배'];

/**
 * 해당 예배 종류에 예배 후 연습이 있는지 판정한다.
 *
 * service_type은 '기타' 선택 시 자유 입력이 가능하므로 프리셋에 없는 값
 * ('추수감사주일 찬양예배', '온세대예배' 등)이 들어온다. 목록에 없으면
 * 후연습 없음으로 본다 — 후연습은 주일 2부 예배의 고유 일정이라
 * 모르는 종류에 있다고 가정하는 쪽이 더 위험하다.
 */
export function hasPostPractice(serviceType: string | null | undefined): boolean {
  if (!serviceType) return false;
  return POST_PRACTICE_SERVICE_TYPES.includes(serviceType);
}
