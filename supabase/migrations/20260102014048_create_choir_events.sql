-- 마이그레이션: choir_events 테이블 생성 (행사 전용)
-- 예배와 독립적인 찬양대 행사 관리용

CREATE TABLE IF NOT EXISTS choir_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('FELLOWSHIP', 'PERFORMANCE', 'CHURCH_EVENT', 'OTHER')),
  start_time TIME,
  end_time TIME,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 코멘트 추가
COMMENT ON TABLE choir_events IS '찬양대 행사 일정';
COMMENT ON COLUMN choir_events.event_type IS '행사 유형: FELLOWSHIP(야유회/수련회), PERFORMANCE(찬양발표회), CHURCH_EVENT(교회 전체 행사), OTHER(기타)';
COMMENT ON COLUMN choir_events.start_time IS '행사 시작 시간';
COMMENT ON COLUMN choir_events.end_time IS '행사 종료 시간';
COMMENT ON COLUMN choir_events.location IS '행사 장소';
COMMENT ON COLUMN choir_events.description IS '행사 설명';

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER set_updated_at_choir_events
  BEFORE UPDATE ON choir_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS 정책
ALTER TABLE choir_events ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모든 행사를 조회할 수 있음
CREATE POLICY "Authenticated users can view events"
  ON choir_events FOR SELECT
  TO authenticated
  USING (true);

-- MANAGER 이상만 행사 생성/수정/삭제 가능
CREATE POLICY "Managers can insert events"
  ON choir_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

CREATE POLICY "Managers can update events"
  ON choir_events FOR UPDATE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

CREATE POLICY "Managers can delete events"
  ON choir_events FOR DELETE
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

-- 인덱스 추가 (날짜 범위 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_choir_events_date ON choir_events(date);
CREATE INDEX IF NOT EXISTS idx_choir_events_event_type ON choir_events(event_type);
