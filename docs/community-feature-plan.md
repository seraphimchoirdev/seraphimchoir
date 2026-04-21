# 🏛️ 새로핌ON 커뮤니티 기능 상세 기획서

> **작성일**: 2026-04-13 (최종 수정: 2026-04-11)
> **목적**: 네이버밴드를 대체하는 찬양대 전용 커뮤니티 플랫폼 구축
> **현재 상태**: Phase 0 완료, Phase A-1 구현 준비 중

---

## 1. 배경 및 목표

### 문제 정의
- 기존 네이버밴드 활용도 저하 → 커뮤니티 소통 공백 발생
- 찬양대 정보가 여러 플랫폼에 분산 (밴드, 카카오톡, 개인 연락 등)
- 공지 확인 여부 추적 불가 → 파트장이 개별 확인해야 하는 번거로움
- 행사 사진이 개인 갤러리에만 존재 → 체계적 아카이빙 부재

### 목표
1. **소통 활성화**: 찬양대원들이 자유롭게 소식을 공유하는 공간
2. **공지 확인 추적**: 파트장이 파트원의 공지 확인 여부를 실시간 파악
3. **사진 아카이빙**: 행사별 앨범으로 체계적 사진 관리
4. **설문/투표**: 행사 참석 조사, 의견 수렴을 위한 간편한 도구
5. **One-Stop**: 새로핌ON 안에서 모든 소통이 완결되도록

### 핵심 원칙
- **모바일 퍼스트**: 대부분의 사용이 스마트폰에서 이루어짐
- **진입장벽 최소화**: 네이버밴드보다 쉽고 직관적이어야 함
- **기존 시스템 활용**: 역할/권한 체계, Cloudflare R2 스토리지 활용
- **점진적 구축**: 핵심 기능부터 출시 → 사용 패턴 보고 확장

---

## 2. 기능 구성 (4대 모듈)

### 전체 구조

```
/community
├── /feed          ← 자유게시판 (대원 동정, 소식 공유)
├── /notices       ← 공지사항 (확인 추적 기능 포함)
├── /albums        ← 사진첩 (행사별 앨범)
└── /polls         ← 설문/투표
```

---

## 3. 모듈별 상세 기획

### 3-1. 자유게시판 (Feed)

#### 개요
대원들의 공연소식, 경조사, 일상 등을 자유롭게 공유하는 공간.
네이버밴드의 "게시판"을 대체하되, 더 가볍고 모바일 친화적으로.

#### 게시글 유형 (카테고리 태그)
| 태그 | 설명 | 아이콘 |
|------|------|--------|
| `공연소식` | 개인/팀 공연 안내 | 🎵 Music |
| `경조사` | 결혼, 출산, 부고 등 | 🎉 Heart |
| `나눔` | 물품 나눔, 정보 공유 | 🤝 Gift |
| `일상` | 자유로운 일상 공유 | 💬 MessageCircle |
| `기도요청` | 기도 부탁 | 🙏 HandHeart |

#### 기능 상세

**게시글 작성**
- 제목 (선택사항, 최대 100자)
- 본문 (필수, 최대 5000자)
- 카테고리 태그 선택 (1개 필수)
- 이미지 첨부 (최대 5장, 각 10MB 이하)
- 작성자: 로그인한 사용자의 linked_member 이름 표시

**게시글 목록 (피드)**
- 최신순 정렬 (무한 스크롤)
- 카테고리 필터 탭 (전체 | 공연소식 | 경조사 | 나눔 | 일상 | 기도요청)
- 카드형 레이아웃: 작성자 아바타 + 이름 + 파트 뱃지 + 시간
- 이미지 프리뷰 (첫 이미지 썸네일)
- 댓글 수 표시

**게시글 상세**
- 전체 본문 + 이미지 갤러리 (스와이프)
- 댓글 목록 (최신순)
- 좋아요(공감) 버튼 + 카운트

**댓글**
- 텍스트만 (이미지 미지원, 간결함 유지)
- 최대 500자
- 대댓글 1단계까지 지원

**권한**
| 액션 | MEMBER | PART_LEADER | MANAGER+ |
|------|--------|-------------|----------|
| 게시글 읽기 | ✅ | ✅ | ✅ |
| 게시글 작성 | ✅ | ✅ | ✅ |
| 자기 글 수정/삭제 | ✅ | ✅ | ✅ |
| 타인 글 삭제 | ❌ | ❌ | ✅ (ADMIN만) |
| 댓글 작성 | ✅ | ✅ | ✅ |
| 자기 댓글 삭제 | ✅ | ✅ | ✅ |

---

### 3-2. 공지사항 (Notices)

#### 개요
찬양대 운영진이 작성하는 공식 공지. **핵심 차별점: 확인 추적**.
"누가 읽었고 누가 안 읽었는지" 파트장이 파트별로 확인 가능.

#### 기능 상세

**공지 작성** (MANAGER 이상 + SECRETARY)
- 제목 (필수, 최대 200자)
- 본문 (필수, 최대 10000자)
- 중요도: `일반` | `중요` | `긴급`
- 이미지/파일 첨부 (최대 5개)
- 고정 여부 (상단 고정 토글)
- 확인 요청 여부 토글 (ON이면 확인 추적 활성화)

**공지 목록**
- 고정 공지 상단 표시 (배경색 구분)
- 중요도별 아이콘/뱃지
- 미확인 공지 강조 표시 (노란색 dot 또는 NEW 뱃지)
- "확인 요청" 공지에는 확인 상태 표시 (내가 확인했는지)

**공지 상세 + 확인 기능**
- 공지 본문 표시
- **"확인했습니다" 버튼** (한 번 누르면 확인 완료, 취소 불가)
- 확인 시각 기록
- 댓글 기능 (질문/응답용)

**확인 현황 대시보드** (PART_LEADER 이상)
- **파트별 탭**: 소프라노 | 알토 | 테너 | 베이스
- 각 파트 내:
  - ✅ 확인 완료: 이름 + 확인 시각
  - ❌ 미확인: 이름 목록
  - 확인률 진행 바 (예: 소프라노 12/15명 확인)
- 전체 확인 현황 요약 (원형 차트)
- **PART_LEADER는 자기 파트만** 볼 수 있음
- **MANAGER 이상은 전체 파트** 볼 수 있음

**권한**
| 액션 | MEMBER | PART_LEADER | SECRETARY | MANAGER+ |
|------|--------|-------------|-----------|----------|
| 공지 읽기 | ✅ | ✅ | ✅ | ✅ |
| 공지 작성 | ❌ | ❌ | ✅ | ✅ |
| 공지 수정/삭제 | ❌ | ❌ | 자기 글만 | ✅ |
| 확인 버튼 | ✅ | ✅ | ✅ | ✅ |
| 확인 현황 조회 | ❌ | 자기 파트만 | 전체 | 전체 |

---

### 3-3. 사진첩 (Albums)

#### 개요
찬양대 행사별 사진을 앨범으로 정리. 행사가 앨범 단위가 되어
각 행사의 사진을 체계적으로 아카이빙.

#### 앨범 구조
```
사진첩
├── 2026 부활절 특별찬양 (2026-04-05)  ← 앨범
│   ├── photo_001.jpg                   ← 사진
│   ├── photo_002.jpg
│   └── ... (N장)
├── 2026 봄 MT (2026-03-15)
│   └── ...
└── 2025 성탄절 축하 음악회 (2025-12-24)
    └── ...
```

#### 기능 상세

**앨범 생성** (PART_LEADER 이상)
- 앨범 제목 (필수)
- 행사 날짜 (필수)
- 설명 (선택)
- 커버 이미지 (첫 번째 업로드 사진 또는 직접 선택)
- 연결된 choir_event 선택 (선택사항, 기존 행사와 연동 가능)

**사진 업로드** (모든 대원)
- 한 번에 최대 20장 업로드
- 지원 포맷: JPG, PNG, HEIC, WebP
- 자동 리사이징: 원본 보존 + 썸네일(400px) 생성
- 업로드한 사람 이름 기록
- 사진별 캡션 (선택)

**앨범 보기**
- 앨범 목록: 카드형 그리드 (커버 이미지 + 제목 + 날짜 + 사진 수)
- 연도별 필터
- 앨범 상세: 그리드 갤러리 (3열 모바일, 4-5열 데스크톱)
- 사진 상세: 풀스크린 뷰어 (좌우 스와이프, 확대/축소)
- 사진 다운로드 (개별/전체)

**권한**
| 액션 | MEMBER | PART_LEADER | MANAGER+ |
|------|--------|-------------|----------|
| 앨범 보기 | ✅ | ✅ | ✅ |
| 앨범 생성 | ❌ | ✅ | ✅ |
| 앨범 수정/삭제 | ❌ | 자기 생성 것만 | ✅ |
| 사진 업로드 | ✅ | ✅ | ✅ |
| 자기 사진 삭제 | ✅ | ✅ | ✅ |
| 타인 사진 삭제 | ❌ | ❌ | ✅ |
| 사진 다운로드 | ✅ | ✅ | ✅ |

---

### 3-4. 설문/투표 (Polls)

#### 개요
행사 참석 조사, 의견 수렴, 선호도 조사 등을 위한 간편한 도구.
복잡한 설문 도구(Google Forms)를 대체할 수준은 아니지만,
자주 사용하는 "예/아니오" 또는 "다중 선택" 수준의 빠른 투표 지원.

#### 설문 유형
| 유형 | 설명 | 예시 |
|------|------|------|
| `참석조사` | 행사 참석 여부 (참석/불참/미정) | "봄 MT 참석 가능하신가요?" |
| `선택투표` | 여러 옵션 중 선택 | "MT 장소 투표: A산장/B펜션/C글램핑" |
| `자유설문` | 주관식 답변 포함 | "부활절 특별찬양 곡 추천해주세요" |

#### 기능 상세

**설문 생성** (PART_LEADER 이상)
- 제목 (필수)
- 설명 (선택)
- 설문 유형 선택
- 마감일시 설정
- 익명 여부 토글
- 복수 선택 허용 여부 (선택투표 시)
- 선택지 추가/삭제 (선택투표 시)
- 주관식 필드 추가 (자유설문 시)

**투표 참여**
- 참석조사: 참석 ✅ / 불참 ❌ / 미정 ❓ 선택
- 선택투표: 옵션 중 선택 (복수 선택 가능 시 체크박스)
- 자유설문: 텍스트 입력
- 투표 후 변경 가능 (마감 전까지)

**결과 확인**
- 실시간 결과 표시 (막대 차트)
- 참석조사: 참석/불참/미정 인원 + 미응답 인원 목록
- 선택투표: 각 옵션별 득표 수 + 비율
- **PART_LEADER**: 자기 파트 응답/미응답 현황
- **MANAGER 이상**: 전체 파트별 응답 현황

**마감 후**
- 투표 불가, 결과만 조회
- 최종 결과 요약 자동 생성

**권한**
| 액션 | MEMBER | PART_LEADER | MANAGER+ |
|------|--------|-------------|----------|
| 설문 보기 | ✅ | ✅ | ✅ |
| 설문 생성 | ❌ | ✅ | ✅ |
| 투표 참여 | ✅ | ✅ | ✅ |
| 결과 조회 (자기 파트) | ❌ | ✅ | ✅ |
| 결과 조회 (전체) | ❌ | ❌ | ✅ |
| 설문 수정/삭제 | ❌ | 자기 생성 것만 | ✅ |

---

## 4. 네비게이션 통합

### 현재 네비게이션 구조
```
모바일 하단 내비 (4 + More):
[대시보드] [출석] [일정] [배치표] [더보기 →]

더보기 시트:
- 주보
- 대원관리
- 내 출석
- 마이페이지
- 관리자
```

### 변경안 (역할별)

```
Manager (ADMIN, CONDUCTOR, MANAGER, SECRETARY, TREASURER):
[홈] [출석] [커뮤니티] [임원] [더보기 →]

Member (PART_LEADER, MEMBER):
[홈] [커뮤니티] [일정] [내출석] [더보기 →]

커뮤니티 탭 진입 시 상단 탭:
[소식] [공지] [사진] [투표]

더보기 시트 (공통):
- 배치표
- 주보
- 마이페이지
- (Manager만) 관리자
```

**변경 이유**:
- 커뮤니티는 매일 확인하는 기능 → 하단 내비에 바로 노출
- Manager: 기존 `[자리]` 탭을 `[커뮤니티]`로 교체, 배치표는 "더보기"로 이동
- Member: 기존 `[자리]` 탭을 `[커뮤니티]`로 교체
- 역할별 내비 구조는 기존 `BottomNavigation.tsx`의 패턴을 유지

---

## 5. 데이터베이스 스키마 설계

### 새로운 테이블

```sql
-- ========================================
-- 5-1. 게시글 (자유게시판 + 공지사항 통합)
-- ========================================
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 게시글 유형
  post_type TEXT NOT NULL CHECK (post_type IN ('feed', 'notice')),
  
  -- 공통 필드
  title TEXT,                          -- 자유게시판: 선택, 공지: 필수
  content TEXT NOT NULL,               -- 본문
  author_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- 자유게시판 전용
  category TEXT CHECK (category IN (
    'performance', 'celebration', 'sharing', 'daily', 'prayer'
  )),
  
  -- 공지사항 전용
  priority TEXT CHECK (priority IN ('normal', 'important', 'urgent')),
  is_pinned BOOLEAN DEFAULT false,
  requires_confirmation BOOLEAN DEFAULT false,  -- 확인 추적 ON/OFF
  
  -- 메타데이터
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,             -- soft delete
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
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
-- 5-2. 게시글 첨부파일 (이미지/파일)
-- ========================================
CREATE TABLE post_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,             -- R2 파일 경로
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  thumbnail_path TEXT,                 -- 썸네일 경로 (이미지용)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_attachments_post 
  ON post_attachments(post_id, sort_order);

-- ========================================
-- 5-3. 댓글
-- ========================================
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,  -- 대댓글
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
-- 5-4. 좋아요 (공감)
-- ========================================
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ========================================
-- 5-5. 공지 확인 기록
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

-- ========================================
-- 5-6. 사진 앨범
-- ========================================
CREATE TABLE photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  cover_image_path TEXT,
  choir_event_id UUID REFERENCES choir_events(id),  -- 기존 행사 연결
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
-- 5-7. 앨범 사진
-- ========================================
CREATE TABLE album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,             -- R2 원본 이미지 경로
  thumbnail_path TEXT,                 -- 썸네일
  caption TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_album_photos_album 
  ON album_photos(album_id, created_at DESC);

-- ========================================
-- 5-8. 설문/투표
-- ========================================
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL CHECK (poll_type IN (
    'attendance',    -- 참석조사
    'choice',        -- 선택투표
    'open_ended'     -- 자유설문
  )),
  is_anonymous BOOLEAN DEFAULT false,
  allow_multiple BOOLEAN DEFAULT false,   -- 복수 선택 (choice 타입)
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
-- 5-9. 설문 선택지 (choice 타입용)
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
-- 5-10. 설문 응답
-- ========================================
CREATE TABLE poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- 참석조사용
  attendance_status TEXT CHECK (attendance_status IN (
    'attending', 'not_attending', 'undecided'
  )),
  
  -- 선택투표용 (poll_options 참조)
  selected_option_id UUID REFERENCES poll_options(id),
  
  -- 자유설문용
  text_response TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 참석조사/자유설문: 1인 1응답
-- 선택투표(복수 선택): 1인 N응답 가능
CREATE UNIQUE INDEX idx_poll_responses_unique_attendance
  ON poll_responses(poll_id, user_id)
  WHERE attendance_status IS NOT NULL;

CREATE UNIQUE INDEX idx_poll_responses_unique_text
  ON poll_responses(poll_id, user_id)
  WHERE text_response IS NOT NULL;

CREATE INDEX idx_poll_responses_poll 
  ON poll_responses(poll_id);
```

### Cloudflare R2 스토리지 (전체 통합)

Supabase Storage를 사용하지 않고, **모든 파일을 Cloudflare R2로 통합 관리**합니다.

#### 버킷 구조

```
saeropim-public (Public Access)     ← 공개형 (CDN 직접 접근)
├── arrangements/{arrangementId}/{uuid}.webp     ← 배치표 이미지
├── community/posts/{postId}/{uuid}.webp         ← 게시글 첨부 이미지
├── community/albums/{albumId}/{uuid}.webp       ← 앨범 원본 (max 1920px)
└── community/albums/{albumId}/thumb/{uuid}.webp ← 앨범 썸네일 (400px)

saeropim-private (Private)          ← 비공개형 (API Route 프록시 경유)
└── documents/{year}/{uuid}.{ext}                ← 회의록, 회계자료 등
```

#### 접근 제어 2단계 전략

| 유형 | 버킷 | 접근 방식 | 대상 |
|------|------|----------|------|
| **공개형** | saeropim-public | R2 CDN 직접 + UUID 난독화 | 배치표, 커뮤니티 사진 |
| **비공개형** | saeropim-private | Next.js API Route 프록시 | 문서 아카이브 (MANAGER+) |

```typescript
// 공개형: R2 CDN 직접 접근 (빠름, 서버 경유 없음)
const imageUrl = `${R2_PUBLIC_URL}/community/albums/${albumId}/${uuid}.webp`;

// 비공개형: API Route 프록시 (인증 + 역할 확인)
const downloadUrl = `/api/files/download?path=documents/2026/${uuid}.pdf`;
```

#### 비용 (100명 기준)

| 항목 | 1년차 | 2년차 | 3년차 | 5년차 |
|------|-------|-------|-------|-------|
| R2 저장 (10GB 무료) | $0 | $0 | ~$0.08 | ~$0.38 |
| R2 egress | $0 | $0 | $0 | $0 |
| **합계** | **$0** | **$0** | **~$0.08/월** | **~$0.38/월** |

#### R2 클라이언트 설정

```typescript
// src/lib/r2/client.ts
import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;
export const R2_PUBLIC_BUCKET = 'saeropim-public';
export const R2_PRIVATE_BUCKET = 'saeropim-private';
```

#### 환경 변수 추가

```env
# .env.local
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
NEXT_PUBLIC_R2_PUBLIC_URL=https://r2.saeropim.com  # 커스텀 도메인 또는 R2 public URL
```

#### 기존 Supabase Storage 마이그레이션 계획

```
Phase 1: R2 클라이언트 + 업로드 API 구현
Phase 2: 기존 documents/arrangements 업로드 코드를 R2로 전환
Phase 3: 기존 Supabase Storage 파일을 R2로 복사 (1회성 스크립트)
Phase 4: Supabase Storage 버킷 비활성화
```

---

## 6. RLS 정책 설계

### 기본 원칙
- 모든 인증 사용자가 읽기 가능 (찬양대 내부 전용)
- 쓰기는 linked_member_id가 있는 사용자만 (승인된 대원만)
- 삭제/수정은 작성자 본인 또는 ADMIN

### 핵심 정책

```sql
-- community_posts: 인증 사용자 읽기
CREATE POLICY "posts_select" ON community_posts
  FOR SELECT TO authenticated
  USING (is_deleted = false);

-- community_posts: linked member만 작성
CREATE POLICY "posts_insert" ON community_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND is_member_linked()
    AND (
      post_type = 'feed'
      OR (post_type = 'notice' AND has_role(ARRAY[
        'ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY'
      ]))
    )
  );

-- notice_confirmations: 파트장은 자기 파트 조회
CREATE POLICY "confirmations_select" ON notice_confirmations
  FOR SELECT TO authenticated
  USING (
    has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY'])
    OR (
      has_role(ARRAY['PART_LEADER'])
      AND user_id IN (
        SELECT up.id FROM user_profiles up
        JOIN members m ON up.linked_member_id = m.id
        WHERE m.part = (
          SELECT m2.part FROM members m2
          WHERE m2.id = get_linked_member_id()
        )
      )
    )
    OR user_id = auth.uid()  -- 본인 확인 내역
  );
```

---

## 7. API 라우트 설계

```
/api/files/                              ← R2 파일 관리 (전체 통합)
├── POST   /upload                       ← 파일 업로드 (인증 + R2 저장)
├── GET    /download?path=...            ← 비공개 파일 다운로드 (MANAGER+, 프록시)
└── DELETE /[...path]                    ← 파일 삭제 (권한 확인 + R2 삭제)

/api/community/
├── posts/
│   ├── GET    /                    ← 목록 (type, category 필터, 페이지네이션)
│   ├── POST   /                    ← 작성
│   ├── GET    /[id]                ← 상세
│   ├── PATCH  /[id]                ← 수정
│   ├── DELETE /[id]                ← 삭제 (soft)
│   ├── POST   /[id]/like           ← 좋아요 토글
│   ├── GET    /[id]/confirmations  ← 확인 현황 (파트장+)
│   └── POST   /[id]/confirm        ← 확인 처리
│
├── comments/
│   ├── GET    /?postId=...         ← 댓글 목록
│   ├── POST   /                    ← 댓글 작성
│   ├── PATCH  /[id]                ← 댓글 수정
│   └── DELETE /[id]                ← 댓글 삭제
│
├── albums/
│   ├── GET    /                    ← 앨범 목록
│   ├── POST   /                    ← 앨범 생성
│   ├── GET    /[id]                ← 앨범 상세 + 사진 목록
│   ├── PATCH  /[id]                ← 앨범 수정
│   ├── DELETE /[id]                ← 앨범 삭제
│   ├── POST   /[id]/photos         ← 사진 업로드 (R2 public 버킷)
│   └── DELETE /[id]/photos/[photoId] ← 사진 삭제
│
└── polls/
    ├── GET    /                    ← 설문 목록
    ├── POST   /                    ← 설문 생성
    ├── GET    /[id]                ← 설문 상세 + 내 응답
    ├── PATCH  /[id]                ← 설문 수정
    ├── DELETE /[id]                ← 설문 삭제
    ├── POST   /[id]/respond        ← 응답 제출
    └── GET    /[id]/results        ← 결과 조회 (권한별)
```

---

## 8. 프론트엔드 컴포넌트 구조

```
src/
├── app/community/
│   ├── layout.tsx              ← 커뮤니티 레이아웃 (상단 탭 내비)
│   ├── page.tsx                ← /community → feed로 리다이렉트
│   ├── feed/
│   │   ├── page.tsx            ← 자유게시판 목록
│   │   └── [id]/page.tsx       ← 게시글 상세
│   ├── notices/
│   │   ├── page.tsx            ← 공지사항 목록
│   │   ├── [id]/page.tsx       ← 공지 상세 + 확인 버튼
│   │   └── [id]/confirmations/page.tsx  ← 확인 현황
│   ├── albums/
│   │   ├── page.tsx            ← 앨범 목록
│   │   └── [id]/page.tsx       ← 앨범 상세 (사진 그리드)
│   └── polls/
│       ├── page.tsx            ← 설문 목록
│       └── [id]/page.tsx       ← 설문 상세 + 투표
│
├── components/features/community/
│   ├── feed/
│   │   ├── FeedList.tsx        ← 피드 무한스크롤 목록
│   │   ├── FeedCard.tsx        ← 게시글 카드
│   │   ├── FeedDetail.tsx      ← 게시글 상세
│   │   ├── PostForm.tsx        ← 게시글 작성/수정 폼
│   │   ├── CategoryFilter.tsx  ← 카테고리 필터 탭
│   │   └── ImageUploader.tsx   ← 이미지 업로드 컴포넌트
│   ├── notices/
│   │   ├── NoticeList.tsx      ← 공지 목록
│   │   ├── NoticeCard.tsx      ← 공지 카드 (중요도 뱃지)
│   │   ├── NoticeDetail.tsx    ← 공지 상세
│   │   ├── NoticeForm.tsx      ← 공지 작성/수정
│   │   ├── ConfirmButton.tsx   ← "확인했습니다" 버튼
│   │   └── ConfirmationStatus.tsx ← 파트별 확인 현황
│   ├── albums/
│   │   ├── AlbumGrid.tsx       ← 앨범 카드 그리드
│   │   ├── AlbumDetail.tsx     ← 앨범 상세 (사진 그리드)
│   │   ├── PhotoViewer.tsx     ← 풀스크린 사진 뷰어
│   │   ├── AlbumForm.tsx       ← 앨범 생성/수정
│   │   └── PhotoUploader.tsx   ← 다중 사진 업로드
│   ├── polls/
│   │   ├── PollList.tsx        ← 설문 목록
│   │   ├── PollCard.tsx        ← 설문 카드
│   │   ├── PollDetail.tsx      ← 설문 상세 + 투표 UI
│   │   ├── PollForm.tsx        ← 설문 생성
│   │   ├── PollResults.tsx     ← 결과 차트
│   │   └── AttendanceVote.tsx  ← 참석조사 특화 UI
│   └── common/
│       ├── CommentSection.tsx  ← 댓글 컴포넌트 (공용)
│       ├── LikeButton.tsx      ← 좋아요 버튼 (공용)
│       ├── AuthorBadge.tsx     ← 작성자 이름 + 파트 뱃지
│       └── TimeAgo.tsx         ← 상대 시간 표시 ("3시간 전")
│
├── hooks/
│   ├── usePosts.ts             ← 게시글 CRUD hooks
│   ├── useComments.ts          ← 댓글 CRUD hooks
│   ├── useAlbums.ts            ← 앨범/사진 hooks
│   ├── usePolls.ts             ← 설문 CRUD + 투표 hooks
│   ├── useConfirmations.ts     ← 공지 확인 hooks
│   └── useFileUpload.ts        ← R2 파일 업로드 hook (공용)
│
├── lib/
│   └── r2/
│       ├── client.ts           ← R2 S3Client 설정 (서버 전용)
│       ├── upload.ts           ← R2 업로드 유틸리티
│       └── constants.ts        ← 버킷명, URL, 제한값 상수
│
└── types/
    └── community.ts            ← 커뮤니티 관련 타입 정의
```

---

## 9. 구현 우선순위 (Phase 계획)

### Phase 0: R2 인프라 + 스토리지 마이그레이션 ✅ 완료
**이유**: 모든 커뮤니티 기능이 R2에 의존하므로 먼저 기반을 구축.
기존 documents 기능도 R2로 전환하여 Supabase Storage 의존성 제거.

**완료 항목**:
- [x] Cloudflare R2 버킷 생성 (saeropim-public, saeropim-private)
- [x] `src/lib/r2/` 클라이언트 + 업로드 유틸 구현
- [x] `/api/files/upload`, `/api/files/download`, `/api/files/delete` API Route
- [x] `useDocuments.ts` R2 전환
- [x] `.env.example` R2 환경변수 추가

**미완료 (후속 처리)**:
- [ ] 배치표 이미지 업로드 R2 전환 (현재 업로드 코드 미사용 확인, 필요 시 전환)
- [ ] 기존 Supabase Storage 파일 R2 복사 스크립트 (해당 파일 없음, 보류)

---

### Phase A-1: 커뮤니티 인프라 + 공지사항 (최우선) ⬅ 다음
**이유**: 네이버밴드 대체의 가장 큰 pain point.
확인 추적 기능은 현재 아예 없어서 가장 절실한 기능.
**공지사항과 자유게시판이 `community_posts` 테이블을 공유**하므로,
DB 마이그레이션은 커뮤니티 전체 테이블(10개)을 한 번에 생성한다.

**범위**:
1. **단일 DB 마이그레이션** (커뮤니티 전체 테이블 10개)
   - `community_posts`, `post_attachments`, `post_comments`, `post_likes`
   - `notice_confirmations`
   - `photo_albums`, `album_photos`
   - `polls`, `poll_options`, `poll_responses`
   - RLS 정책, 인덱스, DB 트리거 (like_count, comment_count 동기화)
   - RPC 함수 (`is_member_linked()`, `get_linked_member_id()` 등)
2. **커뮤니티 레이아웃 + 네비게이션 변경**
   - `/community` 레이아웃 (상단 탭: 소식 | 공지 | 사진 | 투표)
   - `BottomNavigation.tsx` 수정 (커뮤니티 탭 추가, 역할별)
   - 미확인 공지 뱃지 (하단 내비에 빨간 dot)
3. **공지사항 기능**
   - 공지 CRUD (작성/조회/수정/삭제)
   - "확인했습니다" 버튼 + 확인 현황 대시보드
   - 파트별 확인률 조회 (PART_LEADER: 자기 파트, MANAGER+: 전체)
   - 고정 공지, 중요도 뱃지
4. **공용 컴포넌트 기반 구축**
   - `CommentSection.tsx` (공지+게시판 공용)
   - `AuthorBadge.tsx` (작성자 이름 + 파트 뱃지)
   - `TimeAgo.tsx` (상대 시간 표시)
   - `useFileUpload.ts` (R2 업로드 공용 훅)

**예상 작업**:
- DB 마이그레이션 1개 (전체 커뮤니티 테이블)
- API 라우트 8개
- 컴포넌트 10-12개
- Hook 3개 (usePosts, useConfirmations, useFileUpload)
- `browser-image-compression` 패키지 설치
- R2 CORS 설정

---

### Phase A-2: 자유게시판 (피드)
**이유**: 소통 활성화의 핵심. **DB 테이블은 이미 A-1에서 생성 완료**.
community_posts의 feed 타입 활용 + 첨부파일/댓글/좋아요 UI 구현.

**범위**:
- 피드 목록 (카테고리 필터, 무한 스크롤, 커서 기반 페이지네이션)
- 게시글 CRUD + 이미지 첨부 (R2 public 버킷)
- 댓글 (대댓글 1단계) — A-1의 CommentSection 재사용
- 좋아요 토글
- 클라이언트 이미지 압축 (HEIC → WebP, browser-image-compression)

**예상 작업**:
- DB 마이그레이션 없음 (A-1에서 완료)
- API 라우트 6개
- 컴포넌트 8-10개
- Hook 2개 (usePosts 확장, useComments)

---

### Phase B: 설문/투표
**이유**: 행사 참석 조사를 카톡으로 하는 현재 방식 대체.
DB 테이블은 A-1에서 이미 생성됨.

**범위**:
- 설문 생성 + 투표 UI + 결과 차트
- 3가지 설문 유형 (참석조사, 선택투표, 자유설문)
- 파트별 응답 현황 (PART_LEADER/MANAGER 뷰)
- 마감 자동 처리

**예상 작업**:
- DB 마이그레이션 없음 (A-1에서 완료)
- API 라우트 6개
- 컴포넌트 6-8개
- Hook 1개 (usePolls)

---

### Phase C: 사진첩
**이유**: Phase 0의 R2 기반 + Phase A-1의 DB 테이블이 이미 구축되어 있으므로
순수하게 UI와 업로드 로직만 구현하면 됨.

**범위**:
- 앨범 CRUD + 다중 사진 업로드 (R2 public 버킷, Phase 0 재사용)
- 갤러리 뷰어 + 풀스크린 사진 뷰어 (스와이프, 확대/축소)
- 클라이언트 측 WebP 변환 + 썸네일 생성
- 사진 다운로드 (개별/전체)

**예상 작업**:
- DB 마이그레이션 없음 (A-1에서 완료)
- API 라우트 7개
- 컴포넌트 5-7개
- Hook 1개 (useAlbums)

---

## 10. 네이버밴드 대비 경쟁력

| 기능 | 네이버밴드 | 새로핌ON |
|------|-----------|---------|
| 공지 확인 추적 | ❌ (누가 읽었는지 불명) | ✅ 파트별 확인 현황 대시보드 |
| 출석과 연동 | ❌ 별도 플랫폼 | ✅ 같은 앱에서 출석+커뮤니티 |
| 배치표 연동 | ❌ | ✅ 배치표 확정 알림 → 커뮤니티 |
| 파트별 필터 | ❌ | ✅ 파트장 전용 뷰 |
| 찬양대 특화 | ❌ 범용 커뮤니티 | ✅ 찬양대원 역할/권한 통합 |
| 사진 아카이빙 | △ (날짜순만) | ✅ 행사별 앨범 분류 |
| 설문/투표 | ✅ 있음 | ✅ + 파트별 응답 현황 |
| 앱 전환 불필요 | ❌ (밴드→카톡→새로핌) | ✅ 원스톱 |

---

## 11. 기술적 고려사항

### 성능
- 피드 목록: 커서 기반 페이지네이션 (offset 방식 X)
- 이미지: 썸네일 우선 로드 → 원본은 상세 뷰에서만
- 댓글: 별도 API 호출 (게시글과 분리)
- 좋아요 카운트: DB trigger로 실시간 동기화

### 스토리지 (Cloudflare R2 전체 통합)
- Supabase Storage 사용 안 함 → Free Tier 한도 걱정 제거
- 공개 버킷(saeropim-public): CDN 직접 접근, UUID 난독화로 보안
- 비공개 버킷(saeropim-private): API Route 프록시, MANAGER+ 인증
- 이미지 리사이징: 클라이언트에서 `browser-image-compression`으로 처리
  - 원본: 최대 1920px, WebP 변환
  - 썸네일: 400px, WebP 변환
- HEIC → WebP 자동 변환 (용량 60-70% 절감)
- 앨범당 최대 200장 제한 (100명 규모 고려)
- R2 Free Tier: 10GB 저장 + 무제한 egress → 2년차까지 완전 무료

### R2 CORS 설정
R2 public 버킷에서 이미지를 직접 로드하려면 CORS 설정이 필요합니다.
Cloudflare Dashboard > R2 > saeropim-public > Settings > CORS Policy:

```json
[
  {
    "AllowedOrigins": ["https://saeropim.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

### 클라이언트 이미지 처리
- `browser-image-compression` 패키지로 업로드 전 클라이언트에서 압축
- HEIC/HEIF → WebP 자동 변환 (iOS 사진 지원)
- 원본: max 1920px, quality 0.8, WebP
- 썸네일: 400px, quality 0.6, WebP
- 5MB 초과 이미지 자동 리사이즈

```bash
npm install browser-image-compression
```

### 미확인 공지 뱃지
- 하단 내비의 커뮤니티 아이콘에 빨간 dot 표시 (미확인 공지가 있을 때)
- `useUnreadNoticeCount()` 훅으로 미확인 공지 수 조회
- Supabase RPC: `SELECT COUNT(*) FROM community_posts WHERE ...` (확인 요청 공지 중 미확인)
- 공지 확인 시 뱃지 실시간 업데이트 (React Query invalidation)

### 알림 (향후 확장)
- 긴급 공지 등록 시 → 푸시 알림 (PWA Push API)
- 내 글에 댓글 달림 → 인앱 알림
- 새 설문 등록 → 대시보드 배너

---

## 12. 와이어프레임 개요 (텍스트)

### 커뮤니티 메인 (모바일)
```
┌─────────────────────────┐
│  [◀] 커뮤니티      [✏️]  │  ← 헤더 + 글쓰기 버튼
├─────────────────────────┤
│ [소식] [공지] [사진] [투표] │  ← 탭 네비게이션
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ 🎵 김OO (소프라노)  │  │  ← 카테고리 아이콘 + 작성자
│  │ 3시간 전           │  │
│  │                   │  │
│  │ 이번 주 토요일에   │  │  ← 본문 미리보기
│  │ 예술의전당에서...  │  │
│  │ [📷 이미지]        │  │  ← 이미지 썸네일
│  │                   │  │
│  │ ❤️ 5  💬 3         │  │  ← 좋아요/댓글 수
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ 🎉 박OO (테너)     │  │
│  │ ...               │  │
│  └───────────────────┘  │
│                         │
│  [무한 스크롤...]       │
│                         │
├─────────────────────────┤
│ [홈][커뮤니티][일정]... │  ← 하단 내비
└─────────────────────────┘
```

### 공지사항 확인 현황 (파트장 뷰)
```
┌─────────────────────────┐
│  [◀] 확인 현황           │
├─────────────────────────┤
│                         │
│  📋 "4월 정기총회 안내"  │
│  확인률: 42/58명 (72%)   │
│  ████████████░░░░░  72%  │
│                         │
├─────────────────────────┤
│ [소프] [알토] [테너] [베이스] │
├─────────────────────────┤
│                         │
│  소프라노 (12/15명)      │
│  ████████████░░░  80%    │
│                         │
│  ✅ 확인 완료            │
│  ├ 김OO  4/13 09:23     │
│  ├ 이OO  4/13 10:15     │
│  └ ...                  │
│                         │
│  ❌ 미확인 (3명)         │
│  ├ 박OO                 │
│  ├ 최OO                 │
│  └ 정OO                 │
│                         │
└─────────────────────────┘
```

---

## 13. 스토리지 전략: Cloudflare R2 전체 통합

### 결정 배경

Supabase Free Tier의 Storage 한도(1GB 저장, 2GB/월 egress)는 100명 규모의 커뮤니티 사진+문서를 감당할 수 없다.
Pro Plan($25/월)은 비영리 교회 프로젝트에 과한 비용이다.
**따라서 모든 파일 스토리지를 Cloudflare R2로 통합**하고, Supabase는 DB + Auth 전용으로 사용한다.

### 사용량 추정 (100명 규모)

| 항목 | 수치 |
|------|------|
| 연간 사진 수 | ~3,000-4,000장 |
| 원본 평균 크기 | ~3MB (HEIC/JPG → WebP 변환 후 ~1MB) |
| 썸네일 평균 | ~50KB |
| 연간 저장량 (사진) | ~4-5GB |
| 연간 저장량 (문서) | ~500MB |
| 3년 누적 | ~15-20GB |
| 월간 egress | ~1.5-2GB (썸네일 위주) |

### R2 Free Tier 여유도

| 항목 | R2 Free Tier | 100명 사용량 | 여유 |
|------|-------------|-------------|------|
| **저장** | 10GB | 연 ~5GB | 2년차까지 무료 |
| **Egress** | **무제한 $0** | 월 2GB든 20GB든 | **영원히 무료** |
| **Class A (쓰기)** | 100만/월 | ~500/월 | 충분 |
| **Class B (읽기)** | 1000만/월 | ~30,000/월 | 충분 |

### 비용 비교 (Supabase Free + R2 vs Supabase Pro)

| 시점 | Supabase Free + R2 | Supabase Pro |
|------|-------------------|-------------|
| **1년차** | **$0** | $25/월 ($300/년) |
| **2년차** | **$0** | $25/월 ($300/년) |
| **3년차** | **~$0.08/월** ($1/년) | $25/월 ($300/년) |
| **5년차** | **~$0.38/월** ($4.6/년) | $25/월 ($300/년) |
| **5년 합계** | **~$5.6** | **~$1,500** |

> R2 통합 시 5년간 약 **$1,494 절감**

### 아키텍처

```
┌─────────────┐      ┌──────────────────┐
│   클라이언트   │──── │ Supabase (Free)   │
│  (Next.js)   │      │ ├── PostgreSQL DB  │
│              │      │ ├── Auth           │
│              │      │ └── RLS 정책       │
│              │      └──────────────────┘
│              │
│              │      ┌──────────────────┐
│              │──── │ Cloudflare R2      │
│              │      │ ├── saeropim-public  (CDN 직접)│
│              │      │ └── saeropim-private (API 프록시)│
│              │      └──────────────────┘
└─────────────┘
```

### 접근 제어 해결

**공개형 (배치표, 커뮤니티 사진)**: R2 Public Bucket + UUID 난독화
- URL 형태: `https://r2.saeropim.com/community/albums/{albumId}/{uuid}.webp`
- UUID를 모르면 접근 불가, URL은 DB에서만 조회 (Supabase RLS 보호)
- 네이버밴드/Google Photos/Slack과 동일한 업계 표준 방식

**비공개형 (문서 아카이브)**: Next.js API Route 프록시

```typescript
// src/app/api/files/download/route.ts
export async function GET(req: NextRequest) {
  // 1. Supabase Auth 인증 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 2. MANAGER 이상 역할 확인
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single();
  if (!['ADMIN', 'CONDUCTOR', 'MANAGER'].includes(profile?.role)) {
    return new Response('Forbidden', { status: 403 });
  }

  // 3. R2에서 파일 가져와서 프록시 반환
  const path = req.nextUrl.searchParams.get('path');
  const object = await r2Client.send(new GetObjectCommand({
    Bucket: R2_PRIVATE_BUCKET, Key: path,
  }));
  return new Response(object.Body as ReadableStream, {
    headers: {
      'Content-Type': object.ContentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
```

### 업로드 플로우

```
[사용자 선택] → [클라이언트 이미지 처리] → [API Route] → [R2 업로드] → [DB 메타 저장]

1. 사용자가 파일 선택
2. 클라이언트에서 browser-image-compression으로:
   - HEIC/JPG/PNG → WebP 변환
   - 원본: max 1920px 리사이즈
   - 썸네일: 400px 리사이즈
3. Next.js API Route에서 Supabase Auth 인증 확인
4. R2에 원본 + 썸네일 업로드 (PutObjectCommand)
5. DB 테이블에 메타데이터 저장 (file_path, file_url 등)
```

### 기존 Supabase Storage → R2 마이그레이션

| 단계 | 작업 | 상태 |
|------|------|------|
| Phase 1 | R2 클라이언트(`src/lib/r2/`) + 업로드 API 구현 | ✅ 완료 |
| Phase 2 | `useDocuments.ts` 업로드/다운로드를 R2로 전환 | ✅ 완료 |
| Phase 3 | `arrangements` 이미지 업로드를 R2로 전환 | 보류 (업로드 코드 미사용 확인) |
| Phase 4 | 기존 Storage 파일 R2 복사 (1회성 스크립트) | 보류 (해당 파일 없음) |
| Phase 5 | Supabase Storage 버킷 비활성화 | 보류 |

> Phase 1-2 완료. 커뮤니티 기능 구현 착수 가능.

---

## 부록: 향후 확장 아이디어

1. **실시간 채팅** - 파트별 채팅방 (Supabase Realtime 활용)
2. **생일 자동 축하** - members 테이블에 생년월일 추가 → 자동 게시
3. **출석 연동 알림** - "이번 주 출석 미투표" → 커뮤니티 배너
4. **행사 캘린더 연동** - choir_events + 설문/사진첩 자동 연결
5. **댓글 멘션** - @이름 으로 특정 대원 태그
