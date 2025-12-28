# 프로젝트 설정 완료 문서

## 완료된 작업

### 1. Next.js 프로젝트 초기화

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- ESLint

### 2. 데이터베이스 설정

- Prisma ORM 설정
- PostgreSQL 스키마 정의
  - Member (찬양대원)
  - Attendance (출석)
  - Arrangement (배치표)
  - Seat (좌석)
  - User (사용자)

### 3. 필수 라이브러리 설치

- @tanstack/react-query: 서버 상태 관리
- zustand: 클라이언트 상태 관리
- react-dnd + react-dnd-html5-backend: 드래그 앤 드롭
- clsx + tailwind-merge: 스타일 유틸리티
- lucide-react: 아이콘
- date-fns: 날짜 처리

### 4. 프로젝트 구조

```
src/
├── app/                  # 페이지
├── components/           # 컴포넌트
│   ├── ui/
│   ├── layout/
│   └── features/
│       ├── members/
│       ├── arrangements/
│       └── seats/
├── lib/                  # 유틸리티
│   ├── prisma.ts
│   ├── providers.tsx
│   └── utils.ts
├── types/                # 타입 정의
├── hooks/                # 커스텀 훅
└── store/                # 상태 관리
```

### 5. 환경 설정

- .env.example 생성
- .gitignore 업데이트
- README.md 작성

## 다음 단계

### Phase 2: 인원 관리 기능

1. Member CRUD API 구현 (`/api/members`)
2. 인원 목록 페이지 (`/members`)
3. 인원 등록/수정 폼
4. 파트별 필터링
5. 검색 기능

### Phase 3: 출석 관리

1. Attendance API 구현
2. 주간 출석 체크 UI
3. 출석 현황 대시보드

### Phase 4: 자리배치 UI

1. 드래그 앤 드롭 그리드
2. 자리배치 편집기
3. 실시간 통계 표시

### Phase 5: AI 자동 배치

1. Python ML 서비스 구축
2. 66개 이미지 OCR 처리
3. 배치 패턴 학습
4. 추천 알고리즘 구현

### Phase 6: 배치표 생성

1. HTML to Canvas
2. 이미지 생성
3. PDF 내보내기
4. S3 업로드

### Phase 7: 카카오톡 연동

1. Kakao OAuth
2. Message API
3. 알림 기능

## 실행 방법

### 개발 서버

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

### 프로덕션 실행

```bash
npm start
```

### Prisma 명령어

```bash
# 마이그레이션 생성
npx prisma migrate dev --name <name>

# Prisma Studio 실행
npx prisma studio

# Client 재생성
npx prisma generate
```

## 주의사항

1. `.env` 파일은 Git에 커밋되지 않습니다
2. Prisma Client는 `src/generated/prisma`에 생성됩니다
3. PostgreSQL이 실행 중이어야 합니다
4. DATABASE_URL 환경 변수가 올바르게 설정되어야 합니다

## 문제 해결

### Prisma Client 오류

```bash
npx prisma generate
```

### 포트 충돌

```bash
# 기본 포트 3000 대신 다른 포트 사용
PORT=3001 npm run dev
```

### TypeScript 오류

```bash
# TypeScript 캐시 삭제
rm -rf .next
npm run dev
```
