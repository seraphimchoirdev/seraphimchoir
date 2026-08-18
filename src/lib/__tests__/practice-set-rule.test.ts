/**
 * 신입대원 세트 판정 규칙 회귀 테스트.
 *
 * 세트 카운트는 정대원 승격 근거로 담당자에게 보여지는 숫자다. 규칙이 조용히
 * 바뀌면 "4세트 채웠다"고 표시된 대원이 실제로는 안 채웠거나 그 반대가 된다.
 * 화면에서 눈으로 확인하기 어려운 종류의 오류라 여기서 고정한다.
 */
import {
  countPracticeSets,
  isPracticeSetComplete,
  type PracticeSetInput,
} from '@/lib/practice-set-rule';

/** 세트가 성립하는 기본 상태 — 각 테스트는 여기서 한 필드만 바꿔 의도를 드러낸다 */
const 세트성립: PracticeSetInput = {
  pre_practice_attended: true,
  practice_status: 'FULL',
  is_practice_attended: true,
  has_post_practice: true,
};

const 기록 = (덮어쓰기: Partial<PracticeSetInput>): PracticeSetInput => ({
  ...세트성립,
  ...덮어쓰기,
});

describe('세트 판정 — 후연습 참석 유형', () => {
  // 사용자 확인 완료: 성실히 나왔는데 앞부분만/뒷부분만 참석한 것은 세트로 인정한다.
  it('부분참석(앞부분만·뒷부분만)도 세트로 인정한다', () => {
    expect(isPracticeSetComplete(기록({ practice_status: 'FULL' }))).toBe(true);
    expect(isPracticeSetComplete(기록({ practice_status: 'EARLY_LEAVE' }))).toBe(true);
    expect(isPracticeSetComplete(기록({ practice_status: 'LATE_JOIN' }))).toBe(true);
  });

  it('불참은 세트가 아니다', () => {
    expect(
      isPracticeSetComplete(기록({ practice_status: 'ABSENT', is_practice_attended: false }))
    ).toBe(false);
  });
});

describe('세트 판정 — practice_status와 is_practice_attended의 DEFAULT 충돌', () => {
  // 두 컬럼의 DB DEFAULT가 정반대다(practice_status='ABSENT', is_practice_attended=true).
  // 저장 경로에 따라 어느 쪽이 채워졌는지가 달라서, 단순 우선순위 규칙은 판정을 뒤집는다.

  // 운영 데이터 177건이 이 상태다. AttendanceList의 payload가 boolean만 보내서
  // practice_status에 DEFAULT 'ABSENT'가 들어간 행들 — 불참이 아니라 "세분 기록 안 함"이다.
  it('ABSENT + is_practice_attended=true는 참석으로 본다 (DEFAULT가 채운 값)', () => {
    expect(
      isPracticeSetComplete(기록({ practice_status: 'ABSENT', is_practice_attended: true }))
    ).toBe(true);
  });

  it('practice_status가 NULL이면 is_practice_attended로 판단한다 (레거시 데이터)', () => {
    expect(
      isPracticeSetComplete(기록({ practice_status: null, is_practice_attended: true }))
    ).toBe(true);
    expect(
      isPracticeSetComplete(기록({ practice_status: null, is_practice_attended: false }))
    ).toBe(false);
  });

  it('둘 다 비어 있으면 세트가 아니다', () => {
    expect(
      isPracticeSetComplete(기록({ practice_status: null, is_practice_attended: null }))
    ).toBe(false);
  });

  // FULL/EARLY_LEAVE/LATE_JOIN은 사람이 명시적으로 고른 값이므로 boolean이 어긋나도 믿는다.
  it('명시적으로 고른 참석 유형은 boolean이 어긋나도 참석으로 본다', () => {
    expect(
      isPracticeSetComplete(기록({ practice_status: 'LATE_JOIN', is_practice_attended: false }))
    ).toBe(true);
  });
});

describe('세트 판정 — 전연습', () => {
  it('전연습에 빠지면 후연습을 나와도 세트가 아니다', () => {
    expect(isPracticeSetComplete(기록({ pre_practice_attended: false }))).toBe(false);
  });

  // 전연습은 파트장이 적극적으로 체크하는 항목이라, 기록이 없다는 건
  // "참석했다"가 아니라 "아직 확인 안 됐다"이다. is_service_available 계열의
  // "레코드 없음 = 참석" 규약을 여기에 적용하면 세트가 부풀려진다.
  it('전연습 기록이 없으면(NULL) 세트가 아니다', () => {
    expect(isPracticeSetComplete(기록({ pre_practice_attended: null }))).toBe(false);
  });
});

describe('세트 판정 — 후연습이 없는 예배', () => {
  // 세트의 정의가 "전연습 + 후연습"이므로, 후연습 자체가 없는 예배
  // (오후찬양예배·기도회 등)는 전연습을 나와도 세트를 구성할 수 없다.
  it('후연습이 없는 예배는 전연습을 나와도 세트가 아니다', () => {
    expect(isPracticeSetComplete(기록({ has_post_practice: false }))).toBe(false);
    expect(isPracticeSetComplete(기록({ has_post_practice: null }))).toBe(false);
  });
});

describe('countPracticeSets', () => {
  it('완성된 세트만 센다', () => {
    const 기록들: PracticeSetInput[] = [
      기록({}), // 성립
      기록({ practice_status: 'LATE_JOIN' }), // 성립 (부분참석)
      기록({ pre_practice_attended: false }), // 불성립 (전연습 결석)
      기록({ has_post_practice: false }), // 불성립 (후연습 없는 예배)
      기록({ practice_status: 'ABSENT', is_practice_attended: false }), // 불성립 (불참)
    ];
    expect(countPracticeSets(기록들)).toBe(2);
  });

  it('기록이 없으면 0세트다', () => {
    expect(countPracticeSets([])).toBe(0);
  });
});
