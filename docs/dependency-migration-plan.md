# 의존성 마이그레이션 계획

> 작성일: 2026-04-01
> 현재 브랜치: develop

## 현재 vs 최신 안정 버전 비교

### 핵심 의존성

| 패키지 | 현재 | 최신 안정 | 업데이트 유형 |
|---|---|---|---|
| react / react-dom | 19.2.0 | 19.2.4 | 보안 패치 |
| next | 16.1.1 | 16.2.2 | 마이너 + 보안 |
| typescript | 5.9.3 | 6.0.2 | 메이저 |
| tailwindcss | 4.1.17 | 4.2.2 | 마이너 |
| eslint | 9.39.1 | 10.1.0 | 메이저 |
| eslint-config-next | 16.0.3 | 16.2.2 | 마이너 |

### Supabase 스택

| 패키지 | 현재 | 최신 안정 | 업데이트 유형 |
|---|---|---|---|
| @supabase/supabase-js | 2.81.1 | 2.101.1 | 마이너 |
| @supabase/ssr | 0.5.2 | 0.10.0 | 마이너 |
| supabase (CLI) | 2.74.4 | 2.84.5 | 마이너 |

### UI / 기능 라이브러리

| 패키지 | 현재 | 최신 안정 | 업데이트 유형 |
|---|---|---|---|
| lucide-react | 0.554.0 | 1.7.0 | 메이저 |
| @vercel/analytics | 1.6.1 | 2.0.1 | 메이저 |
| @vercel/speed-insights | 1.3.1 | 2.0.0 | 메이저 |
| @sentry/nextjs | 10.39.0 | 10.47.0 | 마이너 |
| zod | 4.1.12 | 4.3.6 | 마이너 |
| @tiptap/* | 3.21.0 | 3.22.0 | 마이너 |
| zustand | 5.0.8 | 5.0.12 | 패치 |
| @tanstack/react-query | 5.90.10 | 5.96.0 | 마이너 |
| recharts | 3.4.1 | 3.8.1 | 마이너 |

---

## 긴급 보안 이슈

**React 19.2.0은 CVE-2025-55182 (CVSS 10.0) RCE 취약점에 노출되어 있음.**

- 비인증 공격자가 악성 HTTP 요청으로 서버에서 임의 코드 실행 가능 (RSC 역직렬화 취약점)
- Next.js App Router가 내부적으로 RSC를 사용하므로 이 프로젝트도 영향받음
- 19.2.1~19.2.4에서 순차적으로 수정됨

---

## Phase 1: 긴급 보안 패치 (즉시)

코드 변경 없음 -- npm install만으로 완료.

| 패키지 | 변경 | 비고 |
|---|---|---|
| react / react-dom | 19.2.0 -> 19.2.4 | CVE-2025-55182 RCE 수정 |
| next | 16.1.1 -> 16.2.2 | CVE 2건 + 성능 향상 |
| @vercel/analytics | 1.6.1 -> 2.0.1 | 코드 변경 없음 |
| @vercel/speed-insights | 1.3.1 -> 2.0.0 | 코드 변경 없음 |

```bash
npm install react@19.2.4 react-dom@19.2.4 next@16.2.2 @vercel/analytics@2.0.1 @vercel/speed-insights@2.0.0
```

**검증**: `npm run build` + `npm run dev`로 동작 확인

### Next.js 16.2 주요 변경사항
- 개발 서버 시작 속도 ~400% 향상
- 렌더링 25~60% 빨라짐 (RSC payload deserialization 최적화)
- Server Function 로깅 (개발 터미널)
- Hydration Diff Indicator
- ImageResponse 2~20x 빨라짐 (기본 폰트 Noto Sans -> Geist Sans 변경 주의)
- 보안: CVE-2026-27979, CVE-2026-29057

### React 19.2.1~19.2.4 변경사항
- 19.2.1: CVE-2025-55182 (CVSS 10.0) RCE 수정
- 19.2.2: CVE-2025-55184, CVE-2025-67779 (Promise cycle, DoS, 소스코드 노출)
- 19.2.3: Server Function 무한 루프 방지
- 19.2.4: Server Actions DoS 추가 방어

---

## Phase 2: 안전한 마이너/패치 업데이트

Breaking change 없음 또는 미미.

| 패키지 | 변경 | 주의사항 |
|---|---|---|
| @supabase/supabase-js | 2.81.1 -> 2.101.1 | 타입 강화, strict 모드에서 확인 |
| @supabase/ssr | 0.5.2 -> 0.10.0 | API 변경 없음 |
| supabase (CLI) | 2.74.4 -> 2.84.5 | -- |
| lucide-react | 0.554.0 -> 1.7.0 | 브랜드 아이콘 미사용 확인 완료, 안전 |
| @sentry/nextjs | 10.39.0 -> 10.47.0 | Turbopack 지원 향상 |
| @tiptap/* | 3.21.0 -> 3.22.0 | 버그 수정 위주 |
| zustand | 5.0.8 -> 5.0.12 | 패치만 |
| @tanstack/react-query | 5.90.10 -> 5.96.0 | -- |
| tailwindcss | 4.1.17 -> 4.2.2 | `start-*`/`end-*` deprecated (경고만) |
| eslint-config-next | 16.0.3 -> 16.2.2 | -- |
| recharts | 3.4.1 -> 3.8.1 | -- |

**검증**: `npm run build` + `npm run lint` + 주요 페이지 수동 확인

### lucide-react 1.0 주요 변경사항
- 브랜드 아이콘 전부 삭제 (Github, Facebook 등 -- 이 프로젝트 미사용)
- UMD 빌드 제거 (ESM/CJS만, 32.3% 크기 감소)
- `aria-hidden="true"` 기본 적용
- `LucideProvider` 컨텍스트 프로바이더 추가

### Tailwind CSS 4.2 주요 변경사항
- 4개 새 색상 팔레트: mauve, olive, mist, taupe
- 논리적 속성 유틸리티 완성 (pbs-*, mbs-*, border-bs-* 등)
- font-features-* 유틸리티
- Deprecation: `start-*` -> `inset-s-*`, `end-*` -> `inset-e-*`

---

## Phase 3: Zod 업데이트 (코드 확인 필요)

`.pick()`/`.omit()` + refinement 패턴 사용 시 런타임 에러 가능.

| 패키지 | 변경 | 필수 작업 |
|---|---|---|
| zod | 4.1.12 -> 4.3.6 | `.pick()`/`.omit()`에 `.refine()` 조합 코드 검색 후 수정 |

사전 확인:
```bash
grep -r "\.pick\|\.omit" src/ --include="*.ts" --include="*.tsx" | grep -i "refine"
```

### Zod 4.2~4.3 주요 변경사항
- `z.fromJSONSchema()`: JSON Schema -> Zod 스키마 변환
- `z.xor()`: 배타적 유니온
- `.exactOptional()`: 키만 optional, undefined 불허
- `.pick()`/`.omit()`에 refinement 있으면 에러 (기존 조용히 무시됨)
- `.extend()`에서 refinement 있는 스키마의 기존 속성 덮어쓰기 금지

---

## Phase 4: 메이저 업데이트 (신중하게)

tsconfig.json 수정, lint 규칙 변경 가능.

| 패키지 | 변경 | 필수 작업 |
|---|---|---|
| TypeScript | 5.9.3 -> 6.0.2 | tsconfig.json 수정 필수 |
| ESLint | 9.39.1 -> 10.1.0 | eslint-config-next ESLint 10 호환 확인 |

### TypeScript 6.0 Breaking Changes

| 변경사항 | 현재 프로젝트 설정 | 필요한 조치 |
|---|---|---|
| `types` 기본값 `[]`로 변경 | 명시적 설정 없음 | `"types": ["node"]` 추가 필수 |
| `strict` 기본값 `true` | 이미 true | 영향 없음 |
| `module` 기본값 `esnext` | 이미 esnext | 영향 없음 |
| `esModuleInterop` 항상 활성화 | 이미 true | 영향 없음 |
| `noUncheckedSideEffectImports` 기본 true | 미설정 | CSS import 등에서 에러 가능 |
| `moduleResolution: "node"` 중단 | bundler 사용 중 | 영향 없음 |
| `rootDir` 기본값 변경 | 미설정 | 확인 필요 |

필수 수정:
```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

마이그레이션 도구: `ts5to6` CLI

### ESLint 10 Breaking Changes

| 변경사항 | 현재 프로젝트 | 영향 |
|---|---|---|
| Node.js 20.19+ 필요 | v24.13.0 | 영향 없음 |
| `.eslintrc` 완전 제거 | flat config 사용 중 | 영향 없음 |
| 새 규칙 3개 추가 | -- | lint 결과 확인 필요 |
| JSX 레퍼런스 트래킹 활성화 | React JSX 사용 | 확인 필요 |

**검증**: `npm run build` + `npm run lint` + 전체 타입 에러 확인
