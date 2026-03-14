-- seats/bulk의 DELETE → INSERT를 단일 트랜잭션으로 처리하는 RPC 함수
-- 중간 실패 시 자동 롤백되어 데이터 손실 방지

CREATE OR REPLACE FUNCTION replace_arrangement_seats(
  p_arrangement_id UUID,
  p_seats JSONB
)
RETURNS SETOF seats
LANGUAGE plpgsql
SECURITY INVOKER -- RLS 적용 유지
AS $$
BEGIN
  -- 1. 기존 좌석 삭제
  DELETE FROM seats WHERE arrangement_id = p_arrangement_id;

  -- 2. 새 좌석 삽입 (빈 배열이면 삭제만 수행)
  IF jsonb_array_length(p_seats) > 0 THEN
    RETURN QUERY
    INSERT INTO seats (arrangement_id, member_id, seat_row, seat_column, part, is_row_leader)
    SELECT
      p_arrangement_id,
      (elem->>'member_id')::UUID,
      (elem->>'seat_row')::INT,
      (elem->>'seat_column')::INT,
      (elem->>'part')::part,
      COALESCE((elem->>'is_row_leader')::BOOLEAN, false)
    FROM jsonb_array_elements(p_seats) AS elem
    RETURNING *;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION replace_arrangement_seats IS '배치표의 좌석을 원자적으로 교체 (DELETE + INSERT를 단일 트랜잭션으로 처리)';
