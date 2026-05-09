-- v0.2.4에서 출석관리 "준비완료" 기능을 UI/hook 레벨에서 제거했으나
-- prod에 v0.2.4 이전에 누군가 누른 attendance_deadlines 행이 그대로 남아 있다.
-- AttendanceList.tsx의 잠금 판정(partDeadlines[part] !== null)이 그 행을 보고
-- 해당 파트 출석 입력을 잠그지만, UI에서 해제 버튼이 사라져 사용자가 풀 방법이 없다.
--
-- 따라서 오늘 이후 예배에 걸린 잠금 행만 삭제한다.
-- 과거 예배(< CURRENT_DATE)의 마감 이력은 감사 로그로 보존
-- (추후 누가 언제 마감했는지 추적 필요할 수 있음).
--
-- 컬럼 선택: closed_at(레코드 생성 시각)이 아닌 date(예배 날짜) 기준.
-- 사용자가 풀고 싶은 건 "미래 예배에 걸린 잠금"이지 "최근 만든 행"이 아니다.

DELETE FROM attendance_deadlines
WHERE date >= CURRENT_DATE;
