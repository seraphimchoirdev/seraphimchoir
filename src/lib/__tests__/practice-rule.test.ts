/**
 * 예배 종류별 연습 규칙 회귀 테스트.
 *
 * 이 규칙이 과거 세 곳(DB 컬럼 DEFAULT·폼·일정표 파서)에 각각 다르게 박혀 있었고,
 * 그 불일치 때문에 후연습이 없는 예배(오후찬양예배 등)에 연습 투표 섹션이 노출됐다.
 * 규칙을 service-time.ts로 일원화했으므로, 여기서 그 단일 출처와 소비처(파서)가
 * 같은 답을 내는지 고정한다.
 */
import { getDefaultPrePracticeStartTime, hasPostPractice } from '@/lib/service-time';
import { toServiceScheduleInsert } from '@/lib/vision/parseScheduleTable';

describe('예배 후 연습 판정 규칙', () => {
  it('주일 2부 예배만 후연습이 있다', () => {
    expect(hasPostPractice('주일 2부 예배')).toBe(true);
    expect(hasPostPractice('오후찬양예배')).toBe(false);
    expect(hasPostPractice('절기찬양예배')).toBe(false);
    expect(hasPostPractice('기도회')).toBe(false);
  });

  it('프리셋에 없는 자유 입력은 후연습 없음으로 본다', () => {
    expect(hasPostPractice('추수감사주일 찬양예배')).toBe(false);
    expect(hasPostPractice('온세대예배')).toBe(false);
    expect(hasPostPractice(null)).toBe(false);
    expect(hasPostPractice(undefined)).toBe(false);
    expect(hasPostPractice('')).toBe(false);
  });
});

describe('일정표 파서', () => {
  // 데이터 보정이 되돌려지지 않는지 확인하는 결정적 테스트.
  // 과거 이 파서만 절기찬양예배를 후연습 있음으로 판정해 폼과 어긋나 있었다.
  it('절기찬양예배를 후연습 없음으로 저장한다', () => {
    const row = toServiceScheduleInsert({ date: '2026-08-02', service_type: '절기찬양예배' } as never);
    expect(row.has_post_practice).toBe(false);
    expect(row.post_practice_start_time).toBeNull();
    expect(row.post_practice_duration).toBeNull();
    expect(row.post_practice_location).toBeNull();
  });

  it('주일 2부 예배는 후연습 필드를 채운다', () => {
    const row = toServiceScheduleInsert({ date: '2026-08-02', service_type: '주일 2부 예배' } as never);
    expect(row.has_post_practice).toBe(true);
    expect(row.post_practice_start_time).toBe('07:30');
  });

  it('예배 전 연습은 모든 예배에 있다', () => {
    for (const t of ['주일 2부 예배', '오후찬양예배', '기도회']) {
      expect(toServiceScheduleInsert({ date: '2026-08-02', service_type: t } as never).has_pre_practice).toBe(true);
    }
  });

  // 화면은 pre_practice_start_time을 직접 읽는다(minutes_before가 아니다).
  // 파서가 이 값을 안 채워 주일 2부 예배의 75%가 NULL이었고 안내가 뜨지 않았다.
  it('전연습 시각을 채운다', () => {
    const row = toServiceScheduleInsert({ date: '2026-08-02', service_type: '주일 2부 예배' } as never);
    expect(row.pre_practice_start_time).toBe('07:30');
  });
});

describe('예배 전 연습 시각 기본값', () => {
  it('시각이 일정한 예배는 기본값을 갖는다', () => {
    expect(getDefaultPrePracticeStartTime('주일 2부 예배')).toBe('07:30');
    expect(getDefaultPrePracticeStartTime('오후찬양예배')).toBe('16:00');
    expect(getDefaultPrePracticeStartTime('기도회')).toBe('05:30');
  });

  // 절기찬양예배는 절기에 따라 주일 오후 찬양예배를 대신하기도 하고 평일 저녁에
  // 열리기도 한다. 종류만으로 시각을 정할 수 없으므로 기본값을 두지 않는다 —
  // 폼에 이 필드의 입력란이 없어 틀린 값을 채우면 고칠 수단이 없다.
  it('절기찬양예배는 시각이 일정하지 않아 기본값이 없다', () => {
    expect(getDefaultPrePracticeStartTime('절기찬양예배')).toBeNull();
  });

  it('프리셋에 없는 자유 입력은 null이다', () => {
    expect(getDefaultPrePracticeStartTime('온세대예배')).toBeNull();
    expect(getDefaultPrePracticeStartTime(null)).toBeNull();
  });
});
