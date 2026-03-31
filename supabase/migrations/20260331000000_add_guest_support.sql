-- 게스트 멤버 지원: 외부 찬양대원이 특정 배치표에만 참여할 수 있도록 함

-- 1) member_status enum에 GUEST 추가
ALTER TYPE member_status ADD VALUE 'GUEST';

-- 2) arrangement_guests 매핑 테이블 (배치표별 게스트 연결)
CREATE TABLE arrangement_guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arrangement_id UUID NOT NULL REFERENCES arrangements(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(arrangement_id, member_id)
);

-- 인덱스
CREATE INDEX idx_arrangement_guests_arrangement_id ON arrangement_guests(arrangement_id);
CREATE INDEX idx_arrangement_guests_member_id ON arrangement_guests(member_id);

-- 3) RLS 정책
ALTER TABLE arrangement_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "인증된 사용자 조회"
  ON arrangement_guests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "인증된 사용자 추가"
  ON arrangement_guests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "인증된 사용자 삭제"
  ON arrangement_guests FOR DELETE
  TO authenticated
  USING (true);
