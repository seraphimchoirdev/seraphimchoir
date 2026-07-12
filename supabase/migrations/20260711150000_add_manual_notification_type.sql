-- 관리자 수동 발송 알림 타입 'MANUAL' 추가
-- (자동 공지 알림용 'NOTICE_POSTED'와 구분)

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'VOTE_REMINDER',
  'ARRANGEMENT_SHARED',
  'ARRANGEMENT_CONFIRMED',
  'SEAT_CHANGED',
  'MANUAL',
  -- 2차 예약값 (공지/커뮤니티)
  'NOTICE_POSTED',
  'COMMENT_REPLY',
  'POST_LIKED'
));
