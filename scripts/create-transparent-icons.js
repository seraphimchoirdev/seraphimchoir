const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');
const path = require('path');

// 투명한 PNG 아이콘 생성 함수
function createTransparentIcon(width, height, outputPath) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 완전히 투명한 캔버스 (아무것도 그리지 않음)
    // 또는 아주 작은 투명한 점 하나만 추가 (일부 시스템에서 완전 투명을 거부할 수 있음)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.01)'; // 거의 투명한 흰색
    ctx.fillRect(width/2 - 1, height/2 - 1, 2, 2); // 중앙에 2x2 픽셀

    // PNG로 저장
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Created transparent icon: ${outputPath}`);
}

// public 폴더 경로
const publicDir = path.join(__dirname, '..', 'public');

// 아이콘 생성
const icons = [
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'icon-maskable-192x192.png', size: 192 },
    { name: 'icon-maskable-512x512.png', size: 512 }
];

icons.forEach(icon => {
    const outputPath = path.join(publicDir, icon.name);
    createTransparentIcon(icon.size, icon.size, outputPath);
});

console.log('All transparent icons created successfully!');