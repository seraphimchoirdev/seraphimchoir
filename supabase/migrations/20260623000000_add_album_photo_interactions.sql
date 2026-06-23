-- ============================================================
-- 커뮤니티 앨범 사진 상호작용: 이모지 반응 + 댓글
--
-- 피드 게시판(post_likes / post_comments) 패턴을 복제하여
-- 앨범 사진(album_photos)에 이모지 반응과 댓글 기능을 추가한다.
--
-- 참조: 20260419000000_add_community_tables.sql
-- 재사용 DB 헬퍼: public.is_member_linked(), public.has_role(text[]),
--                public.update_updated_at_column()
-- ============================================================

-- ========================================
-- 1. album_photo_reactions (이모지 반응)
--    - 사용자당 사진당 1개 반응 (UNIQUE)
--    - 같은 이모지 재클릭 = 취소(DELETE), 다른 이모지 = 교체(UPDATE)
--    - 이모지 화이트리스트는 프론트/API 상수(PHOTO_REACTION_EMOJIS)로 검증
-- ========================================
CREATE TABLE album_photo_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id   UUID NOT NULL REFERENCES album_photos(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (photo_id, user_id)
);

CREATE INDEX idx_album_photo_reactions_photo ON album_photo_reactions(photo_id);
CREATE INDEX idx_album_photo_reactions_user ON album_photo_reactions(user_id, photo_id);

-- ========================================
-- 2. album_photo_comments (사진 댓글, 대댓글 1단계)
--    - post_comments 구조 복제
-- ========================================
CREATE TABLE album_photo_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id   UUID NOT NULL REFERENCES album_photos(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES album_photo_comments(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_album_photo_comments_photo
  ON album_photo_comments(photo_id, created_at)
  WHERE is_deleted = false;

-- ========================================
-- 3. album_photos에 comment_count 캐시 컬럼 추가
--    (반응은 이모지별 집계가 필요하므로 캐시 없이 GROUP BY 쿼리로 처리)
-- ========================================
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ========================================
-- 4. comment_count 동기화 트리거 (sync_post_comment_count 복제)
-- ========================================
CREATE OR REPLACE FUNCTION public.sync_photo_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    UPDATE album_photos SET comment_count = comment_count + 1 WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- soft delete: is_deleted가 false→true 전환 시 감소
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE album_photos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.photo_id;
    -- soft delete 복원: is_deleted가 true→false 전환 시 증가
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE album_photos SET comment_count = comment_count + 1 WHERE id = NEW.photo_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = false THEN
    UPDATE album_photos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.photo_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_photo_comment_count
  AFTER INSERT OR UPDATE OF is_deleted OR DELETE ON album_photo_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_photo_comment_count();

-- updated_at 트리거 (기존 update_updated_at_column() 함수 재사용)
CREATE TRIGGER update_album_photo_comments_updated_at
  BEFORE UPDATE ON album_photo_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. RLS: album_photo_reactions
-- ========================================
ALTER TABLE album_photo_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photo reactions viewable by all authenticated" ON album_photo_reactions;
CREATE POLICY "Photo reactions viewable by all authenticated"
  ON album_photo_reactions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Photo reactions insertable by linked members" ON album_photo_reactions;
CREATE POLICY "Photo reactions insertable by linked members"
  ON album_photo_reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_member_linked()
  );

DROP POLICY IF EXISTS "Photo reactions updatable by owner" ON album_photo_reactions;
CREATE POLICY "Photo reactions updatable by owner"
  ON album_photo_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Photo reactions deletable by owner" ON album_photo_reactions;
CREATE POLICY "Photo reactions deletable by owner"
  ON album_photo_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ========================================
-- 6. RLS: album_photo_comments (post_comments RLS 복제)
-- ========================================
ALTER TABLE album_photo_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photo comments viewable by all authenticated" ON album_photo_comments;
CREATE POLICY "Photo comments viewable by all authenticated"
  ON album_photo_comments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Photo comments insertable by linked members" ON album_photo_comments;
CREATE POLICY "Photo comments insertable by linked members"
  ON album_photo_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_member_linked()
  );

DROP POLICY IF EXISTS "Photo comments updatable by author" ON album_photo_comments;
CREATE POLICY "Photo comments updatable by author"
  ON album_photo_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(ARRAY['ADMIN']))
  WITH CHECK (author_id = auth.uid() OR public.has_role(ARRAY['ADMIN']));
