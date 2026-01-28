#!/bin/bash
# 뽀모도로 타이머 SessionStart 훅
# Claude Code 세션 시작 시 실행됨
#
# 개선사항:
# - 기존 타이머가 실행 중이면 재시작하지 않음 (상태 유지)
# - disown으로 터미널과 완전히 분리
# - setsid로 새 세션 리더로 실행 (macOS에서는 대안 사용)

POMODORO_DIR="$HOME/.claude/pomodoro"
PID_FILE="$POMODORO_DIR/pomodoro.pid"
TIMER_SCRIPT="$HOME/.claude/hooks/pomodoro-timer.sh"
STATE_FILE="$POMODORO_DIR/state.json"
LOG_FILE="$POMODORO_DIR/pomodoro.log"
CONFIG_FILE="$POMODORO_DIR/config.json"
BREAK_ACTIONS_FLAG="$POMODORO_DIR/break_actions.flag"

# 디렉토리 확인
mkdir -p "$POMODORO_DIR"

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 기존 타이머 프로세스 확인 (실행 중이면 유지)
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        # 기존 타이머가 살아있으면 재시작하지 않음
        log "기존 타이머 프로세스 유지: PID $OLD_PID"

        # 현재 상태 표시
        if [ -f "$STATE_FILE" ]; then
            PHASE=$(jq -r '.phase // "unknown"' "$STATE_FILE")
            CURRENT_POMODORO=$(jq -r '.current_pomodoro // 1' "$STATE_FILE")
            TOTAL_TODAY=$(jq -r '.total_pomodoros_today // 0' "$STATE_FILE")

            case "$PHASE" in
                work)
                    echo "🍅 뽀모도로 타이머 계속 실행 중 (뽀모도로 #$CURRENT_POMODORO, 작업 중)"
                    ;;
                waiting_for_break)
                    echo "🍅 뽀모도로 타이머 실행 중 (휴식 대기 - 명령어 실행 필요)"
                    echo "   1. /cm:auto-save → 2. /compact → 3. /clear → 4. pomo-break"
                    echo "   💡 작업 마무리 필요 시: pomo-defer [분]"
                    ;;
                deferred)
                    CONSECUTIVE=$(jq -r '.consecutive_defers // 0' "$STATE_FILE")
                    echo "🍅 뽀모도로 타이머 실행 중 (휴식 유예 중 - ${CONSECUTIVE}/2회)"
                    echo "   작업 완료 후: pomo-break"
                    ;;
                break)
                    echo "🍅 뽀모도로 타이머 실행 중 (휴식 중)"
                    ;;
                paused)
                    echo "🍅 뽀모도로 타이머 일시 중지됨 (pomo-resume으로 재개)"
                    ;;
            esac
        fi
        exit 0
    else
        # PID 파일은 있지만 프로세스가 죽은 경우
        log "이전 타이머 프로세스 종료됨 (PID: $OLD_PID), 재시작"
        rm -f "$PID_FILE"
    fi
fi

# 설정 파일 존재 확인
if [ ! -f "$CONFIG_FILE" ]; then
    echo "⚠️ 뽀모도로 설정 파일이 없습니다: $CONFIG_FILE"
    log "설정 파일 없음, 타이머 시작 건너뜀"
    exit 0
fi

# 설정 로드
WORK_MINUTES=$(jq -r '.work_minutes // 25' "$CONFIG_FILE")

# 기존 상태 확인 (같은 날이면 이어서, 다른 날이면 초기화)
if [ -f "$STATE_FILE" ]; then
    EXISTING_DATE=$(jq -r '.session_start // ""' "$STATE_FILE" | cut -d'T' -f1)
    TODAY=$(date '+%Y-%m-%d')

    if [ "$EXISTING_DATE" = "$TODAY" ]; then
        # 같은 날: 기존 상태 유지하되 phase_end만 업데이트
        CURRENT_POMODORO=$(jq -r '.current_pomodoro // 1' "$STATE_FILE")
        TOTAL_TODAY=$(jq -r '.total_pomodoros_today // 0' "$STATE_FILE")
        PHASE=$(jq -r '.phase // "work"' "$STATE_FILE")
        SESSION_START=$(jq -r '.session_start' "$STATE_FILE")

        log "오늘 기존 상태 복원: 뽀모도로 #$CURRENT_POMODORO, 완료 $TOTAL_TODAY, 단계 $PHASE"

        # work 상태면 타이머 재설정
        if [ "$PHASE" = "work" ]; then
            PHASE_END=$(date -v+${WORK_MINUTES}M -Iseconds 2>/dev/null || date -d "+${WORK_MINUTES} minutes" -Iseconds)
            cat > "$STATE_FILE" << EOF
{
  "session_start": "$SESSION_START",
  "current_pomodoro": $CURRENT_POMODORO,
  "total_pomodoros_today": $TOTAL_TODAY,
  "phase": "work",
  "phase_start": "$(date -Iseconds)",
  "phase_end": "$PHASE_END"
}
EOF
        fi
    else
        # 다른 날: 새로 시작
        log "새 날짜, 상태 초기화"
        cat > "$STATE_FILE" << EOF
{
  "session_start": "$(date -Iseconds)",
  "current_pomodoro": 1,
  "total_pomodoros_today": 0,
  "phase": "work",
  "phase_start": "$(date -Iseconds)",
  "phase_end": "$(date -v+${WORK_MINUTES}M -Iseconds 2>/dev/null || date -d "+${WORK_MINUTES} minutes" -Iseconds)"
}
EOF
    fi
else
    # 상태 파일 없음: 새로 시작
    cat > "$STATE_FILE" << EOF
{
  "session_start": "$(date -Iseconds)",
  "current_pomodoro": 1,
  "total_pomodoros_today": 0,
  "phase": "work",
  "phase_start": "$(date -Iseconds)",
  "phase_end": "$(date -v+${WORK_MINUTES}M -Iseconds 2>/dev/null || date -d "+${WORK_MINUTES} minutes" -Iseconds)"
}
EOF
fi

# 이전 휴식 시 생성된 플래그 파일 확인
if [ -f "$BREAK_ACTIONS_FLAG" ]; then
    POMODORO_NUM=$(jq -r '.pomodoro_num // 0' "$BREAK_ACTIONS_FLAG" 2>/dev/null)
    echo "⚠️ 이전 뽀모도로 #${POMODORO_NUM} 휴식 시 저장된 작업이 있습니다."
    echo "   다음 명령어를 순차적으로 실행해주세요:"
    echo "   1. /cm:auto-save"
    echo "   2. /compact"
    echo "   3. /clear"
    rm -f "$BREAK_ACTIONS_FLAG"
    log "휴식 액션 플래그 파일 안내 후 삭제"
fi

# === 핸드오프 자동 로드 ===
HANDOFF_LOAD="$HOME/.claude/hooks/handoff-load.sh"
if [ -x "$HANDOFF_LOAD" ]; then
    PROJECT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
    "$HANDOFF_LOAD" --auto --project "$PROJECT" 2>/dev/null || true
fi

# 백그라운드 타이머 시작 (터미널과 완전히 분리)
if [ -x "$TIMER_SCRIPT" ]; then
    # nohup + disown으로 터미널 종료에도 생존
    # stdin, stdout, stderr를 모두 /dev/null로 리다이렉트
    nohup "$TIMER_SCRIPT" </dev/null >/dev/null 2>&1 &
    NEW_PID=$!
    disown $NEW_PID 2>/dev/null || true

    log "뽀모도로 타이머 시작: PID $NEW_PID"

    # 현재 상태 표시
    CURRENT_POMODORO=$(jq -r '.current_pomodoro // 1' "$STATE_FILE")
    TOTAL_TODAY=$(jq -r '.total_pomodoros_today // 0' "$STATE_FILE")

    if [ "$TOTAL_TODAY" -gt 0 ]; then
        echo "🍅 뽀모도로 타이머 재시작! (뽀모도로 #$CURRENT_POMODORO, 오늘 완료: $TOTAL_TODAY)"
    else
        echo "🍅 뽀모도로 타이머 시작! (작업 ${WORK_MINUTES}분 → 휴식)"
    fi
else
    log "타이머 스크립트를 찾을 수 없거나 실행 권한 없음: $TIMER_SCRIPT"
    echo "❌ 뽀모도로 타이머 스크립트를 찾을 수 없습니다"
    exit 1
fi
