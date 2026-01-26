const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 700, height: 600 });

  // HTML 파일 로드
  const htmlPath = path.join(__dirname, 'terminal-screenshots.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // 각 터미널 스크린샷 촬영
  const screenshots = [
    { id: 'screenshot-1', filename: 'pomo-work-status.png', desc: '작업 중 상태' },
    { id: 'screenshot-2', filename: 'pomo-break-waiting.png', desc: '휴식 대기 상태' },
    { id: 'screenshot-3', filename: 'pomo-break-start.png', desc: '휴식 시작' },
    { id: 'screenshot-4', filename: 'pomo-goal-achieved.png', desc: '목표 달성' },
    { id: 'screenshot-5', filename: 'pomo-defer-limit.png', desc: '유예 한도 도달' },
    { id: 'screenshot-6', filename: 'pomo-session-end.png', desc: '세션 종료 요약' }
  ];

  for (const shot of screenshots) {
    const element = await page.$(`#${shot.id}`);
    if (element) {
      await element.screenshot({
        path: path.join(__dirname, shot.filename),
        omitBackground: false
      });
      console.log(`✅ ${shot.desc}: ${shot.filename}`);
    } else {
      console.log(`❌ 요소를 찾을 수 없음: ${shot.id}`);
    }
  }

  await browser.close();
  console.log('\n🎉 모든 스크린샷 촬영 완료!');
}

takeScreenshots().catch(console.error);
