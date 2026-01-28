-- 연습 참석 유형 enum 생성
CREATE TYPE practice_attendance_type AS ENUM (
  'FULL',        -- 전체 참석
  'EARLY_LEAVE', -- 앞부분만 (조기퇴장)
  'LATE_JOIN',   -- 뒷부분만 (지각 참석)
  'ABSENT'       -- 불참
);

-- 새 컬럼 추가
ALTER TABLE attendances
ADD COLUMN practice_status practice_attendance_type DEFAULT 'ABSENT';

-- 기존 데이터 마이그레이션: is_practice_attended 값을 practice_status로 변환
UPDATE attendances
SET practice_status = CASE
  WHEN is_practice_attended = true THEN 'FULL'::practice_attendance_type
  ELSE 'ABSENT'::practice_attendance_type
END;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN attendances.practice_status IS '연습 참석 상태: FULL(전체), EARLY_LEAVE(앞부분만), LATE_JOIN(뒷부분만), ABSENT(불참)';
