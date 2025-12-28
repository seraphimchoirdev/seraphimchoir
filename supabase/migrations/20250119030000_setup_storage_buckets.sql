-- Storage 버킷 및 정책 설정
-- 자리배치표 이미지 저장을 위한 버킷 생성

-- 'arrangements' 버킷 생성 (공개 접근 허용)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arrangements',
  'arrangements',
  true, -- 공개 URL 허용
  5242880, -- 5MB 제한
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 참고: storage.objects는 Supabase에서 이미 RLS가 활성화되어 있습니다.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; (이미 활성화됨)

-- 기존 정책 삭제 (재실행 시 충돌 방지)
DROP POLICY IF EXISTS "Arrangement images are viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Arrangement images are uploadable by conductors and above" ON storage.objects;
DROP POLICY IF EXISTS "Arrangement images are updatable by conductors and above" ON storage.objects;
DROP POLICY IF EXISTS "Arrangement images are deletable by conductors and above" ON storage.objects;

-- 조회 정책: 모든 인증된 사용자가 arrangements 버킷의 파일을 조회 가능
CREATE POLICY "Arrangement images are viewable by authenticated users"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'arrangements');

-- 업로드 정책: CONDUCTOR 이상만 arrangements 버킷에 파일 업로드 가능
CREATE POLICY "Arrangement images are uploadable by conductors and above"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'arrangements' AND
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR'])
  );

-- 업데이트 정책: CONDUCTOR 이상만 arrangements 버킷의 파일 업데이트 가능
CREATE POLICY "Arrangement images are updatable by conductors and above"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'arrangements' AND
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR'])
  )
  WITH CHECK (
    bucket_id = 'arrangements' AND
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR'])
  );

-- 삭제 정책: CONDUCTOR 이상만 arrangements 버킷의 파일 삭제 가능
CREATE POLICY "Arrangement images are deletable by conductors and above"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'arrangements' AND
    public.has_role(ARRAY['ADMIN', 'CONDUCTOR'])
  );

-- 주석:
-- - 버킷은 공개(public)로 설정되어 URL로 직접 접근 가능
-- - 파일 크기는 5MB로 제한
-- - PNG, JPEG, JPG, WEBP 이미지만 허용
-- - 업로드/수정/삭제는 CONDUCTOR 이상만 가능
-- - 조회는 모든 인증된 사용자 가능
