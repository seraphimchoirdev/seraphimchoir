# Phase 4 마이그레이션 계획: TypeScript 6 + ESLint 10

> 작성일: 2026-04-01
> 현재 브랜치: develop

## 대상 패키지

| 항목 | 현재 | 목표 |
|---|---|---|
| TypeScript | 5.9.3 | 6.0.2 |
| ESLint | 9.39.1 | 10.1.0 |

## 호환성 확인 결과 (모두 통과)

| 의존성 | ESLint 10 | TypeScript 6 |
|---|---|---|
| eslint-config-next 16.2.2 | `>=9.0.0` — 지원 | -- |
| Next.js 16.2.2 | -- | peerDep 제약 없음 |
| @sentry/nextjs 10.47.0 | -- | 제약 없음 |
| zustand 5.0.12 | -- | 4.5+ 지원 |
| @tanstack/react-query 5.96.0 | -- | 5.4~6.0 테스트됨 |

## 프로젝트 현재 설정 분석

### tsconfig.json (이미 현대적 설정)
- `target: ES2017`, `module: esnext`, `moduleResolution: bundler`
- `strict: true`, `esModuleInterop: true`
- **`types` 필드 미설정** (TS6에서 기본값 `[]`로 변경됨 -- 핵심 리스크)

### eslint.config.mjs (이미 ESLint 9 flat config 사용)
- `eslint-env` 주석 없음
- `.eslintrc` 없음
- triple-slash directive 없음

### Side-effect imports (2개만 존재)
- `src/app/layout.tsx:11` -- `import './globals.css'`
- `src/instrumentation-client.ts:11` -- `import '../sentry.client.config'`

### @types 패키지 목록 (devDependencies)
- `@types/jest` ^30.0.0
- `@types/jsdom` ^27.0.0
- `@types/node` ^20
- `@types/react` ^19
- `@types/react-dom` ^19
- `@types/papaparse` ^5.5.0

---

## Step 1: TypeScript 5.9.3 -> 6.0.2

### 1-1. tsconfig.json 수정 필요 사항

| 변경 | 이유 | 위험도 |
|---|---|---|
| `"types": ["node", "jest"]` 추가 | TS6 기본값이 `[]`로 변경. 명시 안 하면 `@types/node`, `@types/jest` 자동 로드 안 됨 | 높음 |
| `noUncheckedSideEffectImports` 확인 | TS6 기본값 `true`. `import './globals.css'` 등에서 에러 가능 | 중간 |

### 1-2. 영향 없는 항목 (이미 호환)

| 항목 | 현재 설정 | TS6 변경 | 영향 |
|---|---|---|---|
| strict | true | 기본값 true로 변경 | 없음 |
| module | esnext | 기본값 esnext로 변경 | 없음 |
| esModuleInterop | true | 항상 활성화 | 없음 |
| moduleResolution | bundler | 계속 지원 (node10만 제거) | 없음 |
| target | ES2017 | ES2015 이상이면 OK (ES5만 제거) | 없음 |

### 1-3. 실행 순서

```bash
# 1. 설치
npm install -D typescript@6.0.2

# 2. tsconfig.json 수정
#    compilerOptions에 "types": ["node", "jest"] 추가

# 3. 빌드 테스트
npm run build

# 4. noUncheckedSideEffectImports 에러 발생 시
#    tsconfig.json에 "noUncheckedSideEffectImports": false 추가

# 5. 전체 테스트
npx jest --no-coverage
```

---

## Step 2: ESLint 9.39.1 -> 10.1.0

### 2-1. Breaking Changes 영향 분석

| 변경 | 이 프로젝트 영향 |
|---|---|
| `.eslintrc` 완전 제거 | 없음 (이미 flat config) |
| Node.js 20.19+ 필요 | 없음 (v24.13.0 사용) |
| `eslint-env` 주석 에러 | 없음 (미사용) |
| 새 규칙 3개 추가 | lint 결과 확인 필요 |
| JSX 레퍼런스 트래킹 활성화 | lint 결과 확인 필요 |

### 2-2. 새 규칙 상세

- `no-unassigned-vars`: 할당되지 않은 변수 감지
- `no-useless-assignment`: 쓸모없는 할당 감지
- `preserve-caught-error`: catch 블록에서 에러 변수 보존

### 2-3. 실행 순서

```bash
# 1. 설치
npm install -D eslint@10.1.0

# 2. lint 실행
npm run lint

# 3. 새 규칙으로 인한 에러 확인 및 수정

# 4. 빌드 재확인
npm run build
```

---

## 실행 전략

**TypeScript -> ESLint 순서로 진행** (TypeScript가 더 근본적)

1. TypeScript 6 설치 + tsconfig.json 수정
2. 빌드 확인 -> 에러 수정
3. 테스트 확인
4. ESLint 10 설치
5. lint 확인 -> 에러 수정
6. 최종 빌드 + 테스트 + lint 통과 확인
7. 커밋

## 롤백 계획

```bash
npm install -D typescript@5.9.3 eslint@9.39.1
git checkout -- tsconfig.json
```

## 검증 체크리스트

- [ ] `npm run build` 성공
- [ ] `npm run lint` 에러 없음 (기존 warning은 허용)
- [ ] `npx jest --no-coverage` 53 suites, 695 tests 통과
- [ ] IDE에서 타입 에러 없음
- [ ] Side-effect import (`globals.css`, `sentry.client.config`) 정상
