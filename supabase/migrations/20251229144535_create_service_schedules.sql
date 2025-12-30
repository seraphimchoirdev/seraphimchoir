-- Create service_schedules table for quarterly worship schedule management
-- Stores hymn names and offertory performer info for each service date

CREATE TABLE service_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  service_type TEXT DEFAULT '주일예배',
  hymn_name TEXT,
  offertory_performer TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE service_schedules IS '분기별 예배 일정 (찬양곡명, 봉헌송 연주자)';
COMMENT ON COLUMN service_schedules.date IS '예배 날짜';
COMMENT ON COLUMN service_schedules.service_type IS '예배 유형 (주일예배, 특별예배 등)';
COMMENT ON COLUMN service_schedules.hymn_name IS '찬양곡명';
COMMENT ON COLUMN service_schedules.offertory_performer IS '봉헌송 연주자명';
COMMENT ON COLUMN service_schedules.notes IS '비고';

-- Enable RLS
ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can read service_schedules"
  ON service_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert service_schedules"
  ON service_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update service_schedules"
  ON service_schedules FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete service_schedules"
  ON service_schedules FOR DELETE
  TO authenticated
  USING (true);

-- Index for date lookups
CREATE INDEX idx_service_schedules_date ON service_schedules(date);

-- Trigger for updated_at
CREATE TRIGGER update_service_schedules_updated_at
  BEFORE UPDATE ON service_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
