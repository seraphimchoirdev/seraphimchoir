-- 문서 아카이빙 Storage 버킷 설정
-- 회의록, 소식지, 회계자료 등 문서 저장용

-- 1. 'documents' 버킷 생성 (비공개)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- 비공개 (인증 + 권한 필요)
  52428800, -- 50MB 제한
  ARRAY[
    -- PDF
    'application/pdf',
    -- Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- 이미지
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    -- 텍스트
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. 기존 정책 삭제 (재실행 시 충돌 방지)
DROP POLICY IF EXISTS "Documents storage viewable by managers" ON storage.objects;
DROP POLICY IF EXISTS "Documents storage uploadable by managers" ON storage.objects;
DROP POLICY IF EXISTS "Documents storage updatable by managers" ON storage.objects;
DROP POLICY IF EXISTS "Documents storage deletable by managers" ON storage.objects;

-- 3. 조회 정책: MANAGER 이상만
CREATE POLICY "Documents storage viewable by managers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

-- 4. 업로드 정책: MANAGER 이상만
CREATE POLICY "Documents storage uploadable by managers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

-- 5. 업데이트 정책: MANAGER 이상만
CREATE POLICY "Documents storage updatable by managers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

-- 6. 삭제 정책: MANAGER 이상만
CREATE POLICY "Documents storage deletable by managers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

-- 주석:
-- - 버킷은 비공개(private)로 설정
-- - 50MB 파일 크기 제한
-- - PDF, Word, Excel, PowerPoint, 이미지, 텍스트 파일 허용
-- - MANAGER 이상만 모든 작업 가능 (임원/총무단)
-- - 일반 대원은 문서에 접근 불가
