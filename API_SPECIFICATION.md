# API 명세서 (API Specification)

찬양대 자리배치 시스템

**버전**: 1.0.0
**Base URL**: `http://localhost:3000/api`
**프로토콜**: HTTP/HTTPS
**데이터 형식**: JSON
**최종 수정일**: 2024년 11월 18일

---

## 목차

1. [개요](#1-개요)
2. [인증](#2-인증)
3. [공통 사양](#3-공통-사양)
4. [에러 처리](#4-에러-처리)
5. [Members API](#5-members-api)
6. [Attendance API](#6-attendance-api)
7. [Arrangements API](#7-arrangements-api)
8. [Seats API](#8-seats-api)
9. [AI Recommendation API](#9-ai-recommendation-api)
10. [Image Generation API](#10-image-generation-api)
11. [Statistics API](#11-statistics-api)
12. [부록](#12-부록)

---

## 1. 개요

### 1.1 API 구조

찬양대 자리배치 시스템은 Next.js API Routes를 사용하여 RESTful API를 제공합니다.

```text
/api
├── /members          # 찬양대원 관리
├── /attendances      # 등단 현황 관리
├── /arrangements     # 자리배치 관리
├── /seats            # 좌석 관리
├── /ai               # AI 추천
├── /images           # 이미지 생성
└── /stats            # 통계
```

### 1.2 API 버전 관리

현재 버전: `v1` (기본값)

향후 버전 변경 시 URL에 버전을 포함:

```text
/api/v2/members
```

### 1.3 데이터 타입

#### Part Enum

```typescript
type Part = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | 
```

#### 날짜 형식

- ISO 8601 형식 사용: `2024-11-18T09:00:00.000Z`
- 요청/응답 모두 UTC 기준

---

## 2. 인증

### 2.1 현재 상태 (Phase 1-6)

**인증 없음** - 개발 및 초기 배포 단계에서는 인증을 적용하지 않습니다.

### 2.2 향후 계획 (Phase 7)

#### JWT 기반 인증

```http
Authorization: Bearer <token>
```

#### 역할 기반 접근 제어 (RBAC)

- **ADMIN**: 모든 권한
- **CONDUCTOR**: 자리배치 관리, 등단 현황 조회
- **MEMBER**: 자신의 등단 현황만 조회/수정

---

## 3. 공통 사양

### 3.1 요청 헤더

```http
Content-Type: application/json
Accept: application/json
```

### 3.2 응답 형식

#### 성공 응답 (단일 리소스)

```json
{
  "success": true,
  "data": {
    "id": "clxy123456",
    "name": "김철수",
    ...
  }
}
```

#### 성공 응답 (다중 리소스)

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

#### 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 유효하지 않습니다.",
    "details": [
      {
        "field": "email",
        "message": "이메일 형식이 올바르지 않습니다."
      }
    ]
  }
}
```

### 3.3 페이지네이션

쿼리 파라미터:

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20, 최대: 100)

```http
GET /api/members?page=2&limit=20
```

### 3.4 필터링 및 정렬

```http
GET /api/members?part=SOPRANO&sort=name&order=asc
```

### 3.5 검색

```http
GET /api/members?search=김철수
```

---

## 4. 에러 처리

### 4.1 HTTP 상태 코드

| 상태 코드 | 설명 |
|----------|------|
| 200 | 요청 성공 |
| 201 | 리소스 생성 성공 |
| 204 | 성공 (응답 본문 없음) |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 데이터 등) |
| 422 | 처리 불가능한 엔티티 (유효성 검증 실패) |
| 500 | 서버 오류 |

### 4.2 에러 코드

| 코드 | 설명 |
|------|------|
| `VALIDATION_ERROR` | 입력값 유효성 검증 실패 |
| `NOT_FOUND` | 리소스를 찾을 수 없음 |
| `DUPLICATE_ERROR` | 중복된 리소스 |
| `DATABASE_ERROR` | 데이터베이스 오류 |
| `UNAUTHORIZED` | 인증 필요 |
| `FORBIDDEN` | 권한 없음 |
| `INTERNAL_ERROR` | 서버 내부 오류 |
| `AI_SERVICE_ERROR` | AI 서비스 오류 |
| `IMAGE_GENERATION_ERROR` | 이미지 생성 오류 |

### 4.3 에러 응답 예시

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "찬양대원을 찾을 수 없습니다.",
    "timestamp": "2024-11-18T10:30:00.000Z",
    "path": "/api/members/clxy123456"
  }
}
```

---

## 5. Members API

찬양대원 관리 API

### 5.1 찬양대원 목록 조회

```http
GET /api/members
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| page | number | X | 페이지 번호 | 1 |
| limit | number | X | 페이지당 항목 수 | 20 |
| part | Part | X | 파트 필터 | - |
| search | string | X | 이름 검색 | - |
| sort | string | X | 정렬 필드 (name, createdAt) | createdAt |
| order | string | X | 정렬 순서 (asc, desc) | desc |
| isLeader | boolean | X | 리더 필터 | - |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "clxy123456",
      "name": "김철수",
      "part": "TENOR",
      "height": 175,
      "experience": 3,
      "isLeader": true,
      "phoneNumber": "010-1234-5678",
      "email": "kimcs@example.com",
      "notes": "솔리스트",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-11-18T00:00:00.000Z"
    },
    {
      "id": "clxy789012",
      "name": "이영희",
      "part": "SOPRANO",
      "height": 162,
      "experience": 5,
      "isLeader": false,
      "phoneNumber": "010-9876-5432",
      "email": "leeyh@example.com",
      "notes": null,
      "createdAt": "2023-08-20T00:00:00.000Z",
      "updatedAt": "2024-11-18T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### 5.2 찬양대원 상세 조회

```http
GET /api/members/:id
```

#### URL 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | O | 찬양대원 ID |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clxy123456",
    "name": "김철수",
    "part": "TENOR",
    "height": 175,
    "experience": 3,
    "isLeader": true,
    "phoneNumber": "010-1234-5678",
    "email": "kimcs@example.com",
    "notes": "솔리스트",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-11-18T00:00:00.000Z",
    "_count": {
      "attendances": 45,
      "seats": 42
    }
  }
}
```

### 5.3 찬양대원 생성

```http
POST /api/members
```

#### 요청 본문

```json
{
  "name": "박민수",
  "part": "BASS",
  "height": 180,
  "experience": 2,
  "isLeader": false,
  "phoneNumber": "010-5555-6666",
  "email": "parkms@example.com",
  "notes": "신입 찬양대원"
}
```

#### 필드 설명

| 필드 | 타입 | 필수 | 설명 | 제약 조건 |
|------|------|------|------|----------|
| name | string | O | 이름 | 1-50자 |
| part | Part | O | 파트 | SOPRANO, ALTO, TENOR, BASS, SPECIAL |
| height | number | X | 키 (cm) | 100-250 |
| experience | number | X | 경력 (년) | 0-100 |
| isLeader | boolean | X | 리더 여부 | 기본값: false |
| phoneNumber | string | X | 전화번호 | 010-XXXX-XXXX 형식 |
| email | string | X | 이메일 | 유효한 이메일 형식, 고유값 |
| notes | string | X | 특이사항 | 최대 500자 |

#### 응답 예시 (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clxy345678",
    "name": "박민수",
    "part": "BASS",
    "height": 180,
    "experience": 2,
    "isLeader": false,
    "phoneNumber": "010-5555-6666",
    "email": "parkms@example.com",
    "notes": "신입 찬양대원",
    "createdAt": "2024-11-18T10:30:00.000Z",
    "updatedAt": "2024-11-18T10:30:00.000Z"
  }
}
```

#### 에러 응답 (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 유효하지 않습니다.",
    "details": [
      {
        "field": "email",
        "message": "이메일 형식이 올바르지 않습니다."
      },
      {
        "field": "part",
        "message": "유효한 파트를 선택해주세요."
      }
    ]
  }
}
```

#### 에러 응답 (409 Conflict)

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ERROR",
    "message": "이미 등록된 이메일입니다.",
    "field": "email"
  }
}
```

### 5.4 찬양대원 수정

```http
PUT /api/members/:id
PATCH /api/members/:id
```

- `PUT`: 전체 업데이트
- `PATCH`: 부분 업데이트 (권장)

#### 수정 응답 예시 (200 OK)

```json
{
  "height": 182,
  "experience": 3,
  "notes": "솔리스트로 승격"
}
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clxy345678",
    "name": "박민수",
    "part": "BASS",
    "height": 182,
    "experience": 3,
    "isLeader": false,
    "phoneNumber": "010-5555-6666",
    "email": "parkms@example.com",
    "notes": "솔리스트로 승격",
    "createdAt": "2024-11-18T10:30:00.000Z",
    "updatedAt": "2024-11-18T11:00:00.000Z"
  }
}
```

### 5.5 찬양대원 삭제

```http
DELETE /api/members/:id
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "message": "찬양대원이 삭제되었습니다.",
  "data": {
    "id": "clxy345678"
  }
}
```

#### 참고사항

- Cascade 삭제: 해당 찬양대원의 모든 Attendance와 Seat 레코드도 함께 삭제됩니다.

---

## 6. Attendance API

등단 현황 관리 API

### 6.1 등단 현황 조회

```http
GET /api/attendances
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| date | string | X | 특정 날짜 (YYYY-MM-DD) | - |
| startDate | string | X | 시작 날짜 | - |
| endDate | string | X | 종료 날짜 | - |
| memberId | string | X | 찬양대원 ID | - |
| isAvailable | boolean | X | 등단 가능 여부 | - |
| page | number | X | 페이지 번호 | 1 |
| limit | number | X | 페이지당 항목 수 | 20 |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "clxy111111",
      "memberId": "clxy123456",
      "member": {
        "id": "clxy123456",
        "name": "김철수",
        "part": "TENOR"
      },
      "date": "2024-11-24T00:00:00.000Z",
      "isAvailable": true,
      "notes": null,
      "createdAt": "2024-11-18T10:00:00.000Z",
      "updatedAt": "2024-11-18T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### 6.2 특정 날짜 등단 현황 조회 (파트별 통계 포함)

```http
GET /api/attendances/by-date/:date
```

#### URL 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| date | string | O | 날짜 (YYYY-MM-DD) | 2024-11-24 |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "date": "2024-11-24T00:00:00.000Z",
    "attendances": [
      {
        "id": "clxy111111",
        "memberId": "clxy123456",
        "member": {
          "id": "clxy123456",
          "name": "김철수",
          "part": "TENOR",
          "isLeader": true
        },
        "isAvailable": true,
        "notes": null
      }
    ],
    "stats": {
      "total": 45,
      "available": 42,
      "unavailable": 3,
      "byPart": {
        "SOPRANO": { "total": 12, "available": 11 },
        "ALTO": { "total": 10, "available": 9 },
        "TENOR": { "total": 11, "available": 11 },
        "BASS": { "total": 12, "available": 11 }
      }
    }
  }
}
```

### 6.3 등단 현황 생성/수정 (Upsert)

```http
POST /api/attendances
```

#### 요청 본문

```json
{
  "memberId": "clxy123456",
  "date": "2024-11-24",
  "isAvailable": true,
  "notes": "정상 등단"
}
```

#### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| memberId | string | O | 찬양대원 ID |
| date | string | O | 날짜 (YYYY-MM-DD) |
| isAvailable | boolean | O | 등단 가능 여부 |
| notes | string | X | 비고 (최대 200자) |

#### 응답 예시 (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clxy222222",
    "memberId": "clxy123456",
    "date": "2024-11-24T00:00:00.000Z",
    "isAvailable": true,
    "notes": "정상 등단",
    "createdAt": "2024-11-18T11:00:00.000Z",
    "updatedAt": "2024-11-18T11:00:00.000Z"
  }
}
```

### 6.4 등단 현황 일괄 등록

```http
POST /api/attendances/bulk
```

#### 요청 본문

```json
{
  "date": "2024-11-24",
  "attendances": [
    { "memberId": "clxy123456", "isAvailable": true, "notes": null },
    { "memberId": "clxy789012", "isAvailable": false, "notes": "개인 사정" },
    { "memberId": "clxy345678", "isAvailable": true, "notes": null }
  ]
}
```

#### 응답 예시 (201 Created)

```json
{
  "success": true,
  "data": {
    "created": 3,
    "updated": 0,
    "failed": 0,
    "results": [
      { "memberId": "clxy123456", "status": "created" },
      { "memberId": "clxy789012", "status": "created" },
      { "memberId": "clxy345678", "status": "created" }
    ]
  }
}
```

### 6.5 등단 현황 삭제

```http
DELETE /api/attendances/:id
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "message": "등단 현황이 삭제되었습니다."
}
```

---

## 7. Arrangements API

자리배치 관리 API

### 7.1 자리배치 목록 조회

```http
GET /api/arrangements
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| page | number | X | 페이지 번호 | 1 |
| limit | number | X | 페이지당 항목 수 | 20 |
| startDate | string | X | 시작 날짜 | - |
| endDate | string | X | 종료 날짜 | - |
| isPublished | boolean | X | 공개 여부 | - |
| sort | string | X | 정렬 (date, createdAt) | date |
| order | string | X | 순서 (asc, desc) | desc |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "clxy333333",
      "date": "2024-11-24T00:00:00.000Z",
      "title": "2024년 11월 24일 등단자리표",
      "serviceInfo": "본 찬양: 네 주는 강한 성이요",
      "conductor": "홍길동",
      "imageUrl": "https://example.com/arrangements/clxy333333.png",
      "isPublished": true,
      "createdAt": "2024-11-18T09:00:00.000Z",
      "updatedAt": "2024-11-18T14:00:00.000Z",
      "_count": {
        "seats": 42
      }
    }
  ],
  "meta": {
    "total": 52,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### 7.2 자리배치 상세 조회

```http
GET /api/arrangements/:id
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| includeSeats | boolean | X | 좌석 정보 포함 여부 (기본: true) |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clxy333333",
    "date": "2024-11-24T00:00:00.000Z",
    "title": "2024년 11월 24일 등단자리표",
    "serviceInfo": "본 찬양: 네 주는 강한 성이요",
    "conductor": "홍길동",
    "imageUrl": "https://example.com/arrangements/clxy333333.png",
    "isPublished": true,
    "createdAt": "2024-11-18T09:00:00.000Z",
    "updatedAt": "2024-11-18T14:00:00.000Z",
    "seats": [
      {
        "id": "clxy444444",
        "arrangementId": "clxy333333",
        "memberId": "clxy123456",
        "member": {
          "id": "clxy123456",
          "name": "김철수",
          "part": "TENOR",
          "height": 175
        },
        "row": 1,
        "column": 5,
        "part": "TENOR",
        "createdAt": "2024-11-18T09:00:00.000Z"
      }
    ]
  }
}
```

### 7.3 자리배치 생성

```http
POST /api/arrangements
```

#### 요청 본문

```json
{
  "date": "2024-12-01",
  "title": "2024년 12월 1일 등단자리표",
  "serviceInfo": "본 찬양: 주 안에 있는 나에게",
  "conductor": "홍길동",
  "isPublished": false
}
```

#### 자리배치 생성 응답 예시 (201 Created)

| 필드 | 타입 | 필수 | 설명 | 제약 조건 |
|------|------|------|------|----------|
| date | string | O | 예배 날짜 (YYYY-MM-DD) | 고유값 |
| title | string | O | 제목 | 1-200자 |
| serviceInfo | string | X | 예배 정보 | 최대 500자 |
| conductor | string | X | 지휘자 | 최대 50자 |
| isPublished | boolean | X | 공개 여부 | 기본값: false |

#### 응답 예시 (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clxy555555",
    "date": "2024-12-01T00:00:00.000Z",
    "title": "2024년 12월 1일 등단자리표",
    "serviceInfo": "본 찬양: 주 안에 있는 나에게",
    "conductor": "홍길동",
    "imageUrl": null,
    "isPublished": false,
    "createdAt": "2024-11-18T15:00:00.000Z",
    "updatedAt": "2024-11-18T15:00:00.000Z"
  }
}
```

### 7.4 자리배치 수정

```http
PATCH /api/arrangements/:id
```

#### 자리배치 수정 응답 예시 (200 OK)

```json
{
  "title": "2024년 12월 1일 등단자리표 (수정)",
  "conductor": "홍길동",
  "isPublished": true
}
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clxy555555",
    "date": "2024-12-01T00:00:00.000Z",
    "title": "2024년 12월 1일 등단자리표 (수정)",
    "serviceInfo": "본 찬양: 주 안에 있는 나에게",
    "conductor": "홍길동",
    "imageUrl": null,
    "isPublished": true,
    "createdAt": "2024-11-18T15:00:00.000Z",
    "updatedAt": "2024-11-18T15:30:00.000Z"
  }
}
```

### 7.5 자리배치 삭제

```http
DELETE /api/arrangements/:id
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "message": "자리배치가 삭제되었습니다."
}
```

#### 참고사항

- Cascade 삭제: 해당 자리배치의 모든 Seat 레코드도 함께 삭제됩니다.

---

## 8. Seats API

좌석 관리 API

### 8.1 좌석 조회

```http
GET /api/seats
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| arrangementId | string | X | 자리배치 ID |
| memberId | string | X | 찬양대원 ID |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "clxy666666",
      "arrangementId": "clxy333333",
      "memberId": "clxy123456",
      "member": {
        "id": "clxy123456",
        "name": "김철수",
        "part": "TENOR"
      },
      "row": 1,
      "column": 5,
      "part": "TENOR",
      "createdAt": "2024-11-18T09:00:00.000Z"
    }
  ]
}
```

### 8.2 좌석 생성

```http
POST /api/seats
```

#### 요청 본문

```json
{
  "arrangementId": "clxy333333",
  "memberId": "clxy123456",
  "row": 1,
  "column": 5,
  "part": "TENOR"
}
```

#### 좌석 생성 응답 예시 (201 Created)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| arrangementId | string | O | 자리배치 ID |
| memberId | string | O | 찬양대원 ID |
| row | number | O | 행 번호 (1부터 시작) |
| column | number | O | 열 번호 (1부터 시작) |
| part | Part | O | 파트 |

#### 응답 예시 (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clxy777777",
    "arrangementId": "clxy333333",
    "memberId": "clxy123456",
    "row": 1,
    "column": 5,
    "part": "TENOR",
    "createdAt": "2024-11-18T16:00:00.000Z"
  }
}
```

### 8.3 좌석 일괄 생성/수정

```http
POST /api/seats/bulk
```

#### 요청 본문

```json
{
  "arrangementId": "clxy333333",
  "seats": [
    {
      "memberId": "clxy123456",
      "row": 1,
      "column": 1,
      "part": "TENOR"
    },
    {
      "memberId": "clxy789012",
      "row": 1,
      "column": 2,
      "part": "SOPRANO"
    },
    {
      "memberId": "clxy345678",
      "row": 2,
      "column": 1,
      "part": "BASS"
    }
  ]
}
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "arrangementId": "clxy333333",
    "created": 3,
    "updated": 0,
    "deleted": 0,
    "total": 3
  }
}
```

#### 참고사항

- 이 엔드포인트는 기존 좌석을 모두 삭제하고 새로 생성합니다.
- 트랜잭션으로 처리되어 부분 실패를 방지합니다.

### 8.4 좌석 수정

```http
PATCH /api/seats/:id
```

#### 요청 본문

```json
{
  "row": 2,
  "column": 3
}
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clxy777777",
    "arrangementId": "clxy333333",
    "memberId": "clxy123456",
    "row": 2,
    "column": 3,
    "part": "TENOR",
    "createdAt": "2024-11-18T16:00:00.000Z"
  }
}
```

### 8.5 좌석 삭제

```http
DELETE /api/seats/:id
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "message": "좌석이 삭제되었습니다."
}
```

### 8.6 자리배치의 모든 좌석 삭제

```http
DELETE /api/seats/by-arrangement/:arrangementId
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "message": "모든 좌석이 삭제되었습니다.",
  "data": {
    "deletedCount": 42
  }
}
```

---

## 9. AI Recommendation API

AI 기반 자리배치 추천 API (Phase 4)

### 9.1 자리배치 추천 요청

```http
POST /api/ai/recommend
```

#### 요청 본문

```json
{
  "date": "2024-12-01",
  "availableMembers": [
    "clxy123456",
    "clxy789012",
    "clxy345678"
  ],
  "gridSize": {
    "rows": 5,
    "columns": 10
  },
  "rules": {
    "heightOrdering": "ascending",
    "experienceBalance": true,
    "leaderPositions": ["front"],
    "fixedSeats": [
      {
        "memberId": "clxy123456",
        "row": 1,
        "column": 5
      }
    ]
  },
  "numRecommendations": 3
}
```

#### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| date | string | O | 예배 날짜 |
| availableMembers | string[] | O | 등단 가능한 찬양대원 ID 목록 |
| gridSize | object | O | 그리드 크기 (rows, columns) |
| rules | object | X | 배치 규칙 |
| rules.heightOrdering | string | X | 키 정렬 (ascending, descending, none) |
| rules.experienceBalance | boolean | X | 경력 균형 고려 여부 |
| rules.leaderPositions | string[] | X | 리더 선호 위치 (front, center, back) |
| rules.fixedSeats | array | X | 고정 좌석 목록 |
| numRecommendations | number | X | 추천 개수 (기본: 3, 최대: 5) |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "rank": 1,
        "score": 0.95,
        "seats": [
          {
            "memberId": "clxy123456",
            "memberName": "김철수",
            "part": "TENOR",
            "row": 1,
            "column": 5
          },
          {
            "memberId": "clxy789012",
            "memberName": "이영희",
            "part": "SOPRANO",
            "row": 1,
            "column": 1
          }
        ],
        "metrics": {
          "partBalance": 0.98,
          "heightOrdering": 0.92,
          "experienceDistribution": 0.95
        }
      },
      {
        "rank": 2,
        "score": 0.88,
        "seats": [...]
      },
      {
        "rank": 3,
        "score": 0.82,
        "seats": [...]
      }
    ],
    "metadata": {
      "totalMembers": 42,
      "processingTime": "1.2s",
      "modelVersion": "v1.0.0"
    }
  }
}
```

### 9.2 추천 수락 및 자리배치 생성

```http
POST /api/ai/accept-recommendation
```

#### 요청 본문

```json
{
  "date": "2024-12-01",
  "title": "2024년 12월 1일 등단자리표",
  "serviceInfo": "본 찬양: 주 안에 있는 나에게",
  "conductor": "홍길동",
  "recommendationRank": 1,
  "seats": [
    {
      "memberId": "clxy123456",
      "row": 1,
      "column": 5,
      "part": "TENOR"
    }
  ]
}
```

#### 응답 예시 (201 Created)

```json
{
  "success": true,
  "data": {
    "arrangement": {
      "id": "clxy888888",
      "date": "2024-12-01T00:00:00.000Z",
      "title": "2024년 12월 1일 등단자리표",
      "serviceInfo": "본 찬양: 주 안에 있는 나에게",
      "conductor": "홍길동",
      "isPublished": false
    },
    "seatsCreated": 42
  }
}
```

### 9.3 ML 모델 재학습 트리거

```http
POST /api/ai/retrain
```

#### 요청 본문

```json
{
  "includeArrangementIds": ["clxy333333", "clxy555555"],
  "excludeArrangementIds": [],
  "minDate": "2024-01-01",
  "maxDate": "2024-11-18"
}
```

#### 응답 예시 (202 Accepted)

```json
{
  "success": true,
  "data": {
    "jobId": "retrain-job-123",
    "status": "queued",
    "message": "모델 재학습 작업이 대기열에 추가되었습니다.",
    "estimatedTime": "10-15분"
  }
}
```

---

## 10. Image Generation API

배치표 이미지 생성 API (Phase 5)

### 10.1 이미지 생성

```http
POST /api/images/generate
```

#### 요청 본문

```json
{
  "arrangementId": "clxy333333",
  "format": "png",
  "resolution": "high",
  "style": {
    "template": "default",
    "logoUrl": "https://example.com/logo.png",
    "colorTheme": "primary",
    "fontFamily": "Noto Serif KR"
  }
}
```

#### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| arrangementId | string | O | 자리배치 ID |
| format | string | X | 형식 (png, jpg) - 기본: png |
| resolution | string | X | 해상도 (low, medium, high) - 기본: high |
| style.template | string | X | 템플릿 (default, modern, classic) |
| style.logoUrl | string | X | 교회 로고 URL |
| style.colorTheme | string | X | 색상 테마 |
| style.fontFamily | string | X | 폰트 |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://example.com/arrangements/clxy333333-20241118.png",
    "thumbnailUrl": "https://example.com/arrangements/clxy333333-20241118-thumb.png",
    "width": 1920,
    "height": 1080,
    "fileSize": 245678,
    "format": "png",
    "generatedAt": "2024-11-18T17:00:00.000Z"
  }
}
```

### 10.2 이미지 미리보기

```http
GET /api/images/preview/:arrangementId
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| resolution | string | X | 해상도 (low만 지원) |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "previewUrl": "https://example.com/previews/clxy333333-preview.png",
    "expiresAt": "2024-11-18T18:00:00.000Z"
  }
}
```

### 10.3 이미지 다운로드

```http
GET /api/images/:arrangementId/download
```

#### 응답

- Content-Type: `image/png` 또는 `image/jpeg`
- Content-Disposition: `attachment; filename="arrangement-20241118.png"`

---

## 11. Statistics API

통계 API

### 11.1 전체 통계

```http
GET /api/stats/overview
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "members": {
      "total": 50,
      "byPart": {
        "SOPRANO": 12,
        "ALTO": 10,
        "TENOR": 15,
        "BASS": 13
      },
      "leaders": 5
    },
    "attendances": {
      "thisWeek": 42,
      "averageRate": 0.84
    },
    "arrangements": {
      "total": 52,
      "published": 48
    }
  }
}
```

### 11.2 찬양대원별 출석률

```http
GET /api/stats/attendance-rate
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| memberId | string | X | 찬양대원 ID (지정 시 개인 통계) |
| startDate | string | X | 시작 날짜 |
| endDate | string | X | 종료 날짜 |
| groupBy | string | X | 그룹화 (member, part) |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "memberId": "clxy123456",
      "memberName": "김철수",
      "part": "TENOR",
      "totalDates": 48,
      "attendedDates": 45,
      "attendanceRate": 0.9375,
      "period": {
        "start": "2024-01-01T00:00:00.000Z",
        "end": "2024-11-18T00:00:00.000Z"
      }
    }
  ]
}
```

### 11.3 파트별 통계

```http
GET /api/stats/by-part
```

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": {
    "SOPRANO": {
      "totalMembers": 12,
      "averageHeight": 165,
      "averageExperience": 3.5,
      "averageAttendanceRate": 0.88
    },
    "ALTO": {
      "totalMembers": 10,
      "averageHeight": 163,
      "averageExperience": 4.2,
      "averageAttendanceRate": 0.92
    },
    "TENOR": {
      "totalMembers": 15,
      "averageHeight": 174,
      "averageExperience": 3.8,
      "averageAttendanceRate": 0.85
    },
    "BASS": {
      "totalMembers": 13,
      "averageHeight": 178,
      "averageExperience": 4.0,
      "averageAttendanceRate": 0.87
    }
  }
}
```

### 11.4 월별/분기별 통계

```http
GET /api/stats/timeline
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| granularity | string | X | 단위 (week, month, quarter) - 기본: month |
| startDate | string | X | 시작 날짜 |
| endDate | string | X | 종료 날짜 |

#### 응답 예시 (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "period": "2024-11",
      "totalArrangements": 4,
      "averageAttendance": 42,
      "attendanceRate": 0.84,
      "byPart": {
        "SOPRANO": { "average": 11, "rate": 0.92 },
        "ALTO": { "average": 9, "rate": 0.90 },
        "TENOR": { "average": 12, "rate": 0.80 },
        "BASS": { "average": 10, "rate": 0.77 }
      }
    }
  ]
}
```

---

## 12. 부록

### 12.1 날짜 및 시간 처리

#### 타임존

- 모든 날짜는 UTC로 저장
- 클라이언트에서 로컬 타임존으로 변환
- ISO 8601 형식 사용: `2024-11-18T10:30:00.000Z`

#### 날짜만 필요한 경우

요청 시: `YYYY-MM-DD` 형식 사용

```json
{
  "date": "2024-11-24"
}
```

응답 시: ISO 8601 형식 (시간은 00:00:00)

```json
{
  "date": "2024-11-24T00:00:00.000Z"
}
```

### 12.2 페이지네이션 예시

```typescript
// 클라이언트 요청
const response = await fetch('/api/members?page=2&limit=20')
const data = await response.json()

// 다음 페이지 확인
if (data.meta.hasMore) {
  const nextPage = data.meta.page + 1
  // 다음 페이지 요청
}
```

### 12.3 에러 처리 예시

```typescript
try {
  const response = await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memberData)
  })

  const result = await response.json()

  if (!result.success) {
    // 에러 처리
    console.error(result.error.message)

    // 유효성 검증 에러인 경우
    if (result.error.code === 'VALIDATION_ERROR') {
      result.error.details.forEach(detail => {
        console.error(`${detail.field}: ${detail.message}`)
      })
    }
  }
} catch (error) {
  console.error('Network error:', error)
}
```

### 12.4 Rate Limiting (향후 적용)

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700305200
```

- 기본: 100 requests/min
- 초과 시: 429 Too Many Requests

### 12.5 API 버전 관리 전략

#### 하위 호환성 유지

- 새 필드 추가: OK
- 기존 필드 제거: 1년 사전 공지 후 deprecated
- 필드 타입 변경: 새 버전 API 생성

#### Deprecation 헤더

```http
Sunset: Sat, 01 Jan 2025 00:00:00 GMT
Deprecation: true
Link: </api/v2/members>; rel="successor-version"
```

### 12.6 테스트용 데이터

개발 환경에서 테스트용 더미 데이터를 생성하는 엔드포인트:

```http
POST /api/dev/seed
```

**주의**: 프로덕션 환경에서는 비활성화됩니다.

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2024-11-18 | 최초 작성 | Team |

---

**문서 관리자**: Choir Seat Arranger Team
**문의**: <dev@choir-seat-arranger.example.com>
**GitHub**: <https://github.com/example/choir-seat-arranger>
