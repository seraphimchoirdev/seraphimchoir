-- 예배 종류별 연습 설정 정합성 복구
--
-- 증상: /my-attendance의 오후찬양예배 탭에 "연습 참석" 투표 섹션(전체참석/앞부분만/
--       뒷부분만/불참)이 떴다. 이 예배는 예배 후 연습이 없으므로 섹션이 뜨면 안 된다.
--
-- 원인: 화면 조건 분기(has_post_practice로 렌더링)는 처음부터 옳았다. DB에
--       has_post_practice가 잘못 true로 저장된 행들이 있었던 것이다. 같은 도메인
--       규칙이 세 곳에 각각 다르게 박혀 있던 것이 오염의 근원이다:
--         - 컬럼 DEFAULT            → 무조건 true (도메인 규칙과 정반대)
--         - ServiceScheduleForm     → 주일 2부 예배만
--         - parseScheduleTable      → 주일 2부 예배 + 절기찬양예배 (오판)
--       폼의 자동 판별은 나중에 추가된 로직이라, 그 이전에 생성된 행들은 DEFAULT를
--       그대로 물려받았다. service_start_time이 전부 '14:00'이던 버그
--       (20260728090000_fix_service_start_time_default.sql)와 같은 패턴의 재발이다.
--
-- 도메인 규칙:
--   - 예배 후 연습: 주일 2부 예배에만 있다.
--   - 예배 전 연습: 모든 예배에 있다 (등단 인원 전원 필수 참석).
--
-- 앱 코드의 판정 규칙은 src/lib/service-time.ts를 단일 출처로 삼는다. 이 마이그레이션과
-- 같은 커밋에서 파서·폼이 그 함수를 쓰도록 바뀌었다. 파서를 함께 고치지 않으면 일정표를
-- 다시 붙여넣는 순간 절기찬양예배가 true로 되살아나 아래 보정이 무의미해진다.

-- 1) DEFAULT 교정 — 재발 방지의 핵심
--
-- 후연습은 주일 2부 예배의 고유 일정이므로 false가 안전한 기본값이고,
-- 전연습은 모든 예배에 있으므로 true가 맞다. DEFAULT를 두는 이유는 앱을 거치지 않는
-- 삽입 경로(SQL 직접 실행, 향후 배치 스크립트)에서도 규칙이 지켜지게 하기 위함이다.
ALTER TABLE service_schedules
  ALTER COLUMN has_post_practice SET DEFAULT false,
  ALTER COLUMN has_pre_practice  SET DEFAULT true;

-- 2) 기존 데이터 일괄 보정
--
-- service_type은 '기타' 선택 시 자유 입력이라 '추수감사주일 찬양예배'·'온세대예배'처럼
-- 프리셋에 없는 값이 존재한다. 참인 조건이 단 하나뿐이라 등호 비교 한 줄로 나머지가
-- 전부 false로 떨어진다 — service_start_time 보정 때 LIKE '%찬양%'이 여러 종류를
-- 동시에 물었던 것과 달리 여기서는 패턴 매칭이 필요 없다.
--
-- 관리자가 개별 설정한 예외도 규칙으로 덮어쓴다 (사용자 확인 완료). 어느 행이 의도된
-- 예외이고 어느 행이 DEFAULT를 물려받은 사고인지 구별할 방법이 없기 때문이다.
UPDATE service_schedules
SET has_post_practice = (service_type = '주일 2부 예배'),
    has_pre_practice  = true;

-- 3) 후연습이 꺼진 행의 부속 필드 정리
--
-- 후연습이 없으면 그 시각·장소는 의미가 없다. 남겨두면 화면에
-- "예배 후 연습 10:30 / 7층 2찬양대실"이 유령처럼 뜰 수 있다.
UPDATE service_schedules
SET post_practice_start_time = NULL,
    post_practice_duration   = NULL,
    post_practice_location   = NULL
WHERE has_post_practice = false;
