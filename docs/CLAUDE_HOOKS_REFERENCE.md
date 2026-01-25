# Claude Code 훅 설정 가이드

이 문서는 새로핌ON 프로젝트에 적용된 Claude Code 훅 설정을 정리합니다.

## 목차

- [설정 파일 위치](#설정-파일-위치)
- [훅 개요](#훅-개요)
- [SessionStart 훅](#sessionstart-훅)
- [PreToolUse 훅](#pretooluse-훅)
- [PostToolUse 훅](#posttooluse-훅)
- [상태 표시줄](#상태-표시줄)
- [활성화된 플러그인](#활성화된-플러그인)
- [환경 변수](#환경-변수)

---

## 설정 파일 위치

| 파일 | 설명 | Git 추적 |
|------|------|----------|
| `.claude/settings.json` | 프로젝트 공유 설정 | O |
| `.claude/settings.local.json` | 로컬 개인 설정 | X |
| `~/.claude/settings.json` | 글로벌 사용자 설정 | - |

---

## 훅 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code 훅 흐름                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SessionStart ──▶ PreToolUse ──▶ [도구 실행] ──▶ PostToolUse │
│       │               │                              │      │
│       ▼               ▼                              ▼      │
│  - 배포 상태      - 검색어에          - 코드 품질 검사       │
│    초기 확인       연도 추가          - ESLint/Prettier     │
│                                      - 배포 모니터링        │
│                                      - 변경 로깅            │
└─────────────────────────────────────────────────────────────┘
```

---

## SessionStart 훅

세션 시작 시 한 번 실행됩니다.

### Vercel 배포 헬스 체크

```json
{
  "matcher": "startup",
  "timeout": 15
}
```

**기능:**
- Vercel API를 통해 최근 배포 상태 확인
- 배포 상태(READY/ERROR/BUILDING/QUEUED) 표시
- 배포 URL 및 경과 시간 표시

**필요 환경 변수:**
- `VERCEL_TOKEN`: Vercel API 토큰
- `VERCEL_PROJECT_ID`: 프로젝트 ID

**출력 예시:**
```
🏥 Deployment Health Monitor: Initial health check...
✅ Latest deployment: READY (15 minutes ago)
🌐 Live at: https://seraphimon.vercel.app
📊 Deployment monitoring active
```

---

## PreToolUse 훅

도구 실행 전에 입력을 수정하거나 검증합니다.

### 검색 연도 자동 추가

```json
{
  "matcher": "WebSearch",
  "timeout": 5
}
```

**기능:**
- WebSearch 쿼리에 현재 연도 자동 추가
- 최신 정보 검색 보장
- "latest", "recent" 등 시간 관련 키워드가 있으면 건너뜀

**예시:**
| 입력 쿼리 | 변환 결과 |
|-----------|-----------|
| `Next.js App Router` | `Next.js App Router 2026` |
| `latest React features` | `latest React features` (변환 없음) |
| `React 2025 updates` | `React 2025 updates` (이미 연도 있음) |

---

## PostToolUse 훅

도구 실행 후 결과를 검증하거나 추가 작업을 수행합니다.

### 1. Next.js 코드 품질 검사

```json
{
  "matcher": "Write|Edit|MultiEdit",
  "timeout": 20
}
```

**대상 파일:** `.js`, `.jsx`, `.ts`, `.tsx` (node_modules 제외)

**검사 항목:**

| 카테고리 | 검사 내용 | 심각도 |
|----------|-----------|--------|
| App Router | page.tsx에 default export 필수 | ❌ 오류 |
| App Router | layout.tsx에 children prop 필수 | ❌ 오류 |
| App Router | 메타데이터 export 권장 | ⚠️ 경고 |
| 컴포넌트 | 서버 컴포넌트에서 인터랙티브 기능 사용 금지 | ❌ 오류 |
| 컴포넌트 | 클라이언트 컴포넌트에 인터랙티브 기능 없음 | ⚠️ 경고 |
| 이미지 | `next/image` 사용 권장 | 💡 제안 |
| 링크 | `next/link` 사용 권장 | 💡 제안 |
| 타입 | JS 파일을 TS로 마이그레이션 권장 | 📝 정보 |
| 스타일 | 동적 className에 clsx 사용 권장 | 💡 제안 |

**출력 예시:**
```
🔍 Next.js Code Quality Enforcer: Reviewing src/app/page.tsx...
📁 App Router file detected: src/app/page.tsx
🚀 Server Component (default)
✅ Using next/image for optimized images
✅ Using next/link for navigation
✅ Code quality check passed for src/app/page.tsx
```

### 2. 의존성 보안 검사

```json
{
  "matcher": "Edit"
}
```

**대상 파일:**
- `package.json` → `npm audit` 실행
- `requirements.txt` → `safety check` 실행
- `Cargo.toml` → `cargo audit` 실행

### 3. Vercel 배포 헬스 모니터

```json
{
  "matcher": "Bash",
  "timeout": 30
}
```

**트리거:** `vercel`, `deploy`, `build` 명령어 실행 시

**기능:**
- 최근 5개 배포 분석
- 성공률 계산 및 표시
- 실패 배포 상세 정보 제공
- 50% 미만 성공률 시 CRITICAL 경고

**출력 예시:**
```
🏥 Deployment Health Monitor: Checking deployment status...
📊 Recent deployment analysis (5 deployments):
State: READY | Created: 2026-01-25T10:30:00Z | URL: seraphimon-xxx.vercel.app

📈 Deployment Health Summary:
✅ Successful: 4/5 (80%)
❌ Failed: 1/5
🔄 In Progress: 0/5
```

### 4. ESLint 자동 수정

```json
{
  "matcher": "Edit|MultiEdit"
}
```

**대상 파일:** `.js`, `.jsx`, `.ts`, `.tsx`

**동작:** `npx eslint --fix` 자동 실행

### 5. Prettier 자동 포맷

```json
{
  "matcher": "Edit|MultiEdit"
}
```

**대상 파일:**
| 확장자 | 포맷터 |
|--------|--------|
| `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.html` | Prettier |
| `.py` | Black |
| `.go` | gofmt |
| `.rs` | rustfmt |
| `.php` | php-cs-fixer |

### 6. 변경 추적 로깅

```json
{
  "matcher": "Edit|MultiEdit|Write"
}
```

**동작:** 파일 생성/수정 시 `~/.claude/changes.log`에 기록

**로그 형식:**
```
[2026-01-25 14:30:45] File modified: src/components/ui/button.tsx
[2026-01-25 14:31:02] File created: src/components/ui/dialog.tsx
```

### 7. Vercel 배포 확인 (프로젝트 설정)

```json
{
  "matcher": "Bash",
  "pattern": "git push.*main|git push origin main"
}
```

**동작:** main 브랜치 푸시 시 `.claude/hooks/check-vercel-deployment.sh` 실행

---

## 상태 표시줄

터미널 하단에 표시되는 상태 정보입니다.

**표시 내용:**
- 사용자@호스트 (기본 사용자가 아닐 때)
- 현재 디렉토리
- Git 브랜치 (변경사항 있으면 ± 표시)
- Claude Code 버전

**색상 코드:**
| 구성 요소 | 배경색 | 의미 |
|-----------|--------|------|
| 사용자@호스트 | 청록색 | 사용자 정보 |
| 디렉토리 | 파란색 | 현재 위치 |
| Git 브랜치 (클린) | 초록색 | 변경사항 없음 |
| Git 브랜치 (더티) | 노란색 | 변경사항 있음 |
| 버전 | 보라색 | Claude Code 버전 |

---

## 활성화된 플러그인

### Claude Code Plugins

| 플러그인 | 설명 |
|----------|------|
| `code-review` | 코드 리뷰 자동화 |
| `feature-dev` | 기능 개발 가이드 |
| `frontend-design` | 프론트엔드 디자인 스킬 |
| `commit-commands` | Git 커밋 명령어 |
| `explanatory-output-style` | 교육적 설명 스타일 |
| `claude-opus-4-5-migration` | Opus 4.5 마이그레이션 |

### Claude Code Templates

| 플러그인 | 설명 |
|----------|------|
| `ai-ml-toolkit` | AI/ML 개발 도구 |
| `git-workflow` | Git Flow 워크플로우 |
| `performance-optimizer` | 성능 최적화 |
| `documentation-generator` | 문서 자동 생성 |
| `nextjs-vercel-pro` | Next.js + Vercel 전문 |
| `devops-automation` | DevOps 자동화 |

### Claude Plugins Official

| 플러그인 | 설명 |
|----------|------|
| `playwright` | 브라우저 자동화 테스트 |
| `context7` | 라이브러리 문서 조회 |
| `github` | GitHub 연동 |
| `serena` | 시맨틱 코드 분석 |
| `supabase` | Supabase 연동 |
| `typescript-lsp` | TypeScript 언어 서버 |

---

## 환경 변수

`.claude/settings.local.json`에 설정된 환경 변수:

| 변수 | 값 | 설명 |
|------|-----|------|
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 8000 | 최대 출력 토큰 수 |
| `DISABLE_NON_ESSENTIAL_MODEL_CALLS` | 1 | 불필요한 모델 호출 비활성화 |
| `DISABLE_COST_WARNINGS` | 1 | 비용 경고 비활성화 |
| `USE_BUILTIN_RIPGREP` | 1 | 내장 ripgrep 사용 |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | 1 | 프로젝트 디렉토리 유지 |

---

## 훅 추가/수정 방법

### 새 훅 추가

1. `.claude/settings.local.json` 열기
2. 적절한 훅 타입 섹션에 추가:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'File edited: $CLAUDE_TOOL_FILE_PATH'",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### 매처 패턴

| 패턴 | 설명 |
|------|------|
| `Edit` | Edit 도구만 |
| `Edit\|Write` | Edit 또는 Write |
| `Bash` | 모든 Bash 명령 |
| `"pattern": "git.*"` | 정규식 패턴 매칭 |

### 사용 가능한 환경 변수

| 변수 | 설명 |
|------|------|
| `$CLAUDE_TOOL_FILE_PATH` | 대상 파일 경로 |
| `$CLAUDE_TOOL_INPUT` | 도구 입력 (JSON) |
| `$CLAUDE_TOOL_OUTPUT` | 도구 출력 (JSON) |

---

## 문제 해결

### 훅이 실행되지 않을 때

1. 매처 패턴 확인
2. 타임아웃 값 확인 (기본 10초)
3. 명령어 실행 권한 확인

### 훅 디버깅

```bash
# 변경 로그 확인
tail -f ~/.claude/changes.log

# 훅 출력 확인 (Claude Code 터미널에서)
# 훅 실행 시 stdout/stderr가 표시됨
```

---

*마지막 업데이트: 2026-01-25*
