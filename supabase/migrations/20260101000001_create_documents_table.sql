-- 문서 아카이빙 시스템
-- 회의록, 소식지, 회계자료, 매뉴얼 등 문서 관리

-- 1. documents 테이블 생성
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 문서 메타데이터
  title TEXT NOT NULL,
  description TEXT,

  -- 파일 정보
  file_path TEXT NOT NULL,          -- Supabase Storage 경로
  file_name TEXT NOT NULL,          -- 원본 파일명
  file_size INTEGER NOT NULL,       -- 바이트 단위
  mime_type TEXT NOT NULL,          -- MIME 타입

  -- 분류
  tags TEXT[] DEFAULT '{}',         -- 자유 태그 배열 (예: ['회의록', '2024년', '정기총회'])
  year INTEGER,                     -- 연도 (검색/필터용)

  -- 메타
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(year);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- 3. Full-text 검색 인덱스 (제목, 설명)
CREATE INDEX IF NOT EXISTS idx_documents_title_search
  ON documents USING gin(to_tsvector('simple', coalesce(title, '')));
CREATE INDEX IF NOT EXISTS idx_documents_description_search
  ON documents USING gin(to_tsvector('simple', coalesce(description, '')));

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- 5. RLS 활성화
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책: MANAGER 이상만 CRUD 가능
DROP POLICY IF EXISTS "Documents are viewable by managers" ON documents;
DROP POLICY IF EXISTS "Documents are manageable by managers" ON documents;

CREATE POLICY "Documents are viewable by managers"
  ON documents FOR SELECT
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

CREATE POLICY "Documents are manageable by managers"
  ON documents FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']))
  WITH CHECK (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

-- 7. 모든 태그 조회 함수 (자동완성용)
CREATE OR REPLACE FUNCTION get_all_document_tags()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(DISTINCT tag)
  FROM documents, unnest(tags) AS tag
  WHERE tag IS NOT NULL AND tag != ''
  ORDER BY tag;
$$;

GRANT EXECUTE ON FUNCTION get_all_document_tags() TO authenticated;

-- 주석:
-- - tags: 자유 태그 배열 (고정 카테고리 없음)
-- - year: 연도별 필터링용
-- - MANAGER 이상만 접근 가능 (임원/총무단)
-- - GIN 인덱스로 태그 및 텍스트 검색 최적화
