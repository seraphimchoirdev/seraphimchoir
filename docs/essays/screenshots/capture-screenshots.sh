#!/bin/bash
# HTML 파일들을 Safari로 열고 스크린샷 캡처

SCREENSHOT_DIR="/Users/munseunghyeon/workspace/seraphimChoir/docs/essays/screenshots"

# HTML 파일 목록
files=(
  "1-work-status.html:pomo-work-status.png"
  "2-break-waiting.html:pomo-break-waiting.png"
  "3-break-start.html:pomo-break-start.png"
  "4-goal-achieved.html:pomo-goal-achieved.png"
  "5-defer-limit.html:pomo-defer-limit.png"
  "6-session-end.html:pomo-session-end.png"
)

echo "🍅 뽀모도로 터미널 스크린샷 캡처"
echo "=================================="
echo ""

for file_pair in "${files[@]}"; do
  html_file="${file_pair%%:*}"
  png_file="${file_pair##*:}"

  html_path="$SCREENSHOT_DIR/$html_file"
  png_path="$SCREENSHOT_DIR/$png_file"

  echo "📸 캡처 중: $html_file → $png_file"

  # Safari에서 HTML 파일 열기
  osascript << EOF
tell application "Safari"
    activate
    open location "file://$html_path"
    delay 1.5
end tell

tell application "System Events"
    tell process "Safari"
        set frontmost to true
    end tell
end tell
EOF

  sleep 2

  # 스크린샷 캡처 (윈도우만)
  screencapture -o -l $(osascript -e 'tell app "Safari" to id of window 1') "$png_path" 2>/dev/null

  if [ -f "$png_path" ]; then
    echo "   ✅ 저장됨: $png_file"
  else
    echo "   ⚠️ 창 캡처 실패, 전체 화면 캡처 시도..."
    screencapture -w "$png_path"
    if [ -f "$png_path" ]; then
      echo "   ✅ 저장됨: $png_file"
    else
      echo "   ❌ 실패: $png_file"
    fi
  fi
done

# Safari 닫기
osascript -e 'tell application "Safari" to close every window'

echo ""
echo "=================================="
echo "🎉 스크린샷 캡처 완료!"
echo ""
echo "저장 위치: $SCREENSHOT_DIR"
ls -la "$SCREENSHOT_DIR"/*.png 2>/dev/null || echo "PNG 파일 없음"
