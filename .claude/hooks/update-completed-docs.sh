#!/bin/bash
# Git 커밋 완료 후 문서 자동 업데이트 훅
# docs/task.md와 docs/Progressed.md에 완료 작업 이력을 자동으로 추가

# 프로젝트 루트 디렉토리 확인
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$PROJECT_ROOT" ]; then
  echo "❌ Git 저장소가 아닙니다."
  exit 1
fi

cd "$PROJECT_ROOT"

# 최근 커밋 정보 가져오기
COMMIT_HASH=$(git log -1 --format='%h')
COMMIT_MESSAGE=$(git log -1 --format='%s')
COMMIT_DATE=$(git log -1 --format='%cs')

# Conventional Commits 파싱: type(scope): description
# feat(auth): Kakao OAuth 로그인 구현 -> type=feat, scope=auth, desc="Kakao OAuth 로그인 구현"

# 먼저 간단한 형식 체크: type: 또는 type(scope): 형식인지 확인
if ! echo "$COMMIT_MESSAGE" | grep -qE '^[a-z]+(\([^)]+\))?: .+'; then
  # Conventional Commits 형식이 아니면 스킵
  exit 0
fi

# 타입 추출 (첫 번째 단어, 콜론이나 괄호 전까지)
COMMIT_TYPE=$(echo "$COMMIT_MESSAGE" | sed -E 's/^([a-z]+)(\([^)]+\))?: .+$/\1/')

# scope 추출 (괄호 안의 내용, 없으면 빈 문자열)
if echo "$COMMIT_MESSAGE" | grep -qE '^[a-z]+\([^)]+\): '; then
  COMMIT_SCOPE=$(echo "$COMMIT_MESSAGE" | sed -E 's/^[a-z]+\(([^)]+)\): .+$/\1/')
else
  COMMIT_SCOPE=""
fi

# 설명 추출 (콜론 뒤의 내용)
COMMIT_DESC=$(echo "$COMMIT_MESSAGE" | sed -E 's/^[a-z]+(\([^)]+\))?: (.+)$/\2/')

# 문서화할 커밋 타입만 처리
case "$COMMIT_TYPE" in
  feat|fix|refactor|docs|test|perf)
    ;;
  *)
    # chore, style, ci 등은 스킵
    exit 0
    ;;
esac

# 파일 경로
TASK_FILE="$PROJECT_ROOT/docs/task.md"
PROGRESSED_FILE="$PROJECT_ROOT/docs/Progressed.md"

# 파일 존재 확인
if [ ! -f "$TASK_FILE" ] || [ ! -f "$PROGRESSED_FILE" ]; then
  echo "⚠️ 문서 파일이 존재하지 않습니다. 스킵합니다."
  exit 0
fi

# 중복 방지: 이미 이 커밋이 문서에 있는지 확인
if grep -q "$COMMIT_HASH" "$TASK_FILE" 2>/dev/null; then
  exit 0
fi

# scope가 있으면 포함
if [ -n "$COMMIT_SCOPE" ]; then
  FULL_TYPE="$COMMIT_TYPE($COMMIT_SCOPE)"
else
  FULL_TYPE="$COMMIT_TYPE"
fi

echo ""
echo "📝 문서 자동 업데이트 중..."
echo "   커밋: $COMMIT_HASH - $FULL_TYPE: $COMMIT_DESC"

# ============================================
# 1. task.md 업데이트
# ============================================

# 오늘 날짜 섹션이 있는지 확인
if grep -q "### $COMMIT_DATE" "$TASK_FILE"; then
  # 기존 날짜 섹션에 항목 추가 (날짜 헤더 바로 다음 줄에)
  # macOS sed와 호환되는 방식으로 처리
  # 날짜 헤더 다음 줄에 삽입
  awk -v date="### $COMMIT_DATE" -v entry="- [x] **$FULL_TYPE: $COMMIT_DESC**\n  - 커밋: \`$COMMIT_HASH\`\n" '
    $0 == date { print; getline; print entry; print; next }
    { print }
  ' "$TASK_FILE" > "$TASK_FILE.tmp" && mv "$TASK_FILE.tmp" "$TASK_FILE"
else
  # 새로운 날짜 섹션 생성 - "완료된 작업" 섹션 다음에 추가
  # "## 완료된 작업" 헤더를 찾아서 그 다음에 새 섹션 추가
  NEW_SECTION="### $COMMIT_DATE\n\n- [x] **$FULL_TYPE: $COMMIT_DESC**\n  - 커밋: \`$COMMIT_HASH\`\n"

  awk -v section="$NEW_SECTION" '
    /^## 완료된 작업/ { print; getline; print; print section; next }
    { print }
  ' "$TASK_FILE" > "$TASK_FILE.tmp" && mv "$TASK_FILE.tmp" "$TASK_FILE"
fi

# ============================================
# 2. Progressed.md 업데이트
# ============================================

# "## 8. 최근 업데이트 이력" 테이블에 새 행 추가
# 테이블 헤더 다음 줄에 삽입

PROGRESS_ENTRY="| $COMMIT_DATE | $FULL_TYPE: $COMMIT_DESC |"

# 테이블 헤더 라인(|------|) 다음에 새 행 삽입
awk -v entry="$PROGRESS_ENTRY" '
  /^\| 날짜 \| 주요 변경사항 \|$/ { print; getline; print; print entry; next }
  { print }
' "$PROGRESSED_FILE" > "$PROGRESSED_FILE.tmp" && mv "$PROGRESSED_FILE.tmp" "$PROGRESSED_FILE"

echo "✅ 문서 업데이트 완료!"
echo "   - docs/task.md"
echo "   - docs/Progressed.md"
echo ""
