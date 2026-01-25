# Git Flow 전략

> 찬양대 자리배치 시스템 (SeraphimChoir) 프로젝트를 위한 브랜치 관리 전략

## 개요

1인 개발 + Vercel 자동 배포 환경에 최적화된 **간소화 Git Flow**를 사용합니다.

```
main (프로덕션) ←── develop (개발) ←── feature/* (기능)
                         ↑
                    hotfix/* (긴급수정)
```

## 브랜치 구조

### 1. 영구 브랜치 (Long-lived Branches)

| 브랜치 | 용도 | 배포 환경 |
|--------|------|-----------|
| `main` | 프로덕션 안정 버전 | Vercel Production |
| `develop` | 개발/통합 브랜치 | Vercel Preview |

### 2. 임시 브랜치 (Short-lived Branches)

| 브랜치 패턴 | 용도 | 생성 기준 | 머지 대상 |
|-------------|------|-----------|-----------|
| `feature/*` | 새 기능 개발 | `develop` | `develop` |
| `hotfix/*` | 프로덕션 긴급 수정 | `main` | `main` → `develop` |
| `release/*` | 릴리스 준비 (선택) | `develop` | `main` → `develop` |

## 브랜치 네이밍 규칙

### Feature 브랜치
```bash
feature/<카테고리>/<설명>

# 예시
feature/members/add-bulk-import        # 대원 대량 등록 기능
feature/attendance/deadline-reminder   # 출석 마감 알림
feature/seats/ai-recommendation       # AI 자리 추천
feature/ui/dark-mode                  # 다크모드 UI
```

### Hotfix 브랜치
```bash
hotfix/<이슈번호>-<설명>

# 예시
hotfix/42-login-error                 # 로그인 오류 긴급 수정
hotfix/auth-session-expire            # 세션 만료 이슈
```

### Release 브랜치 (선택적)
```bash
release/v<버전>

# 예시
release/v1.0.0
release/v1.1.0
```

## 워크플로우

### 1. 기능 개발 (Feature Development)

```bash
# 1. develop에서 feature 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/members/add-bulk-import

# 2. 기능 개발 및 커밋
git add .
git commit -m "feat: 대원 대량 등록 기능 추가"

# 3. develop에 머지 (PR 또는 직접 머지)
git checkout develop
git merge feature/members/add-bulk-import
git push origin develop

# 4. feature 브랜치 삭제
git branch -d feature/members/add-bulk-import
```

### 2. 프로덕션 배포 (Release to Production)

```bash
# 1. develop → main 머지
git checkout main
git pull origin main
git merge develop
git push origin main

# 2. 버전 태그 생성 (선택)
git tag -a v1.0.0 -m "v1.0.0 - 첫 정식 릴리스"
git push origin v1.0.0
```

### 3. 긴급 수정 (Hotfix)

```bash
# 1. main에서 hotfix 브랜치 생성
git checkout main
git checkout -b hotfix/login-error

# 2. 수정 및 커밋
git commit -m "fix: 로그인 세션 오류 수정"

# 3. main에 머지 및 배포
git checkout main
git merge hotfix/login-error
git push origin main

# 4. develop에도 머지 (변경사항 동기화)
git checkout develop
git merge hotfix/login-error
git push origin develop

# 5. hotfix 브랜치 삭제
git branch -d hotfix/login-error
```

## 커밋 메시지 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다.

### 형식
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 종류

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | `feat(members): 대원 검색 기능 추가` |
| `fix` | 버그 수정 | `fix(auth): 로그인 세션 만료 오류 수정` |
| `refactor` | 코드 리팩토링 | `refactor(api): 중복 코드 제거` |
| `style` | 코드 포맷팅 | `style: ESLint 규칙 적용` |
| `docs` | 문서 수정 | `docs: README 업데이트` |
| `test` | 테스트 코드 | `test(members): 단위 테스트 추가` |
| `chore` | 빌드/설정 변경 | `chore: 패키지 업데이트` |
| `perf` | 성능 개선 | `perf(seats): 렌더링 최적화` |

### Scope 예시 (이 프로젝트용)
- `members` - 대원 관리
- `attendance` - 출석 관리
- `seats` - 자리배치
- `arrangements` - 배치 저장/관리
- `auth` - 인증/권한
- `api` - API 라우트
- `ui` - UI 컴포넌트
- `db` - 데이터베이스

## Vercel 배포 연동

### 자동 배포 설정

| 브랜치 | Vercel 환경 | URL 패턴 |
|--------|-------------|----------|
| `main` | Production | `saeropimon.vercel.app` |
| `develop` | Preview | `develop-saeropimon.vercel.app` |
| `feature/*` | Preview | `feature-xxx-saeropimon.vercel.app` |
| PR | Preview | `pr-123-saeropimon.vercel.app` |

### Vercel 설정 권장사항

```json
// vercel.json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": true
    }
  }
}
```

## GitHub 브랜치 보호 규칙 (권장)

### main 브랜치

```yaml
보호 규칙:
  - Require pull request before merging: 권장 (1인 개발 시 선택)
  - Require status checks to pass: 권장
    - Build 성공
    - Lint 통과
  - Require branches to be up to date: 권장
  - Do not allow bypassing: 선택적
```

### develop 브랜치

```yaml
보호 규칙:
  - Require status checks to pass: 권장
  - Allow force pushes: 비활성화 (권장)
```

## 버전 관리 (Semantic Versioning)

```
v<MAJOR>.<MINOR>.<PATCH>

예: v1.2.3
```

| 버전 | 변경 시점 |
|------|-----------|
| MAJOR | 호환성 깨지는 변경 (API 변경 등) |
| MINOR | 새 기능 추가 (하위 호환) |
| PATCH | 버그 수정 |

### 현재 버전 관리

```bash
# 태그로 버전 관리
git tag -a v1.0.0 -m "v1.0.0 - 초기 릴리스"
git push origin v1.0.0

# package.json 버전과 동기화 권장
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.1 → 1.1.0
npm version major  # 1.1.0 → 2.0.0
```

## 일반적인 시나리오

### 시나리오 1: 새 기능 개발

```bash
# 1. feature 브랜치 생성
git checkout develop
git checkout -b feature/attendance/bulk-update

# 2. 개발 및 커밋
git commit -m "feat(attendance): 출석 일괄 수정 기능"

# 3. develop 머지
git checkout develop
git merge feature/attendance/bulk-update

# 4. 테스트 후 main 배포
git checkout main
git merge develop
git tag -a v1.1.0 -m "v1.1.0 - 출석 일괄 수정 기능"
```

### 시나리오 2: 프로덕션 버그 발견

```bash
# 1. hotfix 브랜치 생성 (main에서)
git checkout main
git checkout -b hotfix/critical-login-bug

# 2. 수정
git commit -m "fix(auth): 긴급 로그인 버그 수정"

# 3. main 배포
git checkout main
git merge hotfix/critical-login-bug
git tag -a v1.0.1 -m "v1.0.1 - 긴급 수정"

# 4. develop 동기화
git checkout develop
git merge main
```

### 시나리오 3: 여러 기능 동시 개발

```bash
# 각 기능별 브랜치 생성
git checkout develop
git checkout -b feature/ui/dark-mode

# 다른 터미널/시점에서
git checkout develop
git checkout -b feature/members/export-csv

# 각각 develop에 머지 (순서대로)
git checkout develop
git merge feature/ui/dark-mode
git merge feature/members/export-csv
```

## 유용한 Git 별칭 (Alias)

```bash
# ~/.gitconfig에 추가
[alias]
    # 브랜치 관리
    new-feature = "!f() { git checkout develop && git pull && git checkout -b feature/$1; }; f"
    new-hotfix = "!f() { git checkout main && git pull && git checkout -b hotfix/$1; }; f"

    # 머지
    finish-feature = "!f() { git checkout develop && git merge $(git branch --show-current) && git branch -d $(git branch --show-current); }; f"

    # 상태 확인
    branches = branch -a
    history = log --oneline -20

    # 배포
    deploy = "!git checkout main && git merge develop && git push origin main"
```

## 주의사항

1. **main 브랜치 직접 커밋 금지**
   - 항상 develop 또는 hotfix를 통해 머지

2. **develop 브랜치 최신 유지**
   - feature 시작 전 항상 `git pull origin develop`

3. **충돌 해결은 feature 브랜치에서**
   - develop 머지 전 `git merge develop`으로 미리 충돌 해결

4. **hotfix 후 develop 동기화 필수**
   - 수정사항이 누락되지 않도록

---

*마지막 업데이트: 2025-12-29*
