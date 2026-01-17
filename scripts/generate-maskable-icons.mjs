/**
 * Maskable 아이콘 생성 스크립트
 *
 * Android Adaptive Icon을 위한 maskable 아이콘을 생성합니다.
 * - 흰색 배경 추가
 * - 로고를 중앙 80% 영역(안전 영역)에 배치
 *
 * 사용법: node scripts/generate-maskable-icons.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

/**
 * Maskable 아이콘 생성
 * @param {number} size - 출력 아이콘 크기 (정사각형)
 */
async function generateMaskableIcon(size) {
  const sourceIcon = path.join(publicDir, 'icon-512x512.png');
  const outputIcon = path.join(publicDir, `icon-maskable-${size}x${size}.png`);

  // 안전 영역은 전체의 80% (가장자리 10%씩 패딩)
  // 실제로는 약 65-70%로 더 여유를 두어 다양한 마스크에서 안전하게 표시
  const safeZoneRatio = 0.70;
  const logoSize = Math.round(size * safeZoneRatio);
  const padding = Math.round((size - logoSize) / 2);

  try {
    // 1. 흰색 배경 캔버스 생성
    const background = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();

    // 2. 원본 로고를 안전 영역 크기로 리사이즈
    const resizedLogo = await sharp(sourceIcon)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toBuffer();

    // 3. 흰색 배경 위에 로고를 중앙에 합성
    await sharp(background)
      .composite([{
        input: resizedLogo,
        top: padding,
        left: padding
      }])
      .png()
      .toFile(outputIcon);

    console.log(`✅ Generated: ${path.basename(outputIcon)} (${size}x${size})`);
    console.log(`   - Logo size: ${logoSize}x${logoSize} (${Math.round(safeZoneRatio * 100)}% of total)`);
    console.log(`   - Padding: ${padding}px each side`);
  } catch (error) {
    console.error(`❌ Error generating ${size}x${size} icon:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🎨 Generating Maskable Icons for PWA\n');
  console.log('Source: icon-512x512.png');
  console.log('Background: White (#FFFFFF)');
  console.log('Safe zone: 70% (extra margin for various mask shapes)\n');

  // 192x192와 512x512 두 가지 크기 생성
  await generateMaskableIcon(192);
  await generateMaskableIcon(512);

  console.log('\n✨ Done! Maskable icons have been generated.');
  console.log('\n📋 Next steps:');
  console.log('   1. Update manifest.json to use the new maskable icons');
  console.log('   2. Test with https://maskable.app/editor');
  console.log('   3. Rebuild and deploy the app');
}

main().catch(console.error);
