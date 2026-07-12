-- 월간 자동 앨범 find-or-create 동시성 레이스 방지 (코드 리뷰 A7)
-- 동일 월에 자동 앨범(description = '__auto_monthly__')이 2개 이상 생기는 것을
-- DB 레벨에서 차단한다. quick-upload 라우트는 유니크 충돌(23505) 시
-- 기존 앨범을 재조회하는 폴백으로 대응한다.

-- 1. 기존 중복 자동 앨범 정리: 월별로 가장 먼저 생성된 앨범만 남기고
--    나머지 앨범의 사진을 유지 대상 앨범으로 이관
WITH keep AS (
  SELECT DISTINCT ON (event_date) id, event_date
  FROM photo_albums
  WHERE description = '__auto_monthly__' AND is_deleted = false
  ORDER BY event_date, created_at, id
),
dups AS (
  SELECT pa.id, k.id AS keep_id
  FROM photo_albums pa
  JOIN keep k ON k.event_date = pa.event_date AND k.id <> pa.id
  WHERE pa.description = '__auto_monthly__' AND pa.is_deleted = false
)
UPDATE album_photos ap
SET album_id = d.keep_id
FROM dups d
WHERE ap.album_id = d.id;

-- 2. 사진을 비운 중복 앨범 soft-delete
WITH keep AS (
  SELECT DISTINCT ON (event_date) id, event_date
  FROM photo_albums
  WHERE description = '__auto_monthly__' AND is_deleted = false
  ORDER BY event_date, created_at, id
)
UPDATE photo_albums pa
SET is_deleted = true, updated_at = now()
FROM keep k
WHERE pa.description = '__auto_monthly__'
  AND pa.is_deleted = false
  AND pa.event_date = k.event_date
  AND pa.id <> k.id;

-- 3. photo_count 재계산
-- (trg_sync_album_photo_count는 INSERT/DELETE만 처리하므로 UPDATE 이관분 보정)
UPDATE photo_albums pa
SET photo_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT album_id, COUNT(*) AS cnt
  FROM album_photos
  GROUP BY album_id
) sub
WHERE pa.id = sub.album_id
  AND pa.description = '__auto_monthly__'
  AND pa.is_deleted = false;

-- 4. 부분 유니크 인덱스: 활성 자동 앨범은 월(event_date)당 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS uq_photo_albums_auto_monthly
  ON photo_albums (event_date)
  WHERE description = '__auto_monthly__' AND is_deleted = false;
