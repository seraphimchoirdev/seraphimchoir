/**
 * 예배 종류 선택지 — 단일 출처.
 *
 * 이 목록은 원래 화면마다 따로 있었고, 그래서 서로 어긋나 있었다:
 *   - ServiceScheduleForm     주일 2부 예배 / 오후찬양예배 / 절기찬양예배 / 기도회 / 기타
 *   - ServiceScheduleImporter 주일 2부 예배 / 오후찬양예배 / 절기찬양예배 /
 *                             찬양대연합예배 / 기도회 / 구국기도회  ('기타' 없음)
 *
 * 같은 일정을 정식 폼으로 만들 때와 일괄 등록으로 만들 때 고를 수 있는 값이
 * 달랐다는 뜻이다. 특히 일괄 등록에 '기타'가 없어서, OCR이 프리셋 밖의 값을
 * 뽑아오면(추수감사주일 찬양예배 등) 드롭다운을 한 번 건드리는 순간 원본이
 * 버려지고 6개 중 하나로 바뀌었다.
 *
 * 아래 DEFAULT_SERVICE_START_TIME 주석이 원래 "키는 ServiceScheduleForm의
 * SERVICE_TYPE_OPTIONS와 정확히 일치해야 한다"고 요구하고 있었는데, 목록이
 * 컴포넌트에 있는 한 그건 지켜지기를 바랄 수만 있는 규칙이었다. 목록을 시각·
 * 후연습 규칙과 같은 파일에 두어 실제로 강제한다.
 *
 * label을 따로 두는 이유는 화면 표기에 공백이 들어가기 때문이다("오후 찬양예배").
 * value가 DB에 저장되는 값이므로 label을 바꿔도 데이터에는 영향이 없다.
 */
export const SERVICE_TYPE_OPTIONS = [
  { value: '주일 2부 예배', label: '주일 2부 예배' },
  { value: '오후찬양예배', label: '오후 찬양예배' },
  { value: '절기찬양예배', label: '절기 찬양예배' },
  { value: '찬양대연합예배', label: '찬양대 연합예배' },
  { value: '기도회', label: '기도회' },
  { value: '구국기도회', label: '구국기도회' },
  { value: '기타', label: '기타' },
] as const;

/**
 * '기타'의 value. 이 값은 실제 예배 종류가 아니라 "프리셋에 없으니 직접 입력하겠다"는
 * 신호이므로, 저장 전에 사용자가 입력한 문자열로 교체되어야 한다.
 */
export const CUSTOM_SERVICE_TYPE = '기타';

/**
 * 프리셋 목록에 있는 값인지 판정한다.
 *
 * 저장된 일정을 다시 열 때 쓴다 — 프리셋에 없는 값이면 '기타'(자유 입력) 모드로
 * 열어야 원본을 보존한 채 수정할 수 있다.
 */
export function isPresetServiceType(value: string | null | undefined): boolean {
  return SERVICE_TYPE_OPTIONS.some((opt) => opt.value === value);
}

/**
 * 예배 종류별 기본 시작 시간
 *
 * 이 매핑은 원래 SQL 마이그레이션의 일회성 UPDATE 문 안에만 존재했다.
 * 그 결과 앱은 예배 종류를 알면서도 시작 시간을 채울 방법이 없었고,
 * 신규 일정은 컬럼 DEFAULT('14:00')를 그대로 물려받는 버그가 반복됐다.
 * 도메인 규칙을 앱 코드로 가져와 폼에서 기본값을 채울 수 있게 한다.
 *
 * 키는 SERVICE_TYPE_OPTIONS의 value와 일치해야 한다. 모든 종류에 값이 있을
 * 필요는 없다 — 없으면 null이 반환되고 사용자가 직접 입력한다.
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
 *
 * 목록을 SERVICE_TYPE_OPTIONS로 통합하면서 선택지가 늘었지만(찬양대연합예배·
 * 구국기도회·기타) 이 배열은 그대로 둔다. 후연습은 주일 2부 예배의 고유 일정이고,
 * 여기에 종류를 더하면 신입대원 연습 세트 카운팅(practice-set-rule.ts)이 곧바로
 * 영향을 받는다 — 실제 운영 규칙이 바뀌기 전에는 건드리지 않는다.
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

/**
 * 예배 종류별 예배 전 연습 시작 시각.
 *
 * 실제 운영값에서 뽑았다 — 이 세 종류는 시각이 하나로 일관되게 수렴해 있었다.
 *
 * 절기찬양예배는 일부러 뺐다. 절기에 따라 주일 오후 찬양예배를 대신하기도 하고
 * 평일 저녁에 열리기도 해서, 종류만으로 시각을 정할 수 없다. 매핑에 없으면
 * null이 반환되고 관리자가 직접 입력하게 된다 — 틀린 시각을 자동으로 채워
 * 넣는 것보다 비워두는 편이 안전하다.
 *
 * 주의: pre_practice_minutes_before(60)로 계산하면 안 된다. 주일 2부 예배는
 * 09:00 시작인데 전연습은 07:30이라 실제로는 90분 전이고, 그 60이라는 값은
 * 폼과 파서에 하드코딩만 돼 있을 뿐 어디서도 읽히지 않는 죽은 값이다.
 * 화면(dashboard-data.ts)이 읽는 것은 pre_practice_start_time 컬럼이다.
 */
export const DEFAULT_PRE_PRACTICE_START_TIME: Record<string, string> = {
  '주일 2부 예배': '07:30',
  오후찬양예배: '16:00',
  기도회: '05:30',
  // 절기찬양예배·'기타'는 시각이 일정하지 않아 기본값을 두지 않음
};

/**
 * 예배 종류에 대응하는 전연습 시작 시각을 반환한다.
 * 프리셋에 없는 종류는 null을 반환해 사용자 입력에 맡긴다.
 */
export function getDefaultPrePracticeStartTime(
  serviceType: string | null | undefined
): string | null {
  if (!serviceType) return null;
  return DEFAULT_PRE_PRACTICE_START_TIME[serviceType] ?? null;
}
