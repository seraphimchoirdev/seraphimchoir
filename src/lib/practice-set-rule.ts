/**
 * 신입대원 연습 "세트" 판정 규칙 — 단일 출처.
 *
 * 세트 = 예배 전 연습 + 예배 후 연습 둘 다 참석. 신입대원은 정해진 세트 수를
 * 채워야 정대원으로 임명받고 등단할 수 있다.
 *
 * 이 프로젝트는 같은 도메인 규칙을 여러 곳에 하드코딩했다가 데이터가 오염된
 * 사고를 두 번 겪었다(후연습 플래그, 전연습 시각). 세트 판정을 화면·API·집계에
 * 각각 구현하면 세 번째가 된다. 카운트를 보여주는 모든 경로는 이 모듈을 거친다.
 */
import type { Database } from '@/types/database.types';

type PracticeAttendanceType = Database['public']['Enums']['practice_attendance_type'];

/**
 * 세트 판정에 필요한 최소 정보.
 *
 * attendances 행 전체가 아니라 필요한 네 필드만 받는다. 호출부가 뷰든 조인
 * 결과든 상관없이 쓸 수 있고, 테스트에서 행 전체를 지어낼 필요도 없다.
 */
export interface PracticeSetInput {
  /** 예배 전 연습 참석. NULL=미기록 (기록이 없으면 참석이 아니다) */
  pre_practice_attended: boolean | null;
  /** 예배 후 연습 참석 유형. NULL이거나 DEFAULT('ABSENT')일 수 있다 — 아래 주석 참고 */
  practice_status: PracticeAttendanceType | null;
  /** practice_status의 레거시 boolean 필드 */
  is_practice_attended: boolean | null;
  /** 이 예배에 후연습이 있는가 (service_schedules.has_post_practice) */
  has_post_practice: boolean | null;
}

/**
 * 예배 후 연습에 참석한 것으로 볼지 판정한다.
 *
 * 두 컬럼이 같은 사실을 다르게 표현하는데, **DEFAULT가 서로 정반대**라 단순한
 * 우선순위 규칙이 통하지 않는다:
 *   - practice_status      DEFAULT 'ABSENT'  (불참)
 *   - is_practice_attended DEFAULT true      (참석)
 *
 * 그래서 경로에 따라 두 값이 어긋난 행이 실제로 쌓여 있다. 운영 데이터 분포:
 *   FULL   + true  → 4866건  본인이 /my-attendance에서 투표한 정상 데이터
 *   ABSENT + false →  879건  진짜 불참
 *   ABSENT + true  →  177건  파트장이 출석 화면에서 저장 → status는 DEFAULT가 채움
 *
 * 세 번째가 문제다. AttendanceList의 저장 payload는 is_practice_attended만 보내고
 * practice_status를 보내지 않아서, DB DEFAULT인 'ABSENT'가 들어간다. 이 행들은
 * "불참"이 아니라 "후연습 상태를 세분해서 기록하지 않았을 뿐 참석"이다.
 *
 * 이 해석은 날짜별 분포로 확인했다. 177건이 특정 날짜에 몰려 있는데, 그중
 * 2026-03-01은 그날 기록 98건 전부, 2/22는 22건 전부, 2/15는 18건 전부가 이 상태다.
 * 찬양대 전원이 같은 날 연습에 빠졌을 리는 없고(주일 2부 예배는 등단하는 날이다),
 * 한 사람이 출석 화면에서 일괄 저장한 흔적으로 보는 것이 유일하게 말이 된다.
 * 반대로 2026-01-04은 100건 중 2건뿐인데, 그날은 대부분 본인이 투표해 FULL이 찍혔고
 * 2명만 파트장이 대신 체크한 것으로 읽힌다.
 *
 * 따라서 'ABSENT'일 때만 boolean으로 교차 검증한다. ABSENT는 DEFAULT 값이라
 * "진짜 불참"인지 "안 채워진 것"인지 구분되지 않는 유일한 값이고, 나머지 세 값
 * (FULL/EARLY_LEAVE/LATE_JOIN)은 사람이 명시적으로 고른 것이라 그대로 믿는다.
 *
 * 부분참석(앞부분만/뒷부분만)은 참석으로 인정한다 — 실제 운영이 그렇다.
 */
function isPostPracticeAttended(record: PracticeSetInput): boolean {
  const { practice_status, is_practice_attended } = record;

  if (practice_status !== null && practice_status !== 'ABSENT') {
    // FULL · EARLY_LEAVE · LATE_JOIN — 명시적으로 고른 값, 모두 참석 인정
    return true;
  }

  // practice_status가 NULL(레거시)이거나 'ABSENT'(DEFAULT일 수 있음)
  // → boolean으로 판단한다. NULL이면 참석 아님.
  return is_practice_attended === true;
}

/**
 * 하나의 출석 기록이 신입대원 "세트"로 성립하는지 판정한다.
 *
 * 후연습이 없는 예배(오후찬양예배·기도회 등)는 전연습만 나와도 세트가 아니다.
 * 세트의 정의 자체가 "전연습 + 후연습"이기 때문이다. 후연습은 주일 2부 예배에만
 * 있으므로(src/lib/service-time.ts) 사실상 주일 2부 예배만 세트로 카운트된다.
 *
 * 전연습 기록이 없으면(NULL) 세트가 아니다. 파트장이 적극적으로 체크하는
 * 항목이라, 기록 없음은 "참석"이 아니라 "아직 확인 안 됨"이다.
 */
export function isPracticeSetComplete(record: PracticeSetInput): boolean {
  // 후연습이 없는 예배는 세트를 구성할 수 없다
  if (record.has_post_practice !== true) return false;

  // 전연습은 boolean — 부분 참석 개념이 없다. NULL(미기록)은 불성립.
  if (record.pre_practice_attended !== true) return false;

  return isPostPracticeAttended(record);
}

/**
 * 출석 기록 목록에서 완성된 세트 수를 센다.
 */
export function countPracticeSets(records: PracticeSetInput[]): number {
  return records.filter(isPracticeSetComplete).length;
}

/** 필요 세트 수의 기본값. members.required_practice_sets 컬럼 DEFAULT와 일치해야 한다. */
export const DEFAULT_REQUIRED_PRACTICE_SETS = 4;

/** 폼에서 고를 수 있는 세트 수. 입단일로부터 2~4주라는 폭을 지휘자가 판단해 정한다. */
export const REQUIRED_PRACTICE_SETS_OPTIONS = [2, 3, 4, 5, 6] as const;
