-- 5월 3일 주일 2부예배 특별 게스트 30명 등록
-- 새로핌찬양대 추가 게스트 6명 + 고등부 아가찬양대 24명 = 총 30명
-- 모두 member_status = 'GUEST', is_singer = true (등단), joined_date = 2026-05-03
-- height_cm과 height 양쪽 컬럼에 같은 값을 채워 dual-column 호환성 유지
-- 멱등성: 동일 (name, part, joined_date, member_status='GUEST') 조합이 이미 있으면 INSERT 스킵

INSERT INTO members (name, part, member_status, height_cm, height, is_singer, is_leader, joined_date)
SELECT * FROM (
  VALUES
    -- 새로핌 추가 게스트 6명
    ('안형준', 'SOPRANO'::part, 'GUEST'::member_status, 151, 151, true, false, DATE '2026-05-03'),
    ('노혜주', 'SOPRANO'::part, 'GUEST'::member_status, 170, 170, true, false, DATE '2026-05-03'),
    ('박의진', 'ALTO'::part,    'GUEST'::member_status, 160, 160, true, false, DATE '2026-05-03'),
    ('이진유', 'TENOR'::part,   'GUEST'::member_status, 168, 168, true, false, DATE '2026-05-03'),
    ('이송하', 'BASS'::part,    'GUEST'::member_status, 173, 173, true, false, DATE '2026-05-03'),
    ('남여운', 'BASS'::part,    'GUEST'::member_status, 170, 170, true, false, DATE '2026-05-03'),
    -- 고등부 아가찬양대 SOPRANO 8명
    ('이세아', 'SOPRANO'::part, 'GUEST'::member_status, 153, 153, true, false, DATE '2026-05-03'),
    ('한서연', 'SOPRANO'::part, 'GUEST'::member_status, 158, 158, true, false, DATE '2026-05-03'),
    ('전예담', 'SOPRANO'::part, 'GUEST'::member_status, 162, 162, true, false, DATE '2026-05-03'),
    ('윤수아', 'SOPRANO'::part, 'GUEST'::member_status, 164, 164, true, false, DATE '2026-05-03'),
    ('정예지', 'SOPRANO'::part, 'GUEST'::member_status, 167, 167, true, false, DATE '2026-05-03'),
    ('조민채', 'SOPRANO'::part, 'GUEST'::member_status, 167, 167, true, false, DATE '2026-05-03'),
    ('김하윤', 'SOPRANO'::part, 'GUEST'::member_status, 169, 169, true, false, DATE '2026-05-03'),
    ('전현서', 'SOPRANO'::part, 'GUEST'::member_status, 170, 170, true, false, DATE '2026-05-03'),
    -- 고등부 아가찬양대 ALTO 6명
    ('박시온', 'ALTO'::part, 'GUEST'::member_status, 153, 153, true, false, DATE '2026-05-03'),
    ('윤의서', 'ALTO'::part, 'GUEST'::member_status, 161, 161, true, false, DATE '2026-05-03'),
    ('윤주아', 'ALTO'::part, 'GUEST'::member_status, 162, 162, true, false, DATE '2026-05-03'),
    ('신하진', 'ALTO'::part, 'GUEST'::member_status, 163, 163, true, false, DATE '2026-05-03'),
    ('최시율', 'ALTO'::part, 'GUEST'::member_status, 164, 164, true, false, DATE '2026-05-03'),
    ('양지우', 'ALTO'::part, 'GUEST'::member_status, 166, 166, true, false, DATE '2026-05-03'),
    -- 고등부 아가찬양대 TENOR 5명
    ('안태범', 'TENOR'::part, 'GUEST'::member_status, 174, 174, true, false, DATE '2026-05-03'),
    ('이택기', 'TENOR'::part, 'GUEST'::member_status, 174, 174, true, false, DATE '2026-05-03'),
    ('박성찬', 'TENOR'::part, 'GUEST'::member_status, 173, 173, true, false, DATE '2026-05-03'),
    ('손은택', 'TENOR'::part, 'GUEST'::member_status, 180, 180, true, false, DATE '2026-05-03'),
    ('유창민', 'TENOR'::part, 'GUEST'::member_status, 180, 180, true, false, DATE '2026-05-03'),
    -- 고등부 아가찬양대 BASS 5명
    ('신영철', 'BASS'::part, 'GUEST'::member_status, 173, 173, true, false, DATE '2026-05-03'),
    ('이송현', 'BASS'::part, 'GUEST'::member_status, 174, 174, true, false, DATE '2026-05-03'),
    ('김지호', 'BASS'::part, 'GUEST'::member_status, 175, 175, true, false, DATE '2026-05-03'),
    ('남여준', 'BASS'::part, 'GUEST'::member_status, 176, 176, true, false, DATE '2026-05-03'),
    ('김지용', 'BASS'::part, 'GUEST'::member_status, 177, 177, true, false, DATE '2026-05-03')
) AS new_guests(name, part, member_status, height_cm, height, is_singer, is_leader, joined_date)
WHERE NOT EXISTS (
  -- 동일 이름/파트/joined_date를 가진 GUEST가 이미 있으면 스킵 (멱등성)
  SELECT 1 FROM members m
  WHERE m.name = new_guests.name
    AND m.part = new_guests.part
    AND m.member_status = 'GUEST'
    AND m.joined_date = DATE '2026-05-03'
);
