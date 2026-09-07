/**
 * 예배 종류 도메인 규칙 테스트
 *
 * 이 모듈이 단일 출처인 이유가 곧 테스트가 필요한 이유다. 예배 종류 목록과
 * 후연습 판정이 화면마다 따로 박혀 있다가 어긋나서 데이터가 오염된 이력이 있고
 * (service-time.ts 주석 참고), 그 불일치는 화면에서 티가 나지 않는 종류였다.
 *
 * 특히 hasPostPractice는 신입대원 연습 세트 카운팅(practice-set-rule.ts)의
 * 입력이라, 여기가 틀리면 "승격시켜도 되는가"의 근거 숫자가 조용히 틀린다.
 */
import {
  CUSTOM_SERVICE_TYPE,
  DEFAULT_PRE_PRACTICE_START_TIME,
  DEFAULT_SERVICE_START_TIME,
  SERVICE_TYPE_OPTIONS,
  getDefaultPrePracticeStartTime,
  getDefaultServiceStartTime,
  hasPostPractice,
  isPresetServiceType,
  toTimeInputValue,
} from '../service-time';

describe('SERVICE_TYPE_OPTIONS', () => {
  it('통합 전 두 화면의 선택지를 모두 포함한다', () => {
    const values = SERVICE_TYPE_OPTIONS.map((o) => o.value);

    // ServiceScheduleForm에만 있던 값
    expect(values).toContain('기타');
    // ServiceScheduleImporter에만 있던 값 — 이 값으로 저장된 기존 일정이
    // 드롭다운에서 다시 선택 가능해야 한다
    expect(values).toContain('찬양대연합예배');
    expect(values).toContain('구국기도회');
  });

  it('value가 중복되지 않는다', () => {
    const values = SERVICE_TYPE_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  // 시각 매핑의 키가 목록에 없는 종류를 가리키면, 그 기본값은 영원히 쓰이지 않는
  // 죽은 값이 된다. 오타로 인한 조용한 실패를 여기서 잡는다.
  it('시각 매핑의 키가 모두 선택지에 존재한다', () => {
    const values = SERVICE_TYPE_OPTIONS.map((o) => o.value) as readonly string[];

    for (const key of Object.keys(DEFAULT_SERVICE_START_TIME)) {
      expect(values).toContain(key);
    }
    for (const key of Object.keys(DEFAULT_PRE_PRACTICE_START_TIME)) {
      expect(values).toContain(key);
    }
  });
});

describe('isPresetServiceType', () => {
  it('프리셋에 있는 값을 인식한다', () => {
    expect(isPresetServiceType('주일 2부 예배')).toBe(true);
    expect(isPresetServiceType('구국기도회')).toBe(true);
  });

  // OCR이 뽑아온 자유 문자열이 여기로 들어온다. false여야 화면이 '기타'
  // 모드로 열려 원본을 보존한다.
  it('프리셋에 없는 값은 false', () => {
    expect(isPresetServiceType('추수감사주일 찬양예배')).toBe(false);
    expect(isPresetServiceType('온세대예배')).toBe(false);
  });

  it('null·undefined·빈 문자열은 false', () => {
    expect(isPresetServiceType(null)).toBe(false);
    expect(isPresetServiceType(undefined)).toBe(false);
    expect(isPresetServiceType('')).toBe(false);
  });
});

describe('hasPostPractice', () => {
  it('주일 2부 예배만 후연습이 있다', () => {
    expect(hasPostPractice('주일 2부 예배')).toBe(true);
  });

  it('그 외 예배는 후연습이 없다', () => {
    expect(hasPostPractice('오후찬양예배')).toBe(false);
    expect(hasPostPractice('절기찬양예배')).toBe(false);
    expect(hasPostPractice('기도회')).toBe(false);
    expect(hasPostPractice('찬양대연합예배')).toBe(false);
    expect(hasPostPractice('구국기도회')).toBe(false);
  });

  // '기타'는 실제 예배 종류가 아니라 자유 입력 신호다. 후연습을 붙이면
  // 신입대원 세트가 부풀려지므로 반드시 false여야 한다.
  it("'기타'와 자유 입력 값은 후연습이 없다", () => {
    expect(hasPostPractice(CUSTOM_SERVICE_TYPE)).toBe(false);
    expect(hasPostPractice('추수감사주일 찬양예배')).toBe(false);
  });

  it('null·undefined는 후연습 없음으로 본다', () => {
    expect(hasPostPractice(null)).toBe(false);
    expect(hasPostPractice(undefined)).toBe(false);
  });
});

describe('getDefaultServiceStartTime', () => {
  it('프리셋 종류의 기본 시각을 반환한다', () => {
    expect(getDefaultServiceStartTime('주일 2부 예배')).toBe('09:00');
    expect(getDefaultServiceStartTime('기도회')).toBe('19:30');
  });

  // 틀린 시각을 자동으로 채우는 것보다 비워두고 사용자가 넣게 하는 편이 안전하다.
  it('기본값이 없는 종류는 null', () => {
    expect(getDefaultServiceStartTime('기타')).toBeNull();
    expect(getDefaultServiceStartTime('추수감사주일 찬양예배')).toBeNull();
    expect(getDefaultServiceStartTime(null)).toBeNull();
  });
});

describe('getDefaultPrePracticeStartTime', () => {
  it('프리셋 종류의 전연습 시각을 반환한다', () => {
    expect(getDefaultPrePracticeStartTime('주일 2부 예배')).toBe('07:30');
    expect(getDefaultPrePracticeStartTime('오후찬양예배')).toBe('16:00');
  });

  // 절기찬양예배는 주일 오후에 열리기도 하고 평일 저녁에 열리기도 해서
  // 종류만으로 시각을 정할 수 없다 — 의도적으로 매핑에서 뺀 값이다.
  it('절기찬양예배는 시각이 일정하지 않아 null', () => {
    expect(getDefaultPrePracticeStartTime('절기찬양예배')).toBeNull();
  });

  it('기본값이 없는 종류는 null', () => {
    expect(getDefaultPrePracticeStartTime('기타')).toBeNull();
    expect(getDefaultPrePracticeStartTime(null)).toBeNull();
  });
});

describe('toTimeInputValue', () => {
  it('DB의 TIME 값을 HH:mm으로 자른다', () => {
    expect(toTimeInputValue('09:00:00')).toBe('09:00');
  });

  it('이미 HH:mm이면 그대로 둔다', () => {
    expect(toTimeInputValue('09:00')).toBe('09:00');
  });

  it('빈 값은 빈 문자열', () => {
    expect(toTimeInputValue(null)).toBe('');
    expect(toTimeInputValue(undefined)).toBe('');
    expect(toTimeInputValue('')).toBe('');
  });
});
