# AI 코딩의 도파민 중독에서 벗어나기
## Claude Code 뽀모도로 훅 개발기

> "한 번만 더"가 새벽 4시까지 이어질 때, 문제라는 걸 알았다.

---

## 끝나지 않는 던전

온라인 게임을 해본 사람이라면 안다. 끊임없이 쏟아지는 몬스터, 연속으로 주어지는 퀘스트, 레벨업 알림. "딱 한 판만"이 어느새 몇 시간이 되는 그 감각.

Claude Code와 함께 일하기 시작하면서 비슷한 현상을 경험했다. 질문을 던지면 몇 초 안에 코드가 생성되고, 실행하면 바로 결과가 나온다. "이거 되는지 해볼까?"가 "이것도 해볼까?"로, 다시 "저것도 해볼까?"로 이어진다. 막힘 없는 진행은 쾌감이었다.

문제는 시간 감각의 상실이었다. 커피 한 잔 마시고 간단히 수정하려던 코드가 어느새 대규모 리팩토링이 되어 있고, 해가 지고 있었다. "충분히 했으니 쉬어야지"라는 생각이 "한 번만 더"에 밀려났다. 몸은 지쳐가는데 손은 멈추지 않았다.

이대로는 안 되겠다는 생각이 들었다.

---

## 왜 AI 코딩은 도파민 폭탄인가?

도파민 시스템의 관점에서 AI 코딩은 완벽한 중독 조건을 갖추고 있다.

**첫째, 즉각적 피드백 루프.** 전통적 코딩에서 "검색 → 이해 → 시도 → 에러 → 수정"의 사이클이 AI 코딩에서는 "질문 → 코드 → 실행"으로 압축된다. 보상까지의 시간이 극단적으로 짧아진다.

**둘째, 가변 보상.** 슬롯머신이 중독적인 이유는 예측 불가능한 보상 때문이다. AI도 마찬가지다. 예상치 못한 해결책, "이렇게도 되네?" 하는 순간들이 도파민을 터뜨린다.

**셋째, 무한한 진행 감각.** 파일 수정, 기능 추가, 버그 해결이 끊임없이 이어진다. 진행 막대가 계속 차오르는 느낌. 게임에서 퀘스트 완료 알림이 계속 뜨는 것과 같다.

**넷째, 막히는 순간의 부재.** 역설적이지만 이게 문제다. 전통적 코딩에서 막히는 순간은 강제 휴식이었다. "모르겠으니 내일 다시 보자"가 자연스러웠다. AI 코딩에서는 그 브레이크가 사라진다.

---

## 왜 커스텀 훅인가?

뽀모도로 기법은 알고 있었다. 25분 집중, 5분 휴식. 단순하지만 효과적인 시간 관리법. 문제는 기존 뽀모도로 앱들이 Claude Code 세션과 분리되어 있다는 점이었다.

별도의 타이머 앱을 띄워놔도 무시하기 쉬웠다. "5분만 더"가 반복되고, 타이머는 그냥 배경 소음이 되어버렸다. 내가 타이머를 통제하고 있는 한, 시스템은 무력했다.

그때 Claude Code의 훅(Hook) 시스템을 발견했다. 세션 시작, 종료, 도구 호출 시점에 셸 스크립트를 실행할 수 있었다. 아이디어가 떠올랐다.

**AI가 나를 멈춰야 한다.**

---

## 시스템 설계: 상태 머신

핵심은 상태(state) 기반 설계였다. 단순한 타이머가 아니라, 내 행동을 추적하고 통제하는 시스템이 필요했다.

```
┌─────────┐    25분     ┌──────────────────┐
│  work   │ ─────────→ │ waiting_for_break │
└─────────┘            └────────┬─────────┘
     ↑                          │
     │                    ┌─────┴─────┐
     │                    ↓           ↓
     │            ┌─────────┐   ┌──────────┐
     │            │  break  │   │ deferred │
     │            └────┬────┘   └────┬─────┘
     │                 │              │
     │                 ↓              │
     │        ┌─────────────────┐     │
     │        │ waiting_for_work│←────┘
     │        └────────┬────────┘
     │                 │
     └─────────────────┘
```

`work` → 25분 작업 → `waiting_for_break` → 사용자가 휴식 시작 → `break` → 휴식 종료 → `waiting_for_work` → 사용자가 작업 재개 → `work`

중간에 `deferred` 상태도 있다. 급한 작업이 있을 때 휴식을 미룰 수 있지만, 제한이 있다.

```bash
# pomodoro-timer.sh - 메인 루프의 핵심
while true; do
    # 작업 단계
    save_state "work" "$WORK_END" "$CURRENT_POMODORO" "$TOTAL_TODAY"
    log "작업 시작: ${WORK_MINUTES}분 (뽀모도로 #$CURRENT_POMODORO)"

    sleep $((WORK_MINUTES * 60))

    # 작업 완료 → 휴식 대기 상태로 전환
    TOTAL_TODAY=$((TOTAL_TODAY + 1))
    save_state "waiting_for_break" "" "$CURRENT_POMODORO" "$TOTAL_TODAY"

    # 알림: 휴식 준비 안내
    notify "all" "🍅 뽀모도로 #${CURRENT_POMODORO} 완료!"

    # 사용자가 휴식을 시작할 때까지 대기
    while true; do
        sleep 30
        CURRENT_PHASE=$(jq -r '.phase // ""' "$STATE_FILE")
        if [ "$CURRENT_PHASE" = "break" ]; then
            break
        fi
    done
done
```

상태 파일(`state.json`)을 통해 타이머와 명령어 스크립트들이 통신한다. 타이머는 백그라운드에서 돌면서 상태를 감시하고, 사용자 명령(`pomo-break`, `pomo-work`)이 상태를 변경한다.

---

## 물리적 강제: 화면 잠금

단순 알림은 무시하기 쉽다. 진짜 효과적인 것은 **물리적 강제**였다.

```bash
# pomodoro-break-ready.sh - 휴식 강제 기능
lock_screen() {
    # macOS 화면 잠금
    osascript -e 'tell application "System Events" to keystroke "q" \
        using {command down, control down}' 2>/dev/null || \
    pmset displaysleepnow 2>/dev/null || true
}

enable_dnd() {
    # macOS Shortcuts 앱 연동: 방해금지 모드
    shortcuts run "Turn On Do Not Disturb" 2>/dev/null || true
}

# 설정에서 강제 기능 활성화 시
if [ "$BREAK_ENFORCEMENT_ENABLED" = "true" ]; then
    echo "🔒 ${DELAY_SECONDS}초 후 화면이 잠깁니다..."
    sleep "$DELAY_SECONDS"
    enable_dnd
    lock_screen
fi
```

휴식을 시작하면 3초 카운트다운 후 화면이 잠긴다. 방해금지 모드도 켜진다. 이 강제력이 핵심이었다. "한 번만 더"의 유혹을 원천 차단한다.

휴식이 끝나면 방해금지 모드가 자동 해제되고, Discord로 복귀 알림이 온다.

---

## 제한된 유연성: 유예 시스템

완전한 통제는 역효과를 낳는다. 정말 급한 상황은 있기 마련이다. 테스트가 거의 끝나갈 때, 버그 원인을 찾았을 때.

그래서 유예(defer) 기능을 만들되, **제한을 두었다.**

```bash
# pomodoro-defer.sh - 최대 2회 연속 유예만 허용
MAX_CONSECUTIVE_DEFERS=2

if [ "$CONSECUTIVE_DEFERS" -ge "$MAX_CONSECUTIVE_DEFERS" ]; then
    echo "⚠️ 연속 유예 한도 도달! (최대 ${MAX_CONSECUTIVE_DEFERS}회)"
    echo ""
    echo "   휴식을 미루는 것은 생산성에 역효과를 줍니다."
    echo "   지금 휴식을 취하고 돌아와서 작업을 마무리하세요."
    exit 1
fi
```

연속 2회 이상 유예하면 시스템이 거부한다. "딱 한 번만"의 출구는 제공하되, 무한 반복은 차단한다. 유예 기록은 로그에 남아서 세션 종료 시 패턴을 리뷰할 수 있다.

---

## 의식적 전환: 복귀 대기

휴식 후 자동으로 작업이 시작되지 않는다. `waiting_for_work` 상태에서 사용자가 명시적으로 `pomo-work`를 입력해야 한다.

```bash
# pomodoro-work.sh에서 실제 휴식 시간 추적
ACTUAL_BREAK_MINUTES=$(($(date "+%s") - BREAK_START_EPOCH) / 60)

if [ $DIFF_MINUTES -gt 0 ]; then
    echo "☕ 실제 휴식: ${ACTUAL_BREAK_MINUTES}분 (계획 ${PLANNED_BREAK_MINUTES}분 +${DIFF_MINUTES}분)"
fi
```

이 설계에는 이유가 있다. 휴식 후 바로 작업이 시작되면 "쉬면서도 불안"해진다. 명시적 복귀 의사 표시가 의식적 전환을 만든다. "자, 이제 다시 시작이다"라는 마음가짐.

실제 휴식 시간도 추적된다. 5분 계획이었는데 10분 쉬었다면 그 사실을 알려준다. 판단은 내가 하지만, 데이터는 있어야 한다.

---

## 휴식 가이드: 무엇을 하고, 무엇을 피할까

```json
{
  "break_tips": [
    "물 한 잔 마시기",
    "스트레칭하기",
    "눈 감고 휴식하기",
    "창밖 바라보기",
    "심호흡하기"
  ],
  "break_avoid": [
    "스마트폰 사용",
    "SNS 확인",
    "이메일 확인"
  ]
}
```

휴식 시작 시 랜덤 팁이 표시된다. 중복 방지 로직도 있어서 같은 팁이 연속으로 나오지 않는다.

핵심은 `break_avoid`다. 스마트폰은 또 다른 도파민 공급원이다. 5분 휴식이 15분 SNS 스크롤링이 되면 의미가 없다. 이 리스트는 나 자신에게 하는 약속이다.

---

## 일일 목표와 과로 방지

```json
{
  "daily_goal": {
    "min_pomodoros": 4,
    "max_pomodoros": 6,
    "description": "하루 4~6 뽀모도로 (2~3시간 집중)가 이상적"
  }
}
```

세션 종료 시 일일 목표 달성 여부를 확인한다.

```bash
# pomodoro-stop.sh - 세션 종료 시 리뷰
if [ "$TOTAL_TODAY" -ge "$MIN_GOAL" ] && [ "$TOTAL_TODAY" -le "$MAX_GOAL" ]; then
    GOAL_MSG="🏆 오늘 목표 달성! (${MIN_GOAL}~${MAX_GOAL}개 중 ${TOTAL_TODAY}개)"
elif [ "$TOTAL_TODAY" -gt "$MAX_GOAL" ]; then
    GOAL_MSG="⚠️ 목표 초과 (${TOTAL_TODAY}/${MAX_GOAL}개) - 충분한 휴식을 취하세요"
else
    REMAINING=$((MIN_GOAL - TOTAL_TODAY))
    GOAL_MSG="📌 목표까지 ${REMAINING}개 남음 (${TOTAL_TODAY}/${MIN_GOAL}개)"
fi
```

**6개를 초과하면 경고가 뜬다.** "더 많이"가 아니라 "적정량"이 중요하다. 번아웃 방지 장치다.

---

## Discord 연동: 외부 기록

```bash
# pomodoro-notify.sh - Discord 웹훅
send_discord_notification() {
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"$MESSAGE\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null
    fi
}
```

모든 알림이 Discord 채널로도 간다. 휴식 시작, 종료, 세션 종료 요약까지.

외부 기록은 자기 객관화 도구다. 혼자 컴퓨터 앞에 앉아있으면 시간 감각이 무뎌진다. 외부에 기록이 남으면 "오늘 얼마나 일했나"의 증거가 된다.

세션 종료 시 Discord로 가는 메시지는 이런 식이다:

```
🍅 오늘의 뽀모도로 종료!
📊 완료: 5개 | ⏱️ 세션: 3시간 12분 | 🏆 목표 달성!
☕ 휴식: 28분/25분 (5회) | 📋 휴식 유예: 1회 (10분)
```

---

## 변화

도입 후 가장 큰 변화는 **시간 감각의 회복**이었다. 25분 단위로 작업이 끊어지니, "벌써 이렇게 됐네?"가 줄었다. 강제된 5분 휴식이 뇌를 환기시켰다.

예상치 못한 효과도 있었다. 휴식 전 자동 커밋으로 작업 단위가 명확해졌다. "이 커밋에서 뭘 했더라?"가 "뽀모도로 #3 작업"으로 정리됐다.

유예 패턴 리뷰도 흥미로웠다. 특정 작업(테스트 대기, 빌드 대기)에서 유예가 집중되는 걸 발견했다. 그 작업들의 구조를 바꾸는 계기가 됐다.

---

## 기술로 기술을 제어하기

아이러니하다. AI 코딩 도구가 만든 문제를, AI 코딩 도구의 훅 시스템으로 해결했다. Claude와 함께 이 뽀모도로 훅을 개발했다. 몇 시간 만에.

도구는 중립적이다. 문제는 사용 방식이고, 해결책도 사용 방식에 있다. Claude Code의 훅 시스템은 워크플로우 커스터마이징의 가능성을 열어준다. 이 글의 뽀모도로 시스템은 한 예시일 뿐이다.

AI 코딩 도구는 우리를 더 빠르게 달리게 한다. 하지만 빠르게 달리기만 하면 지친다. **적절히 멈추는 것**도 시스템의 일부가 되어야 한다.

도파민 절임에서 벗어나는 첫 걸음은, 내가 시스템을 통제하는 게 아니라 **시스템이 나를 통제하게 하는 것**이었다.

---

## 부록: 명령어 치트시트

| 명령어 | 설명 |
|--------|------|
| `pomo-start` | 뽀모도로 세션 시작 |
| `pomo-status` | 현재 상태 확인 |
| `pomo-break` | 휴식 시작 (화면 잠금) |
| `pomo-defer [분]` | 휴식 유예 (최대 2회) |
| `pomo-work` | 휴식 후 작업 복귀 |
| `pomo-stop` | 세션 종료 및 요약 |
| `/pomo-reset` | 휴식 준비 (컨텍스트 저장 + 압축) |

---

## 부록: 설정 파일 예시

```json
{
  "work_minutes": 25,
  "short_break_minutes": 5,
  "long_break_minutes": 20,
  "pomodoros_until_long_break": 4,
  "daily_goal": {
    "min_pomodoros": 4,
    "max_pomodoros": 6
  },
  "break_enforcement": {
    "enabled": true,
    "lock_screen": true,
    "do_not_disturb": true,
    "delay_seconds": 3
  },
  "notifications": {
    "macos": true,
    "discord_webhook_url": "https://discord.com/api/webhooks/..."
  },
  "break_tips": [
    "물 한 잔 마시기",
    "스트레칭하기",
    "눈 감고 휴식하기"
  ],
  "break_avoid": [
    "스마트폰 사용",
    "SNS 확인"
  ]
}
```

---

*이 글의 뽀모도로 훅 시스템은 Claude Code와 함께 개발되었습니다.*

---

<!-- Velog 메타데이터 -->
<!--
title: AI 코딩의 도파민 중독에서 벗어나기 - Claude Code 뽀모도로 훅 개발기
description: Claude Code와 페어 프로그래밍하며 경험한 도파민 과다 자극 문제와, 이를 해결하기 위해 커스텀 뽀모도로 타이머 훅을 개발한 경험기
tags: claude-code, pomodoro, productivity, developer-experience, shell-script, work-life-balance
series: Claude Code 활용기
-->
