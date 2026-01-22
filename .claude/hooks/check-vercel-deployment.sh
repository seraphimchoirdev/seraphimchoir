#!/bin/bash
# Vercel Production 배포 상태 확인 훅
# main 브랜치에서 git push 후 실행됨

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)

# main 브랜치가 아니면 종료
if [ "$CURRENT_BRANCH" != "main" ]; then
  exit 0
fi

echo ""
echo "🚀 Vercel Production 배포 상태 확인 중..."
echo ""

# 잠시 대기 (Vercel이 빌드를 시작할 시간)
sleep 3

# Vercel 배포 목록 가져오기 (Production 라인만 추출)
DEPLOYMENT_INFO=$(vercel ls 2>&1 | grep "Production" | head -1)

if [ -z "$DEPLOYMENT_INFO" ]; then
  echo "⏳ 배포 정보를 가져오는 중... (잠시 후 다시 확인하세요)"
  echo "상태 확인: vercel ls"
elif echo "$DEPLOYMENT_INFO" | grep -q "Ready"; then
  # Age와 URL 추출
  AGE=$(echo "$DEPLOYMENT_INFO" | awk '{print $1}')
  URL=$(echo "$DEPLOYMENT_INFO" | awk '{print $2}')
  echo "✅ Production 배포 완료!"
  echo "   배포 시간: $AGE 전"
  echo "   URL: $URL"
elif echo "$DEPLOYMENT_INFO" | grep -q "Building"; then
  echo "🔄 Production 빌드 진행 중..."
  echo "$DEPLOYMENT_INFO"
  echo ""
  echo "빌드 완료까지 1-2분 소요됩니다."
  echo "상태 확인: vercel ls"
elif echo "$DEPLOYMENT_INFO" | grep -q "Error"; then
  echo "❌ Production 배포 실패!"
  echo "$DEPLOYMENT_INFO"
  echo ""
  echo "로그 확인: vercel logs <deployment-url>"
else
  echo "⏳ 배포 대기 중..."
  echo "$DEPLOYMENT_INFO"
fi

echo ""
