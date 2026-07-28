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
