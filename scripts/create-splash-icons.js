const fs = require('fs');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

async function createSplashIcon() {
    const publicDir = path.join(__dirname, '..', 'public');
    const logoPath = path.join(publicDir, 'logo_seraphim_on.png');

    try {
        // 로고 이미지 로드
        const logo = await loadImage(logoPath);

        // 정사각형 캔버스 생성 (512x512)
        const size = 512;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        // 흰색 배경
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // 로고를 중앙에 배치 (비율 유지)
        const logoAspect = logo.width / logo.height;
        const maxWidth = size * 0.8; // 80% 크기
        const maxHeight = size * 0.8;

        let drawWidth = maxWidth;
        let drawHeight = maxWidth / logoAspect;

        if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = maxHeight * logoAspect;
        }

        const x = (size - drawWidth) / 2;
        const y = (size - drawHeight) / 2;

        ctx.drawImage(logo, x, y, drawWidth, drawHeight);

        // 192x192 버전 생성
        const canvas192 = createCanvas(192, 192);
        const ctx192 = canvas192.getContext('2d');
        ctx192.drawImage(canvas, 0, 0, size, size, 0, 0, 192, 192);

        // 파일 저장
        fs.writeFileSync(path.join(publicDir, 'splash-icon-512x512.png'), canvas.toBuffer('image/png'));
        fs.writeFileSync(path.join(publicDir, 'splash-icon-192x192.png'), canvas192.toBuffer('image/png'));

        console.log('Splash icons created successfully!');
        console.log('- splash-icon-192x192.png');
        console.log('- splash-icon-512x512.png');

    } catch (error) {
        console.error('Error creating splash icons:', error);
    }
}

createSplashIcon();