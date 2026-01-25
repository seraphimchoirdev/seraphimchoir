# Authentication API

찬양대 자리배치 시스템의 인증 API 엔드포인트 문서입니다.

## 엔드포인트

### 1. 회원가입 (Signup)

사용자 계정을 생성합니다.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

**Response (201 Created):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-11-19T10:00:00.000Z"
  },
  "session": {
    "access_token": "eyJh...",
    "refresh_token": "eyJh...",
    "expires_in": 3600
  },
  "message": "회원가입이 완료되었습니다."
}
```

**Error Responses:**

- `400 Bad Request`: 입력값 검증 실패
- `409 Conflict`: 이미 가입된 이메일
- `500 Internal Server Error`: 서버 오류

---

### 2. 로그인 (Login)

이메일과 비밀번호로 로그인합니다.

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "eyJh...",
    "refresh_token": "eyJh...",
    "expires_in": 3600
  },
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "ADMIN",
    "created_at": "2025-11-19T10:00:00.000Z",
    "updated_at": "2025-11-19T10:00:00.000Z"
  },
  "message": "로그인에 성공했습니다."
}
```

**Error Responses:**

- `400 Bad Request`: 입력값 검증 실패
- `401 Unauthorized`: 이메일 또는 비밀번호 불일치
- `500 Internal Server Error`: 서버 오류

---

### 3. 로그아웃 (Logout)

현재 세션을 종료합니다.

**Endpoint:** `POST /api/auth/logout`

**Headers:**

```
Cookie: sb-<project-ref>-auth-token=<token>
```

**Response (200 OK):**

```json
{
  "message": "로그아웃되었습니다."
}
```

**Error Responses:**

- `401 Unauthorized`: 로그인 상태가 아님
- `500 Internal Server Error`: 서버 오류

---

### 4. 현재 사용자 조회 (Get Current User)

현재 로그인한 사용자의 정보를 조회합니다.

**Endpoint:** `GET /api/auth/me`

**Headers:**

```
Cookie: sb-<project-ref>-auth-token=<token>
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-11-19T10:00:00.000Z"
  },
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "ADMIN",
    "created_at": "2025-11-19T10:00:00.000Z",
    "updated_at": "2025-11-19T10:00:00.000Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: 인증되지 않은 사용자
- `404 Not Found`: 프로필을 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

### 5. 역할 변경 (Update Role)

사용자의 역할을 변경합니다. ADMIN 권한이 필요합니다.

**Endpoint:** `PATCH /api/auth/roles`

**Headers:**

```
Cookie: sb-<project-ref>-auth-token=<token>
```

**Request Body:**

```json
{
  "userId": "target-user-uuid",
  "role": "CONDUCTOR"
}
```

**Valid Roles:**

- `ADMIN`: 관리자 (모든 권한)
- `CONDUCTOR`: 지휘자 (자리배치 생성/수정)
- `MANAGER`: 매니저 (인원 관리)
- `PART_LEADER`: 파트 리더 (파트별 출석 관리)

**Response (200 OK):**

```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "김지휘",
    "role": "CONDUCTOR",
    "updated_at": "2025-11-19T11:00:00.000Z"
  },
  "message": "김지휘님의 역할이 CONDUCTOR로 변경되었습니다."
}
```

**Error Responses:**

- `400 Bad Request`: 입력값 검증 실패 또는 자기 자신의 역할 변경 시도
- `401 Unauthorized`: 인증되지 않은 사용자
- `403 Forbidden`: ADMIN 권한 없음
- `404 Not Found`: 대상 사용자를 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

---

## 인증 방식

이 API는 Supabase Auth의 쿠키 기반 인증을 사용합니다.

### 쿠키 자동 관리

- 로그인/회원가입 시 Supabase가 자동으로 인증 쿠키를 설정합니다
- 쿠키 이름: `sb-<project-ref>-auth-token`
- 브라우저에서 자동으로 관리되므로 별도의 헤더 설정이 불필요합니다

### 클라이언트 측 사용 예시

```typescript
// 회원가입
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: '홍길동',
  }),
});

const data = await response.json();

// 로그인
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

// 현재 사용자 조회 (인증 쿠키가 자동으로 전송됨)
const meResponse = await fetch('/api/auth/me');
const currentUser = await meResponse.json();

// 로그아웃
await fetch('/api/auth/logout', { method: 'POST' });
```

---

## 보안 고려사항

1. **비밀번호 검증**: 최소 6자, 최대 72자
2. **이메일 검증**: RFC 5322 표준 형식 검증
3. **ADMIN 권한 확인**: 역할 변경 시 현재 사용자의 ADMIN 권한 확인
4. **자기 역할 변경 방지**: ADMIN도 자신의 역할을 변경할 수 없음
5. **RLS (Row Level Security)**: 데이터베이스 레벨에서 권한 제어
6. **Service Role Key**: 서버 전용, 클라이언트 노출 금지

---

## 에러 코드 정리

| Status Code | 의미                  | 사용 케이스                              |
| ----------- | --------------------- | ---------------------------------------- |
| 200         | OK                    | 성공 (조회, 로그인, 로그아웃, 역할 변경) |
| 201         | Created               | 성공 (회원가입)                          |
| 400         | Bad Request           | 입력값 검증 실패                         |
| 401         | Unauthorized          | 인증 실패 또는 인증 필요                 |
| 403         | Forbidden             | 권한 부족                                |
| 404         | Not Found             | 리소스를 찾을 수 없음                    |
| 409         | Conflict              | 중복된 리소스 (이미 가입된 이메일)       |
| 500         | Internal Server Error | 서버 오류                                |
