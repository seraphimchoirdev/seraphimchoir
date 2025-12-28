-- 찬양대 자리배치 시스템 초기 스키마
-- Supabase Migration

-- Part Enum 타입 생성
CREATE TYPE part AS ENUM ('SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL');

-- Member 테이블 (찬양대원)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  part part NOT NULL,
  height INTEGER,
  experience INTEGER NOT NULL DEFAULT 0,
  is_leader BOOLEAN NOT NULL DEFAULT false,
  phone_number TEXT,
  email TEXT UNIQUE,
  notes TEXT, -- 일반 특이사항 (모든 권한자가 볼 수 있음)
  encrypted_conductor_notes TEXT, -- 지휘자 전용 암호화 메모 (CONDUCTOR만 접근 가능)
  conductor_notes_iv TEXT, -- 암호화 IV (Initialization Vector)
  conductor_notes_auth_tag TEXT, -- 암호화 인증 태그 (GCM 모드)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance 테이블 (출석 현황)
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, date)
);

-- Arrangement 테이블 (자리배치표)
CREATE TABLE arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  service_info TEXT,
  conductor TEXT,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seat 테이블 (개별 좌석)
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES arrangements(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  seat_row INTEGER NOT NULL,
  seat_column INTEGER NOT NULL,
  part part NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(arrangement_id, seat_row, seat_column)
);

-- User Profiles 테이블 (Supabase Auth와 연동)
-- role은 ADMIN이 수동으로 부여하므로 NULL 허용
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT, -- ADMIN, CONDUCTOR, MANAGER, PART_LEADER (NULL 허용, ADMIN이 부여)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_members_part ON members(part);
CREATE INDEX idx_members_name ON members(name);
CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_attendances_is_available ON attendances(is_available);
CREATE INDEX idx_attendances_member_id ON attendances(member_id);
CREATE INDEX idx_arrangements_date ON arrangements(date);
CREATE INDEX idx_seats_arrangement_id ON seats(arrangement_id);
CREATE INDEX idx_seats_member_id ON seats(member_id);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 설정
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arrangements_updated_at BEFORE UPDATE ON arrangements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 활성화
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 역할 기반 접근 제어
-- Members: 모두 조회 가능, PART_LEADER 이상만 수정 가능
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members are editable by part leaders and above"
  ON members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER')
    )
  );

-- Attendances: 모두 조회 가능, PART_LEADER 이상만 수정 가능
CREATE POLICY "Attendances are viewable by authenticated users"
  ON attendances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Attendances are editable by part leaders and above"
  ON attendances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER')
    )
  );

-- Arrangements: 모두 조회 가능, CONDUCTOR 이상만 수정 가능
CREATE POLICY "Arrangements are viewable by authenticated users"
  ON arrangements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Arrangements are editable by conductors and above"
  ON arrangements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR')
    )
  );

-- Seats: Arrangements와 동일 (CONDUCTOR 이상만 수정 가능)
CREATE POLICY "Seats are viewable by authenticated users"
  ON seats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Seats are editable by conductors and above"
  ON seats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR')
    )
  );

-- User Profiles: 모두 조회 가능
CREATE POLICY "User profiles are viewable by authenticated users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- 본인 프로필 업데이트 (name만 가능, role 제외)
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ADMIN만 모든 프로필 관리 가능 (역할 부여 포함)
CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- 신규 사용자 자동 프로필 생성 트리거
-- role은 NULL로 생성되며, ADMIN이 수동으로 부여
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULL -- 역할은 ADMIN이 수동으로 부여
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 보안 강화: 암호화된 필드를 숨기는 View 생성
-- 일반 사용자는 이 View를 사용하도록 권장
-- CONDUCTOR는 API를 통해 암호화된 메모에 접근
CREATE VIEW members_public AS
SELECT
  id,
  name,
  part,
  height,
  experience,
  is_leader,
  phone_number,
  email,
  notes,  -- 일반 특이사항만 포함
  created_at,
  updated_at
FROM members;

-- View에도 RLS 적용
ALTER VIEW members_public SET (security_invoker = on);

-- 주의사항 주석:
-- encrypted_conductor_notes, conductor_notes_iv, conductor_notes_auth_tag 필드는
-- CONDUCTOR만 API(/api/members/[id]/conductor-notes)를 통해 접근 가능합니다.
-- 절대 직접 SELECT 하지 마세요. 암호화된 데이터입니다.
