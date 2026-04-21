-- ============================================================
-- Phase A-1: 커뮤니티 전체 테이블 (10개) + 트리거 + RLS
-- 공지사항, 자유게시판, 사진첩, 설문/투표를 위한 데이터베이스 인프라
-- ============================================================

-- ========================================
-- 1. community_posts (게시글: feed + notice 통합)
-- ========================================
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 게시글 유형
  post_type TEXT NOT NULL CHECK (post_type IN ('feed', 'notice')),

  -- 공통 필드
  title TEXT,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),

  -- 자유게시판 전용
  category TEXT CHECK (category IN (
    'performance', 'celebration', 'sharing', 'daily', 'prayer'
  )),

  -- 공지사항 전용
  priority TEXT CHECK (priority IN ('normal', 'important', 'urgent')),
  is_pinned BOOLEAN DEFAULT false,
  requires_confirmation BOOLEAN DEFAULT false,

  -- 메타데이터
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_community_posts_type_created
  ON community_posts(post_type, created_at DESC)
  WHERE is_deleted = false;
CREATE INDEX idx_community_posts_category
  ON community_posts(category, created_at DESC)
  WHERE post_type = 'feed' AND is_deleted = false;
CREATE INDEX idx_community_posts_pinned
  ON community_posts(is_pinned, created_at DESC)
  WHERE post_type = 'notice' AND is_deleted = false;

-- ========================================
-- 2. post_attachments (게시글 첨부파일)
-- ========================================
CREATE TABLE post_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  thumbnail_path TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_attachments_post
  ON post_attachments(post_id, sort_order);

-- ========================================
-- 3. post_comments (댓글, 대댓글 1단계)
-- ========================================
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_comments_post
  ON post_comments(post_id, created_at)
  WHERE is_deleted = false;

-- ========================================
-- 4. post_likes (좋아요)
-- ========================================
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ========================================
-- 5. notice_confirmations (공지 확인/읽음)
-- ========================================
CREATE TABLE notice_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_notice_confirmations_post
  ON notice_confirmations(post_id);
CREATE INDEX idx_notice_confirmations_user
  ON notice_confirmations(user_id, post_id);

-- ========================================
-- 6. photo_albums (사진 앨범)
-- ========================================
CREATE TABLE photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  cover_image_path TEXT,
  choir_event_id UUID REFERENCES choir_events(id),
  photo_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_photo_albums_date
  ON photo_albums(event_date DESC)
  WHERE is_deleted = false;

-- ========================================
-- 7. album_photos (앨범 사진)
-- ========================================
CREATE TABLE album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_album_photos_album
  ON album_photos(album_id, created_at DESC);

-- ========================================
-- 8. polls (설문/투표)
-- ========================================
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL CHECK (poll_type IN (
    'attendance', 'choice', 'open_ended'
  )),
  is_anonymous BOOLEAN DEFAULT false,
  allow_multiple BOOLEAN DEFAULT false,
  deadline_at TIMESTAMPTZ,
  is_closed BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  response_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_polls_active
  ON polls(created_at DESC)
  WHERE is_closed = false AND is_deleted = false;

-- ========================================
-- 9. poll_options (설문 선택지)
-- ========================================
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0
);

CREATE INDEX idx_poll_options_poll
  ON poll_options(poll_id, sort_order);

-- ========================================
-- 10. poll_responses (설문 응답)
-- ========================================
CREATE TABLE poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  attendance_status TEXT CHECK (attendance_status IN (
    'attending', 'not_attending', 'undecided'
  )),
  selected_option_id UUID REFERENCES poll_options(id),
  text_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_poll_responses_unique_attendance
  ON poll_responses(poll_id, user_id)
  WHERE attendance_status IS NOT NULL;
CREATE UNIQUE INDEX idx_poll_responses_unique_text
  ON poll_responses(poll_id, user_id)
  WHERE text_response IS NOT NULL;
CREATE INDEX idx_poll_responses_poll
  ON poll_responses(poll_id);

-- ============================================================
-- 카운터 캐시 트리거
-- ============================================================

-- like_count 동기화
CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_post_like_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_like_count();

-- comment_count 동기화 (soft delete 고려)
CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- soft delete: is_deleted가 false→true 전환 시 감소
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.post_id;
    -- soft delete 복원: is_deleted가 true→false 전환 시 증가
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = false THEN
    UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_post_comment_count
  AFTER INSERT OR UPDATE OF is_deleted OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();

-- photo_count 동기화
CREATE OR REPLACE FUNCTION public.sync_album_photo_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photo_albums SET photo_count = photo_count + 1 WHERE id = NEW.album_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photo_albums SET photo_count = GREATEST(photo_count - 1, 0) WHERE id = OLD.album_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_album_photo_count
  AFTER INSERT OR DELETE ON album_photos
  FOR EACH ROW EXECUTE FUNCTION public.sync_album_photo_count();

-- poll response_count 동기화
CREATE OR REPLACE FUNCTION public.sync_poll_response_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE polls SET response_count = response_count + 1 WHERE id = NEW.poll_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE polls SET response_count = GREATEST(response_count - 1, 0) WHERE id = OLD.poll_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_poll_response_count
  AFTER INSERT OR DELETE ON poll_responses
  FOR EACH ROW EXECUTE FUNCTION public.sync_poll_response_count();

-- ============================================================
-- updated_at 트리거 (기존 update_updated_at_column() 함수 재사용)
-- ============================================================

CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_albums_updated_at
  BEFORE UPDATE ON photo_albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_polls_updated_at
  BEFORE UPDATE ON polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poll_responses_updated_at
  BEFORE UPDATE ON poll_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- ========================================
-- community_posts RLS
-- ========================================
DROP POLICY IF EXISTS "Posts viewable by all authenticated" ON community_posts;
CREATE POLICY "Posts viewable by all authenticated"
  ON community_posts FOR SELECT TO authenticated
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Posts insertable by linked members" ON community_posts;
CREATE POLICY "Posts insertable by linked members"
  ON community_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_member_linked()
    AND (
      post_type = 'feed'
      OR (
        post_type = 'notice'
        AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY'])
      )
    )
  );

DROP POLICY IF EXISTS "Posts updatable by author or managers" ON community_posts;
CREATE POLICY "Posts updatable by author or managers"
  ON community_posts FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  )
  WITH CHECK (
    author_id = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

DROP POLICY IF EXISTS "Posts deletable by admin" ON community_posts;
CREATE POLICY "Posts deletable by admin"
  ON community_posts FOR DELETE TO authenticated
  USING (public.has_role(ARRAY['ADMIN']));

-- ========================================
-- post_attachments RLS
-- ========================================
DROP POLICY IF EXISTS "Attachments viewable by all authenticated" ON post_attachments;
CREATE POLICY "Attachments viewable by all authenticated"
  ON post_attachments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Attachments insertable by linked members" ON post_attachments;
CREATE POLICY "Attachments insertable by linked members"
  ON post_attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_member_linked());

DROP POLICY IF EXISTS "Attachments deletable by post author or admin" ON post_attachments;
CREATE POLICY "Attachments deletable by post author or admin"
  ON post_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_posts
      WHERE community_posts.id = post_attachments.post_id
        AND community_posts.author_id = auth.uid()
    )
    OR public.has_role(ARRAY['ADMIN'])
  );

-- ========================================
-- post_comments RLS
-- ========================================
DROP POLICY IF EXISTS "Comments viewable by all authenticated" ON post_comments;
CREATE POLICY "Comments viewable by all authenticated"
  ON post_comments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Comments insertable by linked members" ON post_comments;
CREATE POLICY "Comments insertable by linked members"
  ON post_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_member_linked()
  );

DROP POLICY IF EXISTS "Comments updatable by author" ON post_comments;
CREATE POLICY "Comments updatable by author"
  ON post_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(ARRAY['ADMIN']))
  WITH CHECK (author_id = auth.uid() OR public.has_role(ARRAY['ADMIN']));

-- ========================================
-- post_likes RLS
-- ========================================
DROP POLICY IF EXISTS "Likes viewable by all authenticated" ON post_likes;
CREATE POLICY "Likes viewable by all authenticated"
  ON post_likes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Likes insertable by linked members" ON post_likes;
CREATE POLICY "Likes insertable by linked members"
  ON post_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_member_linked()
  );

DROP POLICY IF EXISTS "Likes deletable by owner" ON post_likes;
CREATE POLICY "Likes deletable by owner"
  ON post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ========================================
-- notice_confirmations RLS
-- ========================================
DROP POLICY IF EXISTS "Confirmations viewable by authorized users" ON notice_confirmations;
CREATE POLICY "Confirmations viewable by authorized users"
  ON notice_confirmations FOR SELECT TO authenticated
  USING (
    -- 본인 확인 내역
    user_id = auth.uid()
    -- ADMIN, CONDUCTOR, MANAGER, SECRETARY: 전체 조회
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY'])
    -- PART_LEADER: 자기 파트 조회
    OR (
      public.has_role(ARRAY['PART_LEADER'])
      AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        JOIN public.members m ON up.linked_member_id = m.id
        WHERE up.id = notice_confirmations.user_id
          AND m.part = public.get_linked_member_part()
      )
    )
  );

DROP POLICY IF EXISTS "Confirmations insertable by linked members" ON notice_confirmations;
CREATE POLICY "Confirmations insertable by linked members"
  ON notice_confirmations FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_member_linked()
  );

-- ========================================
-- photo_albums RLS
-- ========================================
DROP POLICY IF EXISTS "Albums viewable by all authenticated" ON photo_albums;
CREATE POLICY "Albums viewable by all authenticated"
  ON photo_albums FOR SELECT TO authenticated
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Albums insertable by leaders" ON photo_albums;
CREATE POLICY "Albums insertable by leaders"
  ON photo_albums FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_member_linked()
    AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER', 'PART_LEADER'])
  );

DROP POLICY IF EXISTS "Albums updatable by creator or managers" ON photo_albums;
CREATE POLICY "Albums updatable by creator or managers"
  ON photo_albums FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

DROP POLICY IF EXISTS "Albums deletable by creator or managers" ON photo_albums;
CREATE POLICY "Albums deletable by creator or managers"
  ON photo_albums FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

-- ========================================
-- album_photos RLS
-- ========================================
DROP POLICY IF EXISTS "Album photos viewable by all authenticated" ON album_photos;
CREATE POLICY "Album photos viewable by all authenticated"
  ON album_photos FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Album photos insertable by linked members" ON album_photos;
CREATE POLICY "Album photos insertable by linked members"
  ON album_photos FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_member_linked()
  );

DROP POLICY IF EXISTS "Album photos deletable by uploader or managers" ON album_photos;
CREATE POLICY "Album photos deletable by uploader or managers"
  ON album_photos FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

-- ========================================
-- polls RLS
-- ========================================
DROP POLICY IF EXISTS "Polls viewable by all authenticated" ON polls;
CREATE POLICY "Polls viewable by all authenticated"
  ON polls FOR SELECT TO authenticated
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Polls insertable by leaders" ON polls;
CREATE POLICY "Polls insertable by leaders"
  ON polls FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_member_linked()
    AND public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER', 'PART_LEADER'])
  );

DROP POLICY IF EXISTS "Polls updatable by creator or managers" ON polls;
CREATE POLICY "Polls updatable by creator or managers"
  ON polls FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

DROP POLICY IF EXISTS "Polls deletable by creator or managers" ON polls;
CREATE POLICY "Polls deletable by creator or managers"
  ON polls FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

-- ========================================
-- poll_options RLS
-- ========================================
DROP POLICY IF EXISTS "Poll options viewable by all authenticated" ON poll_options;
CREATE POLICY "Poll options viewable by all authenticated"
  ON poll_options FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Poll options insertable by poll creator" ON poll_options;
CREATE POLICY "Poll options insertable by poll creator"
  ON poll_options FOR INSERT TO authenticated
  WITH CHECK (
    public.is_member_linked()
    AND EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Poll options updatable by poll creator or managers" ON poll_options;
CREATE POLICY "Poll options updatable by poll creator or managers"
  ON poll_options FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()
    )
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()
    )
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

DROP POLICY IF EXISTS "Poll options deletable by poll creator or managers" ON poll_options;
CREATE POLICY "Poll options deletable by poll creator or managers"
  ON poll_options FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.created_by = auth.uid()
    )
    OR public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER'])
  );

-- ========================================
-- poll_responses RLS
-- ========================================
DROP POLICY IF EXISTS "Poll responses viewable by all authenticated" ON poll_responses;
CREATE POLICY "Poll responses viewable by all authenticated"
  ON poll_responses FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Poll responses insertable by linked members" ON poll_responses;
CREATE POLICY "Poll responses insertable by linked members"
  ON poll_responses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_member_linked()
  );

DROP POLICY IF EXISTS "Poll responses updatable by owner" ON poll_responses;
CREATE POLICY "Poll responses updatable by owner"
  ON poll_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Poll responses deletable by owner or admin" ON poll_responses;
CREATE POLICY "Poll responses deletable by owner or admin"
  ON poll_responses FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(ARRAY['ADMIN'])
  );

-- ============================================================
-- 함수 실행 권한 부여
-- ============================================================
GRANT EXECUTE ON FUNCTION public.sync_post_like_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_post_comment_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_album_photo_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_poll_response_count() TO authenticated;
