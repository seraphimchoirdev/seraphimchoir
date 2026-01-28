#!/bin/bash
# 핸드오프 자동 로드 - 이전 작업 컨텍스트 요약
# 사용자가 프로젝트 주도권을 유지하도록 "후보" 형태로 제시
#
# 트리거 조건:
# 1. 당일 최초 세션 - last_loaded_date ≠ 오늘
# 2. --force 플래그로 강제 실행
#
# 참고: 같은 날 장시간 중단 후 재개 시에는 /cm:last 사용 권장
#
# 사용법:
#   handoff-load.sh --auto --project <dir>   # 조건부 로드
#   handoff-load.sh --force --project <dir>  # 강제 로드
#   handoff-load.sh --project <dir>          # 조건부 로드 (기본)

set -euo pipefail

# === 설정 ===
HANDOFF_STATE_DIR="$HOME/.claude/handoff"
STATE_FILE="$HANDOFF_STATE_DIR/last-loaded.json"

# === 인자 파싱 ===
MODE="auto"  # auto | force
PROJECT_DIR=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --auto)
            MODE="auto"
            shift
            ;;
        --force)
            MODE="force"
            shift
            ;;
        --project)
            PROJECT_DIR="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# 프로젝트 디렉토리 기본값
if [ -z "$PROJECT_DIR" ]; then
    PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
fi

# === 함수 정의 ===

# JSON 파싱 헬퍼 (jq 대체)
json_get() {
    local file="$1"
    local key="$2"
    if command -v jq &> /dev/null; then
        jq -r ".$key // \"\"" "$file" 2>/dev/null || echo ""
    else
        # jq 없을 때 grep/sed 폴백
        grep "\"$key\"" "$file" 2>/dev/null | sed 's/.*: *"\([^"]*\)".*/\1/' || echo ""
    fi
}

# 로드 조건 판단 (당일 최초 세션만)
should_load() {
    # force 모드면 항상 로드
    if [ "$MODE" = "force" ]; then
        return 0
    fi

    # 상태 파일 없으면 로드
    if [ ! -f "$STATE_FILE" ]; then
        return 0
    fi

    local last_date
    local today

    last_date=$(json_get "$STATE_FILE" "last_loaded_date")
    today=$(date '+%Y-%m-%d')

    # 날짜가 다르면 로드 (당일 최초 세션)
    if [ "$last_date" != "$today" ]; then
        return 0
    fi

    # 같은 날이면 로드하지 않음
    return 1
}

# 최신 핸드오프 파일 찾기
find_latest_handoff() {
    local handoff_dir="$PROJECT_DIR/docs/handoff"

    if [ ! -d "$handoff_dir" ]; then
        echo ""
        return
    fi

    # 가장 최근 날짜의 .md 파일 찾기
    ls -1 "$handoff_dir"/*.md 2>/dev/null | sort -r | head -1
}

# 마크다운 섹션 추출
extract_section() {
    local file="$1"
    local section_num="$2"
    local section_name="$3"

    # ## N. 으로 시작하는 섹션부터 다음 ## 또는 EOF까지 추출
    awk -v num="$section_num" '
        /^## '"$section_num"'\. / { found=1; next }
        /^## [0-9]+\. / && found { exit }
        /^---$/ && found { exit }
        found { print }
    ' "$file" | sed '/^$/d' | head -20
}

# 우선순위별 다음 작업 추출
extract_next_steps() {
    local file="$1"

    # Immediate Next Steps 섹션에서 우선순위별 항목 추출
    awk '
        /^## 4\. Immediate Next Steps/ { found=1; next }
        /^## [0-9]+\. / && found { exit }
        /^---$/ && found { exit }
        found && /^\*\*\(High\)\*\*|^[0-9]+\. \*\*\(High\)\*\*/ {
            gsub(/^[0-9]+\. /, "");
            gsub(/\*\*\(High\)\*\*/, "");
            gsub(/\*\*/, "");
            gsub(/^[ \t]+/, "");
            if (length($0) > 2) print "HIGH:" $0
        }
        found && /^\*\*\(Medium\)\*\*|^[0-9]+\. \*\*\(Medium\)\*\*/ {
            gsub(/^[0-9]+\. /, "");
            gsub(/\*\*\(Medium\)\*\*/, "");
            gsub(/\*\*/, "");
            gsub(/^[ \t]+/, "");
            if (length($0) > 2) print "MEDIUM:" $0
        }
        found && /^\*\*\(Low\)\*\*|^[0-9]+\. \*\*\(Low\)\*\*/ {
            gsub(/^[0-9]+\. /, "");
            gsub(/\*\*\(Low\)\*\*/, "");
            gsub(/\*\*/, "");
            gsub(/^[ \t]+/, "");
            if (length($0) > 2) print "LOW:" $0
        }
    ' "$file"
}

# 미해결 사항 추출
extract_blockers() {
    local file="$1"

    awk '
        /^## 6\. Blockers & Open Questions/ { found=1; next }
        /^## [0-9]+\. / && found { exit }
        /^---$/ && found { exit }
        found && /^- / {
            gsub(/^- /, "");
            if (length($0) > 2) print $0
        }
        found && /^  - / {
            gsub(/^  - /, "  ");
            print $0
        }
    ' "$file" | grep -v "^없음$" | head -10
}

# 상태 요약 추출 (Current State Summary에서 첫 번째 인용구)
extract_state_summary() {
    local file="$1"

    awk '
        /^## 1\. Current State Summary/ { found=1; next }
        /^## [0-9]+\. / && found { exit }
        /^---$/ && found { exit }
        found && /^> / {
            gsub(/^> /, "");
            print;
            exit
        }
    ' "$file"
}

# 상태 파일 업데이트
update_state() {
    local loaded_file="$1"

    mkdir -p "$HANDOFF_STATE_DIR"

    cat > "$STATE_FILE" << EOF
{
  "last_loaded_date": "$(date '+%Y-%m-%d')",
  "last_load_time": "$(date -Iseconds)",
  "loaded_file": "$loaded_file",
  "project_dir": "$PROJECT_DIR"
}
EOF
}

# 사용자 주도권 중심 출력
output_summary() {
    local handoff_file="$1"
    local handoff_date

    # 파일명에서 날짜 추출 (YYYY-MM-DD.md)
    handoff_date=$(basename "$handoff_file" .md)

    echo ""
    echo "========================================================================"
    echo "                     Previous Context"
    echo "========================================================================"
    echo ""
    echo "Last handoff: $handoff_date"
    echo ""

    # 상태 요약
    local state_summary
    state_summary=$(extract_state_summary "$handoff_file")
    if [ -n "$state_summary" ]; then
        echo "--- Status Summary ---"
        echo "$state_summary"
        echo ""
    fi

    # 다음 작업 후보
    local next_steps
    next_steps=$(extract_next_steps "$handoff_file")
    if [ -n "$next_steps" ]; then
        echo "--- Next Step Candidates (by priority) ---"
        echo "$next_steps" | while IFS=: read -r priority task; do
            case "$priority" in
                HIGH)   echo "[High]   $task" ;;
                MEDIUM) echo "[Medium] $task" ;;
                LOW)    echo "[Low]    $task" ;;
            esac
        done
        echo ""
    fi

    # 미해결 사항
    local blockers
    blockers=$(extract_blockers "$handoff_file")
    if [ -n "$blockers" ]; then
        echo "--- Unresolved Issues ---"
        echo "$blockers" | while read -r line; do
            echo "? $line"
        done
        echo ""
    fi

    echo "========================================================================"
    echo "Please let me know what you'd like to work on today."
    echo ""
}

# === 메인 실행 ===

# 로드 조건 확인
if ! should_load; then
    exit 0
fi

# 최신 핸드오프 파일 찾기
HANDOFF_FILE=$(find_latest_handoff)

if [ -z "$HANDOFF_FILE" ] || [ ! -f "$HANDOFF_FILE" ]; then
    # 핸드오프 파일 없으면 조용히 종료
    exit 0
fi

# 요약 출력
output_summary "$HANDOFF_FILE"

# 상태 업데이트
update_state "$HANDOFF_FILE"

exit 0
